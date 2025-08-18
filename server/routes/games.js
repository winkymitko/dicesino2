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
  const sorted = [...dice].sort((a, b) => a - b);

  // NEW: classic consecutive straights 1-2-3 and 2-3-4
  const isClassicStraight =
    (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) ||
    (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4);

  // Keep existing odd/even trios as "straights" for compatibility
  const isOddEvenTrio =
    (sorted[0] === 1 && sorted[1] === 3 && sorted[2] === 5) ||
    (sorted[0] === 2 && sorted[1] === 4 && sorted[2] === 6);

  if (isClassicStraight || isOddEvenTrio) {
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
  // Hard cap to keep UI promise: "up to 2.2× per scoring roll"
  const m = multipliers[points] || 1.0;
  return Math.min(m, 2.2);
}

// Apply house edge
function applyHouseEdgeLuck(points, houseEdgePercent) {
  // House edge as "luck manipulation" - higher edge = more likely to get 0 points
  // Standard house edge is 5%, anything above/below manipulates luck
  if (points === 0) return 0; // Already busted, no manipulation needed
  
  const luckRoll = Math.random() * 100;
  
  // If house edge > 5%, increase chance of bad luck (turning winning roll into bust)
  if (houseEdgePercent > 5) {
    const extraBadLuck = (houseEdgePercent - 5) * 2; // 2x multiplier for effect
    if (luckRoll < extraBadLuck) {
      return 0; // Turn winning roll into bust (bad luck)
    }
  }
  
  // If house edge < 5%, decrease chance of bad luck (more wins)
  if (houseEdgePercent < 5) {
    const extraGoodLuck = (5 - houseEdgePercent) * 1.5; // 1.5x multiplier for effect
    if (luckRoll < extraGoodLuck && points === 0) {
      return 50; // Turn bust into small win (good luck)
    }
  }
  
  return points; // No luck manipulation
}

// Determine bet source and amounts
async function determineBetSource(userId, stakeAmount, useVirtual) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (useVirtual) {
    if (user.virtualBalance < stakeAmount) {
      throw new Error('Insufficient virtual balance');
    }
    return { source: 'virtual', bonusUsed: 0, cashUsed: 0, virtualUsed: stakeAmount };
  }
  
  // Check bonus restrictions
  if ((user.bonusBalance > 0 || user.lockedBalance > 0) && stakeAmount > (user.maxBetWhileBonus || 50)) {
    throw new Error(`Maximum bet while bonus active is $${user.maxBetWhileBonus}`);
  }
  
  let bonusUsed = 0;
  let cashUsed = 0;
  let remainingStake = stakeAmount;
  
  // Use bonus first
  if (user.bonusBalance > 0 && remainingStake > 0) {
    bonusUsed = Math.min(user.bonusBalance, remainingStake);
    remainingStake -= bonusUsed;
  }
  
  // Use cash for remainder
  if (remainingStake > 0) {
    const totalAvailable = (user.cashBalance || 0) + (user.bonusBalance || 0);
    if (totalAvailable < stakeAmount) {
      throw new Error(`Insufficient balance. Available: $${totalAvailable.toFixed(2)}, Required: $${stakeAmount.toFixed(2)}`);
    }
    if ((user.cashBalance || 0) < remainingStake) {
      throw new Error(`Insufficient cash balance. Cash: $${(user.cashBalance || 0).toFixed(2)}, Need: $${remainingStake.toFixed(2)} (after using $${bonusUsed.toFixed(2)} bonus)`);
    }
    cashUsed = remainingStake;
  }
  
  const source = bonusUsed > 0 ? (cashUsed > 0 ? 'mixed' : 'bonus') : 'cash';
  return { source, bonusUsed, cashUsed, virtualUsed: 0 };
}

// Process winnings based on source
async function processWinnings(userId, winAmount, betSource, bonusUsed, cashUsed) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  let cashWin = 0;
  let lockedWin = 0;
  
  if (betSource === 'cash') {
    // Pure cash bet - winnings go to cash
    cashWin = winAmount;
  } else if (betSource === 'bonus') {
    // Pure bonus bet - winnings go to locked
    lockedWin = winAmount;
    
    // Apply max cashout limit
    const currentLocked = user.lockedBalance + lockedWin;
    const maxCashout = user.maxBonusCashout;
    if (currentLocked > maxCashout) {
      lockedWin = Math.max(0, maxCashout - user.lockedBalance);
    }
  } else if (betSource === 'mixed') {
    // Mixed bet - proportional winnings
    const totalBet = bonusUsed + cashUsed;
    const cashProportion = cashUsed / totalBet;
    const bonusProportion = bonusUsed / totalBet;
    
    cashWin = winAmount * cashProportion;
    lockedWin = winAmount * bonusProportion;
    
    // Apply max cashout to locked portion
    const currentLocked = user.lockedBalance + lockedWin;
    const maxCashout = user.maxBonusCashout;
    if (currentLocked > maxCashout) {
      const excessLocked = currentLocked - maxCashout;
      lockedWin = Math.max(0, lockedWin - excessLocked);
    }
  }
  
  return { cashWin, lockedWin };
}

