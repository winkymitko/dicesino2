import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createHash } from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Provably Fair: Generate server seed
function generateServerSeed() {
  return createHash('sha256').update(Math.random().toString()).digest('hex');
}

// Provably Fair: Generate dice roll
function generateDiceRoll(serverSeed, clientSeed, nonce) {
  const hash = createHash('sha256')
    .update(serverSeed + clientSeed + nonce.toString())
    .digest('hex');
  
  const dice = [];
  for (let i = 0; i < 3; i++) {
    const hexPair = hash.substr(i * 2, 2);
    const decimal = parseInt(hexPair, 16);
    dice.push((decimal % 6) + 1);
  }
  return dice;
}

// Calculate points from dice
function calculatePoints(dice1, dice2, dice3) {
  const dice = [dice1, dice2, dice3];
  
  // Check for triples
  if (dice1 === dice2 && dice2 === dice3) {
    return dice1 * 100; // Triple value * 100
  }
  
  // Check for straights
  const sorted = [...dice].sort();
  if ((sorted[0] === 1 && sorted[1] === 3 && sorted[2] === 5) ||
      (sorted[0] === 2 && sorted[1] === 4 && sorted[2] === 6)) {
    return 100; // Straight
  }
  
  // Count singles (1s and 5s)
  let points = 0;
  dice.forEach(die => {
    if (die === 1) points += 100;
    if (die === 5) points += 50;
  });
  
  return points;
}

// Get multiplier based on points
function getMultiplier(points) {
  const multipliers = {
    50: 1.1, 100: 1.2, 150: 1.3, 200: 1.4,
    250: 1.6, 300: 1.8, 400: 2.0, 500: 2.1, 600: 2.2
  };
  return multipliers[points] || 1.0;
}

// Apply provably fair adjustments (admin can modify win chances)
function applyFairnessModifier(points, winChanceModifier) {
  // Only apply modifier to losing rolls (0 points) to make them more/less likely
  if (points > 0) return points; // Don't modify winning combinations
  
  // For losing rolls, modifier affects whether to convert to a small win
  const random = Math.random();
  const threshold = 0.15 * (winChanceModifier - 1); // Only when modifier > 1
  
  if (winChanceModifier > 1 && random < threshold) {
    // Convert some losing rolls to small wins
    return 50; // Give minimum points
  }
  
  return 0; // Keep as losing roll
}

// Start new dice game
router.post('/dice/start', authenticateToken, async (req, res) => {
  try {
    const { stake, useVirtual = false } = req.body;
    const validStakes = [5, 10, 20, 50];
    
    if (!validStakes.includes(stake)) {
      return res.status(400).json({ error: 'Invalid stake amount' });
    }
    
    const balance = useVirtual ? req.user.virtualBalance : req.user.realBalance;
    if (balance < stake) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create new game
    const game = await prisma.game.create({
      data: {
        userId: req.user.id,
        gameType: 'dice',
        stake,
        totalPot: stake,
        status: 'active'
      }
    });
    
    // Update user balance
    const balanceField = useVirtual ? 'virtualBalance' : 'realBalance';
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        [balanceField]: balance - stake,
        totalInvested: { increment: stake },
        totalGames: { increment: 1 }
      }
    });
    
    res.json({ gameId: game.id, totalPot: game.totalPot });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Roll dice
