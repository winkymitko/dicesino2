import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Default bot names
const DEFAULT_BOT_NAMES = [
  'alex_gaming', 'mike_dice', 'sarah_lucky', 'john_roller', 'emma_wins',
  'david_pro', 'lisa_battle', 'chris_king', 'anna_strike', 'tom_master',
  'jenny_ace', 'mark_hunter', 'kate_star', 'ryan_wolf', 'amy_ninja',
  'steve_phoenix', 'lucy_titan', 'jake_viper', 'mia_shadow', 'nick_storm',
  'zoe_hawk', 'ben_thunder', 'eva_fury', 'sam_raven', 'lea_blaze',
  'max_spirit', 'ivy_frost', 'leo_venom', 'ava_crusher', 'dan_ghost',
  'kim_fire', 'joe_reaper', 'sue_steel', 'ray_cobra', 'joy_phantom',
  'tim_wind', 'may_lightning', 'rob_shark', 'sky_ice', 'ace_dragon',
  'fox_wolf', 'rio_flame', 'neo_eagle', 'zed_tiger', 'kai_storm',
  'rex_panther', 'ash_raptor', 'blu_lion', 'red_falcon', 'gem_venom',
  'jet_snake', 'orb_beast', 'hex_hunter', 'arc_claw', 'nyx_fang',
  'zen_rage', 'pax_force', 'lux_power', 'vex_blitz', 'rox_rush',
  'dex_strike', 'jax_slash', 'kex_crush', 'tex_smash', 'wex_blast',
  'yex_boom', 'zex_shock', 'qex_flash', 'rex_zap', 'sex_bolt',
  'pex_spike', 'lex_edge', 'mex_blade', 'nex_shield', 'oex_guard',
  'gex_defend', 'hex_armor', 'iex_wall', 'jex_barrier', 'kex_fortress',
  'lex_tower', 'mex_castle', 'nex_keep', 'oex_hold', 'pex_stand',
  'qex_rise', 'rex_climb', 'sex_peak', 'tex_summit', 'uex_top',
  'vex_high', 'wex_max', 'xex_supreme', 'yex_ultimate', 'zex_final'
];

// In-memory bot names storage (in production, use database)
let botNames = [...DEFAULT_BOT_NAMES];

// Submit bug report
router.post('/bug-reports', async (req, res) => {
  try {
    const { subject, message } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    
    const bugReport = await prisma.bugReport.create({
      data: {
        userId: req.user?.id || null,
        subject: subject.trim(),
        message: message.trim(),
        priority: 'medium' // Default priority set by system
      }
    });
    
    res.json({ success: true, reportId: bugReport.id });
  } catch (error) {
    console.error('Bug report submission error:', error);
    res.status(500).json({ error: 'Failed to submit bug report' });
  }
});

