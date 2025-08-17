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
        maxBetWhileBonus: true,
        maxBonusCashout: true,
        currentWinStreak: true,
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
      maxBetWhileBonus, 
      maxBonusCashout,
      wageringMultiplier 
    } = req.body;
    
    if (diceGameEdge < 0 || diceGameEdge > 50 || 
        diceBattleEdge < 0 || diceBattleEdge > 50) {
      return res.status(400).json({ error: 'House edge must be between 0% and 50%' });
    }
    
    const updateData = {};
    if (diceGameEdge !== undefined) updateData.diceGameEdge = diceGameEdge;
    if (diceBattleEdge !== undefined) updateData.diceBattleEdge = diceBattleEdge;
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
    
    if (commission < 0 || commission > 50) {
      return res.status(400).json({ error: 'Commission rate must be between 0% and 50%' });
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
    
    // Get crypto deposits for real money deposited
    const cryptoDeposits = await prisma.cryptoDeposit.findMany({
      where: { userId, status: 'confirmed' }
    });
    const realDeposited = cryptoDeposits.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);
    
    // Separate games by balance type (virtual vs real)
    const virtualGames = games.filter(game => {
      try {
        const metadata = JSON.parse(game.metadata || '{}');
        return metadata.useVirtual === true;
      } catch {
        return false;
      }
    });
    
    const realGames = games.filter(game => {
      try {
        const metadata = JSON.parse(game.metadata || '{}');
        return metadata.useVirtual !== true; // Real money games
      } catch {
        return true; // Default to real if no metadata
      }
    });
    
    // Calculate virtual stats
    const virtualWagered = virtualGames.reduce((sum, game) => sum + (game.stake || 0), 0);
    const virtualWon = virtualGames.reduce((sum, game) => sum + (game.finalPot || 0), 0);
    const virtualDeposited = 1000 + bonuses.filter(b => b.type === 'signup').reduce((sum, bonus) => sum + (bonus.amount || 0), 0); // Initial + signup bonuses
    
    // Calculate real stats
    const realWagered = realGames.reduce((sum, game) => sum + (game.stake || 0), 0);
    const realWon = realGames.reduce((sum, game) => sum + (game.finalPot || 0), 0);
    const depositBonuses = bonuses.filter(b => b.type === 'deposit').reduce((sum, bonus) => sum + (bonus.amount || 0), 0);
    
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
      won_amount: virtualDiceGames.reduce((sum, game) => sum + (game.finalPot || 0), 0)
    };
    const virtualDiceCasinoProfit = virtualDiceStats.wagered - virtualDiceStats.won_amount;
    
    // Virtual DiceBattle stats
    const virtualBattleStats = {
      total: virtualBattleGames.length,
      won: virtualBattleGames.filter(g => g.status === 'cashed_out').length,
      lost: virtualBattleGames.filter(g => g.status === 'lost').length,
      tied: virtualBattleGames.filter(g => g.status === 'tie').length,
      wagered: virtualBattleGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: virtualBattleGames.reduce((sum, game) => sum + (game.finalPot || 0), 0)
    };
    const virtualBattleCasinoProfit = virtualBattleStats.wagered - virtualBattleStats.won_amount;
    
    // Real BarboDice stats
    const realDiceStats = {
      total: realDiceGames.length,
      won: realDiceGames.filter(g => g.status === 'cashed_out').length,
      lost: realDiceGames.filter(g => g.status === 'lost').length,
      wagered: realDiceGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: realDiceGames.reduce((sum, game) => sum + (game.finalPot || 0), 0)
    };
    const realDiceCasinoProfit = realDiceStats.wagered - realDiceStats.won_amount;
    
    // Real DiceBattle stats
    const realBattleStats = {
      total: realBattleGames.length,
      won: realBattleGames.filter(g => g.status === 'cashed_out').length,
      lost: realBattleGames.filter(g => g.status === 'lost').length,
      tied: realBattleGames.filter(g => g.status === 'tie').length,
      wagered: realBattleGames.reduce((sum, game) => sum + (game.stake || 0), 0),
      won_amount: realBattleGames.reduce((sum, game) => sum + (game.finalPot || 0), 0)
    };
    const realBattleCasinoProfit = realBattleStats.wagered - realBattleStats.won_amount;
    
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
        netResult: virtualWon - virtualWagered,
        diceGames: virtualDiceStats,
        battleGames: virtualBattleStats,
        diceCasinoProfit: virtualDiceCasinoProfit,
        battleCasinoProfit: virtualBattleCasinoProfit,
        totalCasinoProfit: virtualDiceCasinoProfit + virtualBattleCasinoProfit,
        recentGames: virtualRecentGames
      },
      real: {
        deposited: realDeposited,
        depositBonuses: depositBonuses,
        wagered: realWagered,
        won: realWon,
        netResult: realWon - realWagered,
        diceGames: realDiceStats,
        battleGames: realBattleStats,
        diceCasinoProfit: realDiceCasinoProfit,
        battleCasinoProfit: realBattleCasinoProfit,
        totalCasinoProfit: realDiceCasinoProfit + realBattleCasinoProfit,
        recentGames: realRecentGames
      }
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