// Update wagering progress
async function updateWageringProgress(userId, wageringAmount) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user.activeWageringRequirement <= 0) return;
  
  const newProgress = user.currentWageringProgress + wageringAmount;
  
  if (newProgress >= user.activeWageringRequirement) {
    // Wagering requirement met!
    const lockedToConvert = user.lockedBalance;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        cashBalance: { increment: lockedToConvert },
        lockedBalance: 0,
        bonusBalance: 0, // Clear remaining bonus
        activeWageringRequirement: 0,
        currentWageringProgress: 0
      }
    });
    
    // Mark bonuses as completed
    await prisma.bonus.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'completed', completedAt: new Date() }
    });
    
    // Create transaction for bonus conversion
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'bonus_conversion',
        amount: lockedToConvert,
        cashChange: lockedToConvert,
        lockedChange: -lockedToConvert,
        bonusChange: -user.bonusBalance,
        cashBalanceAfter: updatedUser.cashBalance,
        bonusBalanceAfter: 0,
        lockedBalanceAfter: 0,
        virtualBalanceAfter: updatedUser.virtualBalance,
        description: 'Bonus wagering requirement completed',
        reference: 'wagering_complete'
      }
    });
    
    return { wageringCompleted: true, convertedAmount: lockedToConvert };
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { currentWageringProgress: newProgress }
    });
    
    return { wageringCompleted: false, convertedAmount: 0 };
  }
}

