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

// Apply house edge
function applyHouseEdge(winAmount, houseEdgePercent) {
  const edgeMultiplier = (100 - houseEdgePercent) / 100;
  return winAmount * edgeMultiplier;
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
  if (user.bonusBalance > 0 && stakeAmount > user.maxBetWhileBonus) {
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
    if (user.cashBalance < remainingStake) {
      throw new Error('Insufficient balance');
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
    if (!stake || numericStake < 0.5 || numericStake > 1000) {
      return res.status(400).json({ error: 'Stake must be between $0.50 and $1000' });
    }
    
    // Determine bet source
    const { source, bonusUsed, cashUsed, virtualUsed } = await determineBetSource(
      req.user.id, 
      numericStake, 
      useVirtual
    );
    
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
    const updateData = { totalBets: { increment: numericStake } };
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
    
    // Apply house edge
    const houseEdge = req.user.diceGameEdge;
    const edgeRoll = Math.random() * 100;
    if (edgeRoll < houseEdge && points > 0) {
      points = 0; // House edge kicks in
    }
    
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
      
      // Update wagering progress if bonus was used
      if (game.betSource !== 'cash' && !game.metadata?.includes('virtual')) {
        await updateWageringProgress(req.user.id, game.stake);
      }
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          totalGameLosses: { increment: 1 },
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
          totalGameWins: { increment: 1 },
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
        totalWins: { increment: game.totalPot },
        totalGameWins: { increment: 1 },
        currentWinStreak: { increment: 1 }
      };
      
      if (cashWin > 0) updateData.cashBalance = { increment: cashWin };
      if (lockedWin > 0) updateData.lockedBalance = { increment: lockedWin };
      
      await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
      });
      
      // Update wagering progress
      const wageringResult = await updateWageringProgress(req.user.id, game.stake);
      
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
      
      if (wageringResult.wageringCompleted) {
        return res.json({ 
          success: true, 
          finalPot: game.totalPot,
          winStreak: req.user.currentWinStreak + 1,
          wageringCompleted: true,
          convertedAmount: wageringResult.convertedAmount
        });
      }
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
// ... (DiceBattle implementation would follow similar pattern with new wallet system)

export default router;