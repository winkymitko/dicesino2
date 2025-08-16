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
    
    // Separate games by balance type (from metadata)
    const virtualGames = [];
    const realGames = [];
    
    games.forEach(game => {
      try {
        const metadata = JSON.parse(game.metadata || '{}');
        if (metadata.useVirtual === false) {
          realGames.push(game);
        } else {
          virtualGames.push(game); // Default to virtual if not specified
        }
      } catch {
        virtualGames.push(game); // Default to virtual if metadata parsing fails
      }
    });
    
    // Calculate virtual stats
    const virtualWagered = virtualGames.reduce((sum, game) => sum + (game.stake || 0), 0);
    const virtualWon = virtualGames.reduce((sum, game) => sum + (game.finalPot || 0), 0);
    const virtualDeposited = bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0) + 1000; // Starting balance
    
    // Calculate real stats
    const realWagered = realGames.reduce((sum, game) => sum + (game.stake || 0), 0);
    const realWon = realGames.reduce((sum, game) => sum + (game.finalPot || 0), 0);
    const realDeposited = 0; // No real deposits in this system yet
    
    // Separate by game type for virtual
    const virtualDiceGames = virtualGames.filter(g => g.gameType === 'dice');
    const virtualBattleGames = virtualGames.filter(g => g.gameType === 'dicebattle');
    
    // Separate by game type for real
    const realDiceGames = realGames.filter(g => g.gameType === 'dice');
    const realBattleGames = realGames.filter(g => g.gameType === 'dicebattle');
    
    // Virtual BarboDice stats
    const virtualDiceStats = {
      total: virtualDiceGames.length,
      won: virtualDiceGames.filter(g => g.status === 'cashed_out').length,
      lost: virtualDiceGames.filter(g => g.status === 'lost').length,
      wagered: virtualDiceGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: virtualDiceGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    virtualDiceStats.casino_profit = virtualDiceStats.wagered - virtualDiceStats.won_amount;
    
    // Virtual DiceBattle stats
    const virtualBattleStats = {
      total: virtualBattleGames.length,
      won: virtualBattleGames.filter(g => g.status === 'cashed_out').length,
      lost: virtualBattleGames.filter(g => g.status === 'lost').length,
      tied: virtualBattleGames.filter(g => g.status === 'tie').length,
      wagered: virtualBattleGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: virtualBattleGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    virtualBattleStats.casino_profit = virtualBattleStats.wagered - virtualBattleStats.won_amount;
    
    // Real BarboDice stats
    const realDiceStats = {
      total: realDiceGames.length,
      won: realDiceGames.filter(g => g.status === 'cashed_out').length,
      lost: realDiceGames.filter(g => g.status === 'lost').length,
      wagered: realDiceGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: realDiceGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    realDiceStats.casino_profit = realDiceStats.wagered - realDiceStats.won_amount;
    
    // Real DiceBattle stats
    const realBattleStats = {
      total: realBattleGames.length,
      won: realBattleGames.filter(g => g.status === 'cashed_out').length,
      lost: realBattleGames.filter(g => g.status === 'lost').length,
      tied: realBattleGames.filter(g => g.status === 'tie').length,
      wagered: realBattleGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: realBattleGames.reduce((sum, game) => sum + (game.finalPot || 0), 0),
      casino_profit: 0
    };
    realBattleStats.casino_profit = realBattleStats.wagered - realBattleStats.won_amount;
    
    // Recent virtual games with casino profit calculation
    const virtualRecentGames = virtualGames.slice(0, 10).map(game => ({
      ...game,
      casinoProfit: (game.stake || 0) - (game.finalPot || 0)
    }));
    
    // Recent real games with casino profit calculation
    const realRecentGames = realGames.slice(0, 10).map(game => ({
      ...game,
      casinoProfit: (game.stake || 0) - (game.finalPot || 0)
    }));
    
    res.json({
      virtual: {
        deposited: virtualDeposited,
        wagered: virtualWagered,
        won: virtualWon,
        diceGames: virtualDiceStats,
        battleGames: virtualBattleStats,
        recentGames: virtualRecentGames
      },
      real: {
        deposited: realDeposited,
        wagered: realWagered,
        won: realWon,
        diceGames: realDiceStats,
        battleGames: realBattleStats,
        recentGames: realRecentGames
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;