// Start new dice game
router.post('/dice/start', authenticateToken, async (req, res) => {
  try {
    const { stake, useVirtual = false } = req.body;
    
    const numericStake = Number(stake);
    if (!stake || numericStake < 0.1 || numericStake > 1000) {
      return res.status(400).json({ error: 'Stake must be between $0.10 and $1000' });
    }
    
    // Determine bet source
    const { source, bonusUsed, cashUsed, virtualUsed } = await determineBetSource(
      req.user.id, 
      numericStake, 
      useVirtual
    );
    
    // Update wagering progress for all real money bets (regardless of source)
    if (!useVirtual) {
      await updateWageringProgress(req.user.id, numericStake);
    }
    
    // Create new game
    const game = await prisma.game.create({
      data: {
        userId: req.user.id,
        gameType: 'dice',
        stake: numericStake,
        totalPot: numericStake,
        status: 'active',
        betSource: source,
        bonusUsed,
        cashUsed
      }
    });
    
    // Update user balances
    const updateData = {};
    if (useVirtual) {
      updateData.virtualBalance = { decrement: virtualUsed };
    } else {
      if (bonusUsed > 0) updateData.bonusBalance = { decrement: bonusUsed };
      if (cashUsed > 0) updateData.cashBalance = { decrement: cashUsed };
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    
    // Create transaction record
    if (!useVirtual) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'bet',
          amount: numericStake,
          cashChange: -cashUsed,
          bonusChange: -bonusUsed,
          cashBalanceAfter: user.cashBalance,
          bonusBalanceAfter: user.bonusBalance,
          lockedBalanceAfter: user.lockedBalance,
          virtualBalanceAfter: user.virtualBalance,
          description: `BarboDice bet - ${source}`,
          reference: game.id
        }
      });
    }
    
    res.json({ gameId: game.id, totalPot: game.totalPot });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Server error' });
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
    
    // Apply house edge as luck manipulation
    const houseEdge = req.user.diceGameEdge;
    points = applyHouseEdgeLuck(points, houseEdge);
    
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
        nonce,
        wageringContribution: game.betSource !== 'cash' ? game.stake : 0
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
    
    if (useVirtual) {
      // Virtual game - simple balance update
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          virtualBalance: { increment: game.totalPot },
          currentWinStreak: { increment: 1 }
        }
      });
    } else {
      // Real money game - complex balance handling
      const { cashWin, lockedWin } = await processWinnings(
        req.user.id,
        game.totalPot,
        game.betSource,
        game.bonusUsed,
        game.cashUsed
      );
      
      // Update user balance and stats
      const updateData = {
        currentWinStreak: { increment: 1 }
      };
      
      if (cashWin > 0) updateData.cashBalance = { increment: cashWin };
      if (lockedWin > 0) updateData.lockedBalance = { increment: lockedWin };
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
      });
      
      // Create transaction record
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'win',
          amount: game.totalPot,
          cashChange: cashWin,
          lockedChange: lockedWin,
          cashBalanceAfter: user.cashBalance,
          bonusBalanceAfter: user.bonusBalance,
          lockedBalanceAfter: user.lockedBalance,
          virtualBalanceAfter: user.virtualBalance,
          description: `BarboDice win - ${game.betSource}`,
          reference: game.id
        }
      });
    }
    
    res.json({ 
      success: true, 
      finalPot: game.totalPot,
      winStreak: req.user.currentWinStreak + 1
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

// User game stats (all-time)
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

// DiceBattle routes (simplified for space - similar pattern)

// Dice Roulette routes
router.post('/diceroulette/roll', authenticateToken, async (req, res) => {
  try {
    const { bets, useVirtual = false } = req.body;
    
    if (!bets || Object.keys(bets).length === 0) {
      return res.status(400).json({ error: 'No bets placed' });
    }
    
    const totalBet = Object.values(bets).reduce((sum, bet) => sum + Number(bet), 0);
    
    if (totalBet < 0.1 || totalBet > 1000) {
      return res.status(400).json({ error: 'Total bet must be between $0.10 and $1000' });
    }
    
    // Determine bet source
    const { source, bonusUsed, cashUsed, virtualUsed } = await determineBetSource(
      req.user.id, 
      totalBet, 
      useVirtual
    );
    
    // Update wagering progress for all real money bets
    if (!useVirtual) {
      await updateWageringProgress(req.user.id, totalBet);
    }
    
    // Generate dice roll
    const serverSeed = generateServerSeed();
    const clientSeed = Math.random().toString(36).substring(2, 15);
    const [dice1, dice2, dice3] = generateDiceRoll(serverSeed, clientSeed, 1);
    const sum = dice1 + dice2 + dice3;
    
    // Calculate winnings for each bet
    let totalWin = 0;
    const betResults = {};
    
    Object.entries(bets).forEach(([betType, betAmount]) => {
      const amount = Number(betAmount);
      let payout = 0;
      
      // Apply house edge
      const houseEdge = req.user.diceRouletteEdge || 5;
      const luckRoll = Math.random() * 100;
      let shouldWin = false;
      
      // Determine if bet wins
      if (betType.startsWith('number_')) {
        const number = parseInt(betType.split('_')[1]);
        shouldWin = [dice1, dice2, dice3].includes(number);
        if (shouldWin) payout = amount * 2.2;
      } else if (betType === 'odd') {
        shouldWin = sum % 2 === 1;
        if (shouldWin) payout = amount * 1.9;
      } else if (betType === 'even') {
        shouldWin = sum % 2 === 0;
        if (shouldWin) payout = amount * 1.9;
      } else if (betType === 'low') {
        shouldWin = sum >= 3 && sum <= 9;
        if (shouldWin) payout = amount * 1.9;
      } else if (betType === 'high') {
        shouldWin = sum >= 10 && sum <= 18;
        if (shouldWin) payout = amount * 1.9;
      }
      
      // Apply luck manipulation
      if (houseEdge > 5 && shouldWin) {
        const badLuckChance = (houseEdge - 5) * 2;
        if (luckRoll < badLuckChance) {
          shouldWin = false;
          payout = 0;
        }
      } else if (houseEdge < 5 && !shouldWin) {
        const goodLuckChance = (5 - houseEdge) * 1.5;
        if (luckRoll < goodLuckChance) {
          shouldWin = true;
          // Set appropriate payout based on bet type
          if (betType.startsWith('number_')) payout = amount * 2.2;
          else payout = amount * 1.9;
        }
      }
      
      betResults[betType] = { amount, won: shouldWin, payout };
      totalWin += payout;
    });
    
    // Create game record
    const game = await prisma.game.create({
      data: {
        userId: req.user.id,
        gameType: 'diceroulette',
        stake: totalBet,
        totalPot: totalBet,
        finalPot: totalWin,
        status: totalWin > 0 ? 'cashed_out' : 'lost',
        betSource: source,
        bonusUsed,
        cashUsed,
        metadata: JSON.stringify({ 
          useVirtual, 
          bets, 
          betResults,
          dice1, dice2, dice3, sum
        })
      }
    });
    
    // Update user balances
    const updateData = {};
    if (useVirtual) {
      updateData.virtualBalance = { decrement: virtualUsed };
      if (totalWin > 0) updateData.virtualBalance = { increment: totalWin };
    } else {
      if (bonusUsed > 0) updateData.bonusBalance = { decrement: bonusUsed };
      if (cashUsed > 0) updateData.cashBalance = { decrement: cashUsed };
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    
    // Handle real money winnings
    if (totalWin > 0 && !useVirtual) {
      const { cashWin, lockedWin } = await processWinnings(
        req.user.id,
        totalWin,
        source,
        bonusUsed,
        cashUsed
      );
      
      const winUpdateData = {
        currentWinStreak: { increment: 1 }
      };
      
      if (cashWin > 0) winUpdateData.cashBalance = { increment: cashWin };
      if (lockedWin > 0) winUpdateData.lockedBalance = { increment: lockedWin };
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: winUpdateData
      });
      
      await updateWageringProgress(req.user.id, totalBet);
    }
    
    // Create game round for record keeping
    await prisma.gameRound.create({
      data: {
        gameId: game.id,
        userId: req.user.id,
        roundNumber: 1,
        dice1, dice2, dice3,
        points: totalWin > 0 ? 100 : 0,
        multiplier: totalWin > 0 ? totalWin / totalBet : 0,
        potBefore: totalBet,
        potAfter: totalWin,
        serverSeed,
        clientSeed,
        nonce: 1,
        wageringContribution: source !== 'cash' ? totalBet : 0,
        metadata: JSON.stringify({ betResults })
      }
    });
    
    res.json({
      roll: { dice1, dice2, dice3, sum },
      results: {
        betResults,
        totalWin,
        totalLost: totalBet - totalWin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Start DiceBattle matchmaking
router.post('/dicebattle/start', authenticateToken, async (req, res) => {
  try {
    const { stake, useVirtual = false, playerGuess } = req.body;
    
    const numericStake = Number(stake);
    if (!stake || numericStake < 0.1 || numericStake > 1000) {
      return res.status(400).json({ error: 'Stake must be between $0.10 and $1000' });
    }
    
    // Determine bet source
    const { source, bonusUsed, cashUsed, virtualUsed } = await determineBetSource(
      req.user.id, 
      numericStake, 
      useVirtual
    );
    
    // Update wagering progress for all real money bets
    if (!useVirtual) {
      await updateWageringProgress(req.user.id, numericStake);
    }
    
    // Generate bot opponent
    const botNames = ['DiceKing', 'RollMaster', 'LuckyPlayer', 'DiceNinja', 'BattleBot'];
    const botName = botNames[Math.floor(Math.random() * botNames.length)];
    const botGuess = Math.floor(Math.random() * 16) + 3; // 3-18
    const botLevel = Math.floor(Math.random() * 50) + 1;
    const botWins = Math.floor(Math.random() * 100);
    const botLosses = Math.floor(Math.random() * 80);
    
    const opponent = {
      name: botName,
      guess: botGuess,
      level: botLevel,
      wins: botWins,
      losses: botLosses
    };
    
    // Create new game
    const game = await prisma.game.create({
      data: {
        userId: req.user.id,
        gameType: 'dicebattle',
        stake: numericStake,
        totalPot: numericStake,
        status: 'active',
        betSource: source,
        bonusUsed,
        cashUsed,
        metadata: JSON.stringify({ 
          useVirtual, 
          opponent,
          playerGuess: 10 // Temporary, real guess sent in roll
        })
      }
    });
    
    // Update user balances
    const updateData = {};
    if (useVirtual) {
      updateData.virtualBalance = { decrement: virtualUsed };
    } else {
      if (bonusUsed > 0) updateData.bonusBalance = { decrement: bonusUsed };
      if (cashUsed > 0) updateData.cashBalance = { decrement: cashUsed };
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    
    // Create transaction record
    if (!useVirtual) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'bet',
          amount: numericStake,
          cashChange: -cashUsed,
          bonusChange: -bonusUsed,
          cashBalanceAfter: user.cashBalance,
          bonusBalanceAfter: user.bonusBalance,
          lockedBalanceAfter: user.lockedBalance,
          virtualBalanceAfter: user.virtualBalance,
          description: `DiceBattle bet - ${source}`,
          reference: game.id
        }
      });
    }
    
    res.json({ gameId: game.id, opponent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Roll dice for DiceBattle
router.post('/dicebattle/roll', authenticateToken, async (req, res) => {
  try {
    const { gameId, playerGuess } = req.body;
    
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });
    
    if (!game || game.userId !== req.user.id || game.status !== 'active') {
      return res.status(400).json({ error: 'Invalid game' });
    }
    
    const metadata = JSON.parse(game.metadata || '{}');
    const opponent = metadata.opponent;
    const useVirtual = metadata.useVirtual;
    
    // Generate dice using provably fair
    const serverSeed = generateServerSeed();
    const clientSeed = Math.random().toString(36).substring(2, 15);
    const [dice1, dice2, dice3] = generateDiceRoll(serverSeed, clientSeed, 1);
    const total = dice1 + dice2 + dice3;
    
    // Calculate distances
    const playerDistance = Math.abs(total - playerGuess);
    const opponentDistance = Math.abs(total - opponent.guess);
    
    // Apply house edge as luck manipulation for DiceBattle
    const houseEdge = req.user.diceBattleEdge || 5;
    let winner = 'player';
    
    if (playerDistance < opponentDistance) {
      winner = 'player';
    } else if (playerDistance > opponentDistance) {
      winner = 'opponent';
    } else {
      winner = 'tie';
    }
    
    // Apply luck manipulation based on house edge
    if (houseEdge > 5 && winner === 'player') {
      const badLuckChance = (houseEdge - 5) * 2; // 2% per 1% edge above 5%
      if (Math.random() * 100 < badLuckChance) {
        winner = 'opponent'; // Bad luck - player loses even if they should win
      }
    } else if (houseEdge < 5 && winner === 'opponent') {
      const goodLuckChance = (5 - houseEdge) * 1.5; // 1.5% per 1% edge below 5%
      if (Math.random() * 100 < goodLuckChance) {
        winner = 'player'; // Good luck - player wins even if they should lose
      }
    }
    
    // Calculate winnings (official 5% house edge always applies to prize pool)
    const totalPot = game.stake * 2;
    const houseCommission = totalPot * 0.05; // Always 5% official commission
    const prizePool = totalPot - houseCommission;
    
    let winnings = 0;
    let finalPot = 0;
    let gameStatus = 'lost';
    
    if (winner === 'player') {
      winnings = prizePool;
      finalPot = winnings;
      gameStatus = 'cashed_out';
    } else if (winner === 'tie') {
      winnings = game.stake; // Return stake on tie
      finalPot = winnings;
      gameStatus = 'tie';
    }
    
    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: gameStatus,
        finalPot,
        metadata: JSON.stringify({
          ...metadata,
          playerGuess,
          dice1, dice2, dice3, total,
          playerDistance, opponentDistance,
          winner, winnings
        })
      }
    });
    
    // Create game round for record keeping
    await prisma.gameRound.create({
      data: {
        gameId,
        userId: req.user.id,
        roundNumber: 1,
        dice1, dice2, dice3,
        points: winner === 'player' ? 100 : (winner === 'tie' ? 50 : 0),
        multiplier: 1.0,
        potBefore: game.stake,
        potAfter: finalPot,
        serverSeed,
        clientSeed,
        nonce: 1,
        wageringContribution: game.betSource !== 'cash' ? game.stake : 0,
        metadata: JSON.stringify({ playerGuess, opponentGuess: opponent.guess, total, winner })
      }
    });
    
    if (winnings > 0) {
      if (useVirtual) {
        // Virtual game - simple balance update
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            virtualBalance: { increment: winnings },
            currentWinStreak: { increment: 1 }
          }
        });
      } else {
        // Real money game - complex balance handling
        const { cashWin, lockedWin } = await processWinnings(
          req.user.id,
          winnings,
          game.betSource,
          game.bonusUsed,
          game.cashUsed
        );
        
        // Update user balance and stats
        const updateData = {
          currentWinStreak: { increment: 1 }
        };
        
        if (cashWin > 0) updateData.cashBalance = { increment: cashWin };
        if (lockedWin > 0) updateData.lockedBalance = { increment: lockedWin };
        
        await prisma.user.update({
          where: { id: req.user.id },
          data: updateData
        });
        
        // Create transaction record
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.transaction.create({
          data: {
            userId: req.user.id,
            type: 'win',
            amount: winnings,
            cashChange: cashWin,
            lockedChange: lockedWin,
            cashBalanceAfter: user.cashBalance,
            bonusBalanceAfter: user.bonusBalance,
            lockedBalanceAfter: user.lockedBalance,
            virtualBalanceAfter: user.virtualBalance,
            description: `DiceBattle win - ${game.betSource}`,
            reference: game.id
          }
        });
      }
    } else {
      // Player lost
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          currentWinStreak: 0
        }
      });
    }
    
    res.json({
      dice1, dice2, dice3, total,
      playerGuess, playerDistance,
      opponent: { ...opponent, distance: opponentDistance },
      winner, winnings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ... (DiceBattle implementation would follow similar pattern with new wallet system)

export default router;