router.post('/dice/roll', authenticateToken, async (req, res) => {
  try {
    const { gameId, clientSeed } = req.body;
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { rounds: { orderBy: { roundNumber: 'desc' } } }
    });
    
    if (!game || game.userId !== req.user.id || game.status !== 'active') {
      return res.status(400).json({ error: 'Invalid game' });
    }
    
    const roundNumber = game.rounds.length + 1;
    const serverSeed = generateServerSeed();
    const nonce = roundNumber;
    
    // Generate dice using provably fair
    const [dice1, dice2, dice3] = generateDiceRoll(serverSeed, clientSeed, nonce);
    
    // Calculate points
    let points = calculatePoints(dice1, dice2, dice3);
    
    // Apply fairness modifier from user settings
    points = applyFairnessModifier(points, req.user.winChanceModifier);
    
    const multiplier = getMultiplier(points);
    const potBefore = game.totalPot;
    const potAfter = points > 0 ? potBefore * multiplier : 0;
    
    // Create game round
    const round = await prisma.gameRound.create({
      data: {
        gameId,
        userId: req.user.id,
        roundNumber,
        dice1, dice2, dice3,
        points,
        multiplier,
        potBefore,
        potAfter,
        serverSeed,
        clientSeed,
        nonce
      }
    });
    
    if (points === 0) {
      // Game over - player lost
      await prisma.game.update({
        where: { id: gameId },
        data: { 
          status: 'lost',
          finalPot: 0
        }
      });
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          totalLosses: { increment: 1 },
          currentWinStreak: 0
        }
      });
      
      return res.json({ 
        round, 
        gameOver: true, 
        won: false,
        totalPot: 0
      });
    } else {
      // Update game pot
      await prisma.game.update({
        where: { id: gameId },
        data: { totalPot: potAfter }
      });
      
      return res.json({ 
        round, 
        gameOver: false, 
        totalPot: potAfter,
        canCashOut: true
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cash out
router.post('/dice/cashout', authenticateToken, async (req, res) => {
  try {
    const { gameId, useVirtual = false } = req.body;
    
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });
    
    if (!game || game.userId !== req.user.id || game.status !== 'active') {
      return res.status(400).json({ error: 'Invalid game' });
    }
    
    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: { 
        status: 'cashed_out',
        finalPot: game.totalPot
      }
    });
    
    // Update user balance and stats
    const balanceField = useVirtual ? 'virtualBalance' : 'realBalance';
    const currentStreak = req.user.currentWinStreak + 1;
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        [balanceField]: { increment: game.totalPot },
        totalWins: { increment: 1 },
        currentWinStreak: currentStreak,
        maxWinStreak: Math.max(currentStreak, req.user.maxWinStreak)
      }
    });
    
    res.json({ 
      success: true, 
      finalPot: game.totalPot,
      winStreak: currentStreak
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: { userId: req.user.id },
      include: { rounds: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    res.json({ games });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// --- User game stats (all-time) ---
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Total successful rolls across ALL games (points > 0)
    const totalSuccessfulRolls = await prisma.gameRound.count({
      where: { userId, points: { gt: 0 } }
    });

    // Total games played (any status)
    const totalGames = await prisma.game.count({
      where: { userId }
    });

    // Last strike: consecutive scoring rounds before the bust in the most recent LOST game
    let lastStrike = 0;
    const lastLostGame = await prisma.game.findFirst({
      where: { userId, status: 'lost' },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    if (lastLostGame) {
      const rounds = await prisma.gameRound.findMany({
        where: { userId, gameId: lastLostGame.id },
        orderBy: { roundNumber: 'asc' },
        select: { points: true }
      });
      for (const r of rounds) {
        if ((r.points ?? 0) > 0) lastStrike++;
        else break; // stop at first bust
      }
    }

    // Best strike: max consecutive scoring rounds from the start of ANY game, until first bust (or end if cashed out)
    const allRounds = await prisma.gameRound.findMany({
      where: { userId },
      select: { gameId: true, roundNumber: true, points: true },
      orderBy: [{ gameId: 'asc' }, { roundNumber: 'asc' }]
    });

    let bestStrike = 0;
    let currentGameId = null;
    let currentCount = 0;

    for (const r of allRounds) {
      if (r.gameId !== currentGameId) {
        currentGameId = r.gameId;
        currentCount = 0;
      }
      if ((r.points ?? 0) > 0) {
        currentCount++;
        if (currentCount > bestStrike) bestStrike = currentCount;
      } else {
        // bust stops counting the initial run in this game
        currentCount = Number.MIN_SAFE_INTEGER;
      }
    }

    res.json({ lastStrike, bestStrike, totalSuccessfulRolls, totalGames });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


export default router;

// DiceBattle game routes

// Generate bot opponent
function generateBotOpponent(stake) {
  const names = [
    'DiceKing', 'RollMaster', 'LuckyStrike', 'BattleBot', 'DiceWarrior',
    'RollHunter', 'DiceLord', 'BattleMage', 'RollSeeker', 'DiceChamp',
    'LuckyRoller', 'BattleAce', 'DicePro', 'RollStar', 'BattleWolf'
  ];
  
  const name = names[Math.floor(Math.random() * names.length)];
  const level = Math.floor(Math.random() * 50) + 1;
  const wins = Math.floor(Math.random() * 200) + 10;
  const losses = Math.floor(Math.random() * 150) + 5;
  
  // Bot guess strategy - slightly favor center values but with some randomness
  let guess;
  const random = Math.random();
  if (random < 0.4) {
    // 40% chance to pick optimal range (9-12)
    guess = Math.floor(Math.random() * 4) + 9;
  } else if (random < 0.8) {
    // 40% chance to pick decent range (7-14)
    guess = Math.floor(Math.random() * 8) + 7;
  } else {
    // 20% chance to pick any value (3-18)
    guess = Math.floor(Math.random() * 16) + 3;
  }
  
  return { name, level, wins, losses, guess };
}

// Start DiceBattle game
router.post('/dicebattle/start', authenticateToken, async (req, res) => {
  try {
    const { stake, useVirtual = false, playerGuess } = req.body;
    const validStakes = [5, 10, 20, 50];
    
    if (!validStakes.includes(stake)) {
      return res.status(400).json({ error: 'Invalid stake amount' });
    }
    
    if (playerGuess < 3 || playerGuess > 18) {
      return res.status(400).json({ error: 'Guess must be between 3 and 18' });
    }
    
    const balance = useVirtual ? req.user.virtualBalance : req.user.realBalance;
    if (balance < stake) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Generate bot opponent
    const opponent = generateBotOpponent(stake);
    
    // Create new game
    const game = await prisma.game.create({
      data: {
        userId: req.user.id,
        gameType: 'dicebattle',
        stake,
        totalPot: stake * 2, // Player + opponent stake
        status: 'active',
        metadata: JSON.stringify({
          playerGuess,
          opponent,
          useVirtual
        })
      }
    });
    
    // Deduct player's stake
    const balanceField = useVirtual ? 'virtualBalance' : 'realBalance';
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        [balanceField]: balance - stake,
        totalInvested: { increment: stake },
        totalGames: { increment: 1 }
      }
    });
    
    res.json({ gameId: game.id, opponent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Roll dice for DiceBattle
router.post('/dicebattle/roll', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });
    
    if (!game || game.userId !== req.user.id || game.status !== 'active') {
      return res.status(400).json({ error: 'Invalid game' });
    }
    
    const metadata = JSON.parse(game.metadata || '{}');
    const { playerGuess, opponent, useVirtual } = metadata;
    
    // Generate dice using provably fair
    const serverSeed = generateServerSeed();
    const clientSeed = Math.random().toString(36).substring(2, 15);
    const nonce = 1;
    
    const [dice1, dice2, dice3] = generateDiceRoll(serverSeed, clientSeed, nonce);
    const total = dice1 + dice2 + dice3;
    
    // Apply fairness modifier
    const playerDistance = Math.abs(total - playerGuess);
    let opponentDistance = Math.abs(total - opponent.guess);
    
    // Apply win chance modifier (subtle adjustment)
    const modifier = req.user.winChanceModifier;
    if (modifier !== 1.0) {
      const random = Math.random();
      if (modifier > 1.0 && random < 0.3) {
        // Slightly help player
        opponentDistance += Math.floor(Math.random() * 2) + 1;
      } else if (modifier < 1.0 && random < 0.3) {
        // Slightly help opponent
        opponentDistance = Math.max(0, opponentDistance - 1);
      }
    }
    
    const winner = playerDistance < opponentDistance ? 'player' : 
                   playerDistance > opponentDistance ? 'opponent' : 'tie';
    
    let winnings = 0;
    let finalStatus = 'lost';
    
    if (winner === 'player') {
      winnings = game.totalPot * 0.95; // 95% of pot (5% house edge)
      finalStatus = 'won';
    } else if (winner === 'tie') {
      winnings = game.stake; // Return player's stake on tie
      finalStatus = 'tie';
    }
    
    // Create game round
    await prisma.gameRound.create({
      data: {
        gameId,
        userId: req.user.id,
        roundNumber: 1,
        dice1, dice2, dice3,
        points: total,
        multiplier: winner === 'player' ? 1.9 : 0, // 95% return rate
        potBefore: game.totalPot,
        potAfter: winnings,
        serverSeed,
        clientSeed,
        nonce
      }
    });
    
    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: { 
        status: finalStatus,
        finalPot: winnings
      }
    });
    
    // Update user balance and stats
    const balanceField = useVirtual ? 'virtualBalance' : 'realBalance';
    const updateData = {};
    
    if (winnings > 0) {
      updateData[balanceField] = { increment: winnings };
    }
    
    if (winner === 'player') {
      updateData.totalWins = { increment: 1 };
      updateData.currentWinStreak = { increment: 1 };
      updateData.maxWinStreak = Math.max(req.user.currentWinStreak + 1, req.user.maxWinStreak);
    } else {
      updateData.totalLosses = { increment: 1 };
      updateData.currentWinStreak = 0;
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    
    res.json({
      dice1, dice2, dice3,
      total,
      playerGuess,
      playerDistance,
      opponent: {
        ...opponent,
        distance: opponentDistance
      },
      opponentDistance,
      winner,
      winnings,
      gameOver: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get DiceBattle statistics
router.get('/dicebattle/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get DiceBattle specific stats
    const battleGames = await prisma.game.findMany({
      where: { userId, gameType: 'dicebattle' },
      include: { rounds: true }
    });
    
    const totalBattles = battleGames.length;
    const wonBattles = battleGames.filter(g => g.status === 'won').length;
    const lostBattles = battleGames.filter(g => g.status === 'lost').length;
    const tiedBattles = battleGames.filter(g => g.status === 'tie').length;
    
    const winRate = totalBattles > 0 ? (wonBattles / totalBattles * 100) : 0;
    
    // Calculate average distance from target
    let totalDistance = 0;
    let validRounds = 0;
    
    battleGames.forEach(game => {
      if (game.rounds && game.rounds.length > 0) {
        const round = game.rounds[0];
        const metadata = JSON.parse(game.metadata || '{}');
        if (metadata.playerGuess && round.points) {
          totalDistance += Math.abs(round.points - metadata.playerGuess);
          validRounds++;
        }
      }
    });
    
    const avgDistance = validRounds > 0 ? (totalDistance / validRounds) : 0;
    
    res.json({
      totalBattles,
      wonBattles,
      lostBattles,
      tiedBattles,
      winRate: winRate.toFixed(1),
      avgDistance: avgDistance.toFixed(1)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});