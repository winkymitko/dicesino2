import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        cryptoWallet: true,
        realBalance: true,
        virtualBalance: true,
        diceGameModifier: true,
        diceBattleModifier: true,
        totalInvested: true,
        totalGames: true,
        totalWins: true,
        totalLosses: true,
        currentWinStreak: true,
        maxWinStreak: true,
        casinoProfitDice: true,
        casinoProfitBattle: true,
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

// Update user game modifiers
router.put('/users/:userId/modifiers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { diceGameModifier, diceBattleModifier } = req.body;
    
    if (diceGameModifier < 0.1 || diceGameModifier > 5.0 || 
        diceBattleModifier < 0.1 || diceBattleModifier > 5.0) {
      return res.status(400).json({ error: 'Modifiers must be between 0.1 and 5.0' });
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { diceGameModifier, diceBattleModifier }
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
    const { amount, description } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Bonus amount must be positive' });
    }
    
    // Create bonus record
    await prisma.bonus.create({
      data: {
        userId,
        amount,
        type: 'admin_bonus',
        description
      }
    });
    
    // Update user virtual balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        virtualBalance: { increment: amount }
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
    const totalRevenue = await prisma.user.aggregate({
      _sum: { totalInvested: true }
    });
    
    const recentGames = await prisma.game.findMany({
      include: {
        user: { select: { email: true, name: true } },
        rounds: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    res.json({
      totalUsers,
      totalGames,
      totalRevenue: totalRevenue._sum.totalInvested || 0,
      recentGames
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
    
    // Get all games for this user
    const games = await prisma.game.findMany({
      where: { userId },
      include: { rounds: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get all bonuses for this user
    const bonuses = await prisma.bonus.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate totals
    const totalWagered = games.reduce((sum, game) => sum + (game.stake || 0), 0);
    const totalWon = games.reduce((sum, game) => sum + (game.finalPot || 0), 0);
    const virtualDeposited = bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0) + 1000; // Starting balance
    const realDeposited = 0; // No real deposits in this system yet
    
    // Separate by game type
    const diceGames = games.filter(g => g.gameType === 'dice');
    const battleGames = games.filter(g => g.gameType === 'dicebattle');
    
    // BarboDice stats
    const diceStats = {
      total: diceGames.length,
      won: diceGames.filter(g => g.status === 'cashed_out').length,
      lost: diceGames.filter(g => g.status === 'lost').length,
      wagered: diceGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: diceGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    diceStats.casino_profit = diceStats.wagered - diceStats.won_amount;
    
    // DiceBattle stats
    const battleStats = {
      total: battleGames.length,
      won: battleGames.filter(g => g.status === 'cashed_out').length,
      lost: battleGames.filter(g => g.status === 'lost').length,
      tied: battleGames.filter(g => g.status === 'tie').length,
      wagered: battleGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: battleGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    battleStats.casino_profit = battleStats.wagered - battleStats.won_amount;
    
    // Recent games with casino profit calculation
    const recentGames = games.slice(0, 10).map(game => ({
      ...game,
      casinoProfit: (game.stake || 0) - (game.finalPot || 0)
    }));
    
    res.json({
      virtualDeposited,
      realDeposited,
      totalWagered,
      totalWon,
      diceGames: diceStats,
      battleGames: battleStats,
      recentGames
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;