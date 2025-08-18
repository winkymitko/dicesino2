import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to get current payout period for affiliate
async function getCurrentPayoutPeriod(affiliateId, commissionRate) {
  const user = await prisma.user.findUnique({
    where: { id: affiliateId },
    select: { affiliateCommission: true }
  });
  
  if (!user) return null;
  
  // Determine period length based on payout frequency (default monthly)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // For monthly periods: start of current month to end of current month
  const periodStart = new Date(currentYear, currentMonth, 1);
  const periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  
  // Check if current period exists
  let currentPeriod = await prisma.affiliatePayoutPeriod.findFirst({
    where: {
      affiliateId,
      periodStart: { lte: now },
      periodEnd: { gte: now },
      status: 'ongoing'
    }
  });
  
  // Create new period if doesn't exist
  if (!currentPeriod) {
    currentPeriod = await prisma.affiliatePayoutPeriod.create({
      data: {
        affiliateId,
        periodStart,
        periodEnd,
        status: 'ongoing'
      }
    });
  }
  
  return currentPeriod;
}

// Helper function to update affiliate payout period with new profit
async function updateAffiliatePayoutPeriod(affiliateId, casinoProfit, commissionRate) {
  const currentPeriod = await getCurrentPayoutPeriod(affiliateId, commissionRate);
  
  if (!currentPeriod) return;
  
  const newTotalProfit = currentPeriod.totalProfit + casinoProfit;
  const newCommission = Math.max(0, newTotalProfit * (commissionRate / 100));
  
  await prisma.affiliatePayoutPeriod.update({
    where: { id: currentPeriod.id },
    data: {
      totalProfit: newTotalProfit,
      commission: newCommission
    }
  });
}

// Helper function to finalize expired periods
async function finalizeExpiredPeriods() {
  const now = new Date();
  
  const expiredPeriods = await prisma.affiliatePayoutPeriod.findMany({
    where: {
      periodEnd: { lt: now },
      status: 'ongoing'
    }
  });
  
  for (const period of expiredPeriods) {
    await prisma.affiliatePayoutPeriod.update({
      where: { id: period.id },
      data: { status: 'pending' }
    });
  }
}