// Get bug reports (admin only)
router.get('/bug-reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    const bugReports = await prisma.bugReport.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            username: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json({ bugReports });
  } catch (error) {
    console.error('Failed to fetch bug reports:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bug report status (admin only)
router.put('/bug-reports/:reportId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, priority } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    
    await prisma.bugReport.update({
      where: { id: reportId },
      data: updateData
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update bug report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export function to get bot names for other modules
export const getBotNames = () => botNames;

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        cryptoWallets: true,
        cashBalance: true,
        bonusBalance: true,
        lockedBalance: true,
        virtualBalance: true,
        activeWageringRequirement: true,
        currentWageringProgress: true,
        diceGameEdge: true,
        diceBattleEdge: true,
        diceRouletteEdge: true,
        maxBetWhileBonus: true,
        maxBonusCashout: true,
        currentWinStreak: true,
        isAffiliate: true,
        affiliateCommission: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user game settings
router.put('/users/:userId/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      diceGameEdge, 
      diceBattleEdge, 
      diceRouletteEdge,
      maxBetWhileBonus, 
      maxBonusCashout,
      wageringMultiplier 
    } = req.body;
    
    if (diceGameEdge < 0 || diceGameEdge > 50 || 
        diceBattleEdge < 0 || diceBattleEdge > 50 ||
        diceRouletteEdge < 0 || diceRouletteEdge > 50) {
      return res.status(400).json({ error: 'House edge must be between 0% and 50%' });
    }
    
    const updateData = {};
    if (diceGameEdge !== undefined) updateData.diceGameEdge = diceGameEdge;
    if (diceBattleEdge !== undefined) updateData.diceBattleEdge = diceBattleEdge;
    if (diceRouletteEdge !== undefined) updateData.diceRouletteEdge = diceRouletteEdge;
    if (maxBetWhileBonus !== undefined) updateData.maxBetWhileBonus = maxBetWhileBonus;
    if (maxBonusCashout !== undefined) updateData.maxBonusCashout = maxBonusCashout;
    if (wageringMultiplier !== undefined) updateData.wageringMultiplier = wageringMultiplier;
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update affiliate commission rate
router.put('/users/:userId/commission', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { commission } = req.body;
    
    if (commission < 0 || commission > 100) {
      return res.status(400).json({ error: 'Commission rate must be between 0% and 100%' });
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { 
        affiliateCommission: commission,
        isAffiliate: commission > 0 // Auto-enable affiliate if commission > 0
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add bonus to user
router.post('/users/:userId/bonus', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Bonus amount must be positive' });
    }
    
    const wageringMultiplier = 20; // 20x wagering requirement
    const wageringRequired = amount * wageringMultiplier;
    
    // Create bonus record
    await prisma.bonus.create({
      data: {
        userId,
        amount,
        type: 'admin_bonus',
        description: 'Admin bonus',
        wageringRequired,
        wageringMultiplier
      }
    });
    
    // Update user bonus balance and wagering requirement
    await prisma.user.update({
      where: { id: userId },
      data: {
        bonusBalance: { increment: amount },
        activeWageringRequirement: { increment: wageringRequired }
      }
    });
    
    // Create transaction record
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'bonus_grant',
        amount,
        bonusChange: amount,
        cashBalanceAfter: user.cashBalance,
        bonusBalanceAfter: user.bonusBalance,
        lockedBalanceAfter: user.lockedBalance,
        virtualBalanceAfter: user.virtualBalance,
        description: 'Admin bonus granted',
        reference: 'admin_bonus'
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalGames = await prisma.game.count();
    
    // Get total real money deposited
    const totalRealMoneyDeposited = await prisma.cryptoDeposit.aggregate({
      where: { status: 'confirmed' },
      _sum: { amount: true }
    });
    
    // Calculate total casino profit from real money games
    const realMoneyGames = await prisma.game.findMany({
      where: {
        metadata: {
          not: {
            contains: '"useVirtual":true'
          }
        }
      },
      select: {
        stake: true,
        finalPot: true,
        status: true
      }
    });
    
    let totalCasinoProfit = 0;
    realMoneyGames.forEach(game => {
      const profit = (game.stake || 0) - (game.finalPot || 0);
      totalCasinoProfit += profit;
    });
    
    res.json({
      totalUsers,
      totalGames,
      totalRealMoneyDeposited: totalRealMoneyDeposited._sum.amount || 0,
      totalCasinoProfit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed user statistics
router.get('/users/:userId/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAffiliate: true,
        affiliateCode: true,
        activeWageringRequirement: true,
        currentWageringProgress: true,
        bonusBalance: true,
        lockedBalance: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get crypto deposits and withdrawals for real money tracking
    const deposits = await prisma.cryptoDeposit.findMany({
      where: { userId, status: 'confirmed' },
      select: { amount: true }
    });
    
    const withdrawals = await prisma.cryptoWithdrawal.findMany({
      where: { userId, status: 'completed' },
      select: { amount: true }
    });
    
    const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const casinoProfit = totalDeposited - totalWithdrawn;
    
    // Get affiliate stats if user is affiliate
    let affiliateStats = null;
    if (user.isAffiliate && user.affiliateCode) {
      // Get actual referrals
      const referrals = await prisma.user.findMany({
        where: { referredBy: user.affiliateCode },
        select: { 
          id: true,
          email: true,
          createdAt: true,
          cashBalance: true,
          bonusBalance: true,
          lockedBalance: true
        }
      });
      
      // Calculate commission for each referral
      const referralStats = [];
      let activeCount = 0;
      let totalCommissionEarned = 0;
      
      for (const ref of referrals) {
        // Get deposits and withdrawals for casino profit calculation
        const deposits = await prisma.cryptoDeposit.findMany({
          where: { userId: ref.id, status: 'confirmed' },
          select: { amount: true }
        });
        
        const withdrawals = await prisma.cryptoWithdrawal.findMany({
          where: { userId: ref.id, status: 'completed' },
          select: { amount: true }
        });
        
        const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const casinoProfit = totalDeposited - totalWithdrawn;
        
        // Commission only if casino is profitable
        const commissionEarned = casinoProfit > 0 ? casinoProfit * (user.affiliateCommission || 0) / 100 : 0;
        totalCommissionEarned += commissionEarned;
        
        // Check if active (has any balance or recent deposits)
        const hasBalance = (ref.cashBalance || 0) + (ref.bonusBalance || 0) + (ref.lockedBalance || 0) > 0;
        const hasRecentDeposit = deposits.some(d => {
          const depositDate = new Date(d.createdAt || Date.now());
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return depositDate > thirtyDaysAgo;
        });
        
        if (hasBalance || hasRecentDeposit) activeCount++;
        
        referralStats.push({
          id: ref.id,
          email: ref.email,
          createdAt: ref.createdAt,
          totalDeposited,
          totalWithdrawn,
          casinoProfit,
          commissionEarned
        });
      }
      
      affiliateStats = {
        totalReferrals: referrals.length,
        activeReferrals: activeCount,
        totalCommissionEarned,
        referrals: referralStats
      };
    }
    
    // Get all games separated by virtual/real
    const virtualGames = await prisma.game.findMany({
      where: { userId },
      where: {
        userId,
        metadata: { contains: '"useVirtual":true' }
      }
    });
    
    const realGames = await prisma.game.findMany({
      where: {
        userId,
        OR: [
          { metadata: { not: { contains: '"useVirtual":true' } } },
          { metadata: null }
        ]
      }
    });
    
    // Get transaction history
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      where: {
        userId,
        type: {
          in: ['deposit', 'withdrawal', 'bonus_grant', 'bonus_conversion']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        type: true,
        amount: true,
        description: true,
        createdAt: true
      }
    });
    
    // Helper function to calculate game stats
    const calculateGameStats = (games, gameType) => {
      const gameTypeGames = games.filter(g => g.gameType === gameType);
      
      const totalGames = gameTypeGames.length;
      const wins = gameTypeGames.filter(g => g.status === 'cashed_out' || g.status === 'won').length;
      const losses = gameTypeGames.filter(g => g.status === 'lost').length;
      const ties = gameTypeGames.filter(g => g.status === 'tie').length;
      
      const totalBets = gameTypeGames.reduce((sum, g) => sum + (g.stake || 0), 0);
      const totalWins = gameTypeGames.reduce((sum, g) => sum + (g.finalPot || 0), 0);
      const totalLoses = totalBets - totalWins;
      
      return {
        totalGames,
        wins,
        losses,
        ties,
        totalBets,
        totalWins,
        totalLoses
      };
    };
    
    // Calculate stats for virtual games
    const virtualStats = {
      barboDice: calculateGameStats(virtualGames, 'dice'),
      diceBattle: calculateGameStats(virtualGames, 'dicebattle'),
      diceRoulette: calculateGameStats(virtualGames, 'diceroulette')
    };
    
    // Calculate stats for real games
    const realStats = {
      barboDice: calculateGameStats(realGames, 'dice'),
      diceBattle: calculateGameStats(realGames, 'dicebattle'),
      diceRoulette: calculateGameStats(realGames, 'diceroulette')
    };
    
    res.json({
      // Real money overview
      realMoney: {
        totalDeposited,
        totalWithdrawn,
        casinoProfit
      },
      
      // Affiliate stats
      affiliateStats,
      
      // Game statistics
      virtualStats,
      realStats,
      
      // Wagering progress
      wagering: {
        required: user?.activeWageringRequirement || 0,
        progress: user?.currentWageringProgress || 0,
        bonusBalance: user?.bonusBalance || 0,
        lockedBalance: user?.lockedBalance || 0,
        progressPercent: user?.activeWageringRequirement > 0 ? 
          ((user?.currentWageringProgress || 0) / user.activeWageringRequirement * 100).toFixed(1) : 0
      },
      
      // Transaction history
      transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bot names
router.get('/bot-names', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({ botNames });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add bot name
router.post('/bot-names', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Bot name is required' });
    }
    
    const trimmedName = name.trim();
    
    if (botNames.includes(trimmedName)) {
      return res.status(400).json({ error: 'Bot name already exists' });
    }
    
    if (trimmedName.length > 20) {
      return res.status(400).json({ error: 'Bot name must be 20 characters or less' });
    }
    
    botNames.push(trimmedName);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove bot name
router.delete('/bot-names', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Bot name is required' });
    }
    
    const index = botNames.indexOf(name);
    if (index === -1) {
      return res.status(400).json({ error: 'Bot name not found' });
    }
    
    if (botNames.length <= 5) {
      return res.status(400).json({ error: 'Cannot remove bot name - minimum 5 names required' });
    }
    
    botNames.splice(index, 1);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;