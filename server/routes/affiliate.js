import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

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

    let affiliateStats = await prisma.affiliateStats.findUnique({
      where: { userId: req.user.id }
    });
    
    // Create affiliate stats if doesn't exist
    if (!affiliateStats) {
      affiliateStats = await prisma.affiliateStats.create({
        data: { userId: req.user.id }
      });
    }

    // Get referral details
    const referrals = await prisma.user.findMany({
      where: { referredBy: req.user.affiliateCode },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    // Calculate real casino profit for each referral
    const referralStats = [];
    for (let referral of referrals) {
      const realMoneyGames = await prisma.game.findMany({
        where: {
          userId: referral.id,
          metadata: {
            not: {
              contains: '"useVirtual":true'
            }
          }
        },
        select: {
          stake: true,
          finalPot: true
        }
      });
      
      const casinoProfit = realMoneyGames.reduce((sum, game) => {
        return sum + ((game.stake || 0) - (game.finalPot || 0));
      }, 0);
      
      referralStats.push({
        email: referral.email,
        createdAt: referral.createdAt,
        totalBets: realMoneyGames.length,
        casinoProfit
      });
    }

    // Calculate total commission earned
    const totalCasinoProfit = referralStats.reduce((sum, ref) => sum + (ref.casinoProfit || 0), 0);
    const commissionRate = req.user.affiliateCommission || 0;
    const totalCommissionEarned = totalCasinoProfit * (commissionRate / 100);
    
    // Calculate current month commission
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyGames = await prisma.game.findMany({
      where: {
        userId: { in: referrals.map(r => r.id) },
        createdAt: { gte: currentMonth },
        metadata: {
          not: {
            contains: '"useVirtual":true'
          }
        }
      },
      select: {
        stake: true,
        finalPot: true
      }
    });
    
    const monthlyProfit = monthlyGames.reduce((sum, game) => {
      return sum + ((game.stake || 0) - (game.finalPot || 0));
    }, 0);
    
    const monthlyCommission = monthlyProfit * (commissionRate / 100);

    res.json({
      totalReferrals: affiliateStats?.totalReferrals || 0,
      totalCommission: affiliateStats?.totalCommission || 0,
      totalCommissionEarned,
      pendingCommission: affiliateStats?.pendingCommission || 0,
      monthlyCommission,
      payoutRequested: affiliateStats?.payoutRequested || false,
      requestedPayout: affiliateStats?.requestedPayout || 0,
      lastPayoutDate: affiliateStats?.lastPayoutDate,
      referrals: referralStats
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
    
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount' });
    }
    
    // Check if already has pending request
    const affiliateStats = await prisma.affiliateStats.findUnique({
      where: { userId: req.user.id }
    });
    
    if (affiliateStats?.payoutRequested) {
      return res.status(400).json({ error: 'Payout request already pending' });
    }
    
    // Update affiliate stats
    await prisma.affiliateStats.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        payoutRequested: true,
        requestedPayout: amount,
        payoutRequestDate: new Date()
      },
      update: {
        payoutRequested: true,
        requestedPayout: amount,
        payoutRequestDate: new Date()
      }
    });
    
    res.json({ success: true, message: 'Payout request submitted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
export default router;