// Generate referral link
router.get('/link', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAffiliate) {
      return res.status(403).json({ error: 'Not an affiliate' });
    }

    let affiliateCode = req.user.affiliateCode;
    
    if (!affiliateCode) {
      // Generate unique affiliate code
      affiliateCode = crypto.randomBytes(8).toString('hex');
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: { affiliateCode }
      });
    }

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${affiliateCode}`;
    
    res.json({ link, code: affiliateCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get affiliate stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAffiliate) {
      return res.status(403).json({ error: 'Not an affiliate' });
    }
    
    // Finalize any expired periods first
    await finalizeExpiredPeriods();

    // Get current payout period
    const currentPeriod = await getCurrentPayoutPeriod(req.user.id, req.user.affiliateCommission || 0);
    
    // Get all payout periods for this affiliate
    const payoutPeriods = await prisma.affiliatePayoutPeriod.findMany({
      where: { affiliateId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Get referral details
    const referrals = await prisma.user.findMany({
      where: { referredBy: req.user.affiliateCode },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    // Calculate simple casino profit for each referral: Deposits - Withdrawals
    const referralStats = [];
    for (let referral of referrals) {
      // Get deposits and withdrawals - SIMPLE CALCULATION
      const deposits = await prisma.cryptoDeposit.findMany({
        where: { userId: referral.id, status: 'confirmed' },
        select: { amount: true }
      });
      
      const withdrawals = await prisma.cryptoWithdrawal.findMany({
        where: { userId: referral.id, status: 'completed' },
        select: { amount: true }
      });
      
      const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
      const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      // CASINO PROFIT = DEPOSITS - WITHDRAWALS (SIMPLE!)
      const casinoProfit = totalDeposited - totalWithdrawn;
      
      // Commission only if casino is profitable
      const commissionEarned = casinoProfit > 0 ? casinoProfit * (req.user.affiliateCommission || 0) / 100 : 0;
      
      referralStats.push({
        id: referral.id,
        email: referral.email,
        createdAt: referral.createdAt,
        totalDeposited,
        totalWithdrawn,
        casinoProfit,
        commissionEarned
      });
      
      // Update payout period with this referral's profit
      if (casinoProfit !== 0) {
        await updateAffiliatePayoutPeriod(req.user.id, casinoProfit, req.user.affiliateCommission || 0);
      }
    }

    // Calculate total commission from all periods
    const totalCommissionEarned = payoutPeriods.reduce((sum, period) => sum + Math.max(0, period.commission), 0);
    const pendingCommission = payoutPeriods
      .filter(p => p.status === 'pending')
      .reduce((sum, period) => sum + Math.max(0, period.commission), 0);
    const currentPeriodCommission = currentPeriod ? Math.max(0, currentPeriod.commission) : 0;
    
    const commissionRate = req.user.affiliateCommission || 0;

    res.json({
      totalReferrals: referrals.length,
      totalCommissionEarned,
      pendingCommission,
      currentPeriodCommission,
      payoutPeriod: 'Monthly', // Fixed for now
      payoutPeriods,
      currentPeriod,
      referrals: referralStats,
      commissionRate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request payout
router.post('/request-payout', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAffiliate) {
      return res.status(403).json({ error: 'Not an affiliate' });
    }
    
    const { amount, referralEmail, referralId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount' });
    }
    
    if (!referralEmail || !referralId) {
      return res.status(400).json({ error: 'Referral information required' });
    }
    
    // Create a payout request record (you might want to create a new table for this)
    // For now, we'll just log it and return success
    console.log(`Payout request: ${req.user.email} requests $${amount} commission from referral ${referralEmail}`);
    
    // In a real system, you'd create a PayoutRequest table entry here
    // await prisma.payoutRequest.create({
    //   data: {
    //     affiliateId: req.user.id,
    //     referralId,
    //     amount,
    //     referralEmail,
    //     status: 'pending'
    //   }
    // });
    
    res.json({ 
      success: true, 
      message: `Payout request submitted for $${amount.toFixed(2)} commission from ${referralEmail}` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request payout for specific referral
router.post('/request-referral-payout', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAffiliate) {
      return res.status(403).json({ error: 'Not an affiliate' });
    }
    
    const { referralId, amount, referralEmail } = req.body;
    
    if (!referralId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout request data' });
    }
    
    // Verify the referral belongs to this affiliate
    const referral = await prisma.user.findFirst({
      where: { 
        id: referralId,
        referredBy: req.user.affiliateCode 
      }
    });
    
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or not yours' });
    }
    
    // In a real system, you'd create a PayoutRequest table entry here
    // For now, we'll just log it and return success
    console.log(`Per-referral payout request: ${req.user.email} requests $${amount} commission from referral ${referralEmail || referral.email} (ID: ${referralId})`);
    
    // You could create a PayoutRequest model and save it:
    // await prisma.payoutRequest.create({
    //   data: {
    //     affiliateId: req.user.id,
    //     referralId,
    //     amount,
    //     referralEmail: referralEmail || referral.email,
    //     status: 'pending',
    //     type: 'per_referral'
    //   }
    // });
    
    res.json({ 
      success: true, 
      message: `Payout request submitted for $${amount.toFixed(2)} commission from ${referralEmail || referral.email}` 
    });
  } catch (error) {
    console.error('Per-referral payout request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save payout wallet
router.post('/save-wallet', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAffiliate) {
      return res.status(403).json({ error: 'Not an affiliate' });
    }
    
    const { wallet } = req.body;
    
    if (!wallet || typeof wallet !== 'string' || wallet.trim().length === 0) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    
    const trimmedWallet = wallet.trim();
    
    // Basic TRON address validation
    if (!trimmedWallet.startsWith('T') || trimmedWallet.length !== 34) {
      return res.status(400).json({ error: 'Invalid TRON address format' });
    }
    
    // Update or create affiliate stats with payout wallet
    await prisma.affiliateStats.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        payoutWallet: trimmedWallet
      },
      update: {
        payoutWallet: trimmedWallet
      }
    });
    
    res.json({ success: true, message: 'Payout wallet saved successfully' });
  } catch (error) {
    console.error('Save wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Set payout period for affiliate
router.put('/set-payout-period/:userId', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId } = req.params;
    const { payoutPeriod } = req.body;
    
    if (!['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly'].includes(payoutPeriod)) {
      return res.status(400).json({ error: 'Invalid payout period' });
    }
    
    await prisma.affiliateStats.upsert({
      where: { userId },
      create: {
        userId,
        payoutPeriod
      },
      update: {
        payoutPeriod
      }
    });
    
    res.json({ success: true, message: `Payout period set to ${payoutPeriod}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Mark payout period as finished (paid)
router.put('/admin/mark-period-paid/:periodId', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { periodId } = req.params;
    
    await prisma.affiliatePayoutPeriod.update({
      where: { id: periodId },
      data: { status: 'finished' }
    });
    
    res.json({ success: true, message: 'Payout period marked as paid' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all affiliate payout periods
router.get('/admin/payout-periods', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    await finalizeExpiredPeriods();
    
    const periods = await prisma.affiliatePayoutPeriod.findMany({
      include: {
        affiliate: {
          select: {
            email: true,
            affiliateCommission: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ periods });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;