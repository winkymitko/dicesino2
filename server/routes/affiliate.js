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

    const affiliateStats = await prisma.affiliateStats.findUnique({
      where: { userId: req.user.id }
    });

    // Get referral details
    const referrals = await prisma.user.findMany({
      where: { referredBy: req.user.affiliateCode },
      select: {
        email: true,
        createdAt: true,
        totalBets: true,
        totalWins: true
      }
    });

    // Calculate total profit from referrals (real money only)
    const referralStats = referrals.map(referral => ({
      ...referral,
      casinoProfit: (referral.totalBets || 0) - (referral.totalWins || 0)
    }));

    // Calculate total commission earned
    const totalCasinoProfit = referralStats.reduce((sum, ref) => sum + (ref.casinoProfit || 0), 0);
    const commissionRate = req.user.affiliateCommission || 0;
    const totalCommissionEarned = totalCasinoProfit * (commissionRate / 100);

    res.json({
      totalReferrals: affiliateStats?.totalReferrals || 0,
      totalCommission: affiliateStats?.totalCommission || 0,
      totalCommissionEarned,
      pendingCommission: affiliateStats?.pendingCommission || 0,
      referrals: referralStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;