import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Grant deposit bonus
async function grantDepositBonus(userId, depositAmount, bonusAmount) {
  const wageringMultiplier = 25; // 25x for deposit bonus
  const wageringRequired = bonusAmount * wageringMultiplier;
  
  // Create bonus record
  await prisma.bonus.create({
    data: {
      userId,
      amount: bonusAmount,
      type: 'deposit',
      description: `Deposit bonus for $${depositAmount} deposit`,
      wageringRequired,
      wageringMultiplier
    }
  });
  
  // Update user balances
  await prisma.user.update({
    where: { id: userId },
    data: {
      bonusBalance: { increment: bonusAmount },
      activeWageringRequirement: { increment: wageringRequired }
    }
  });
}
// Generate USDT wallet address (simplified - in production use proper crypto libraries)
function generateUSDTAddress() {
  // This is a simplified version - in production, use proper TRON/TRC20 address generation
  const randomBytes = crypto.randomBytes(20);
  const address = 'T' + randomBytes.toString('hex').substring(0, 33);
  return address;
}

// Get or create wallet info for user
router.get('/info', authenticateToken, async (req, res) => {
  try {
    let wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      // Create new wallet for user
      const address = generateUSDTAddress();
      const privateKey = crypto.randomBytes(32).toString('hex');
      
      wallet = await prisma.cryptoWallet.create({
        data: {
          userId: req.user.id,
          address,
          privateKey, // In production, encrypt this!
          currency: 'USDT',
          network: 'TRC20'
        }
      });
    }

    // Don't send private key to frontend
    const { privateKey, ...safeWallet } = wallet;
    res.json(safeWallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get deposit history
router.get('/deposits', authenticateToken, async (req, res) => {
  try {
    const deposits = await prisma.cryptoDeposit.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ deposits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check balance (simulate checking blockchain)
router.post('/check-balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Simulate blockchain check - in production, use actual TRON API
    // For demo purposes, we'll simulate finding a deposit occasionally
    const shouldSimulateDeposit = Math.random() < 0.1; // 10% chance for demo
    
    if (shouldSimulateDeposit) {
      const amount = Math.floor(Math.random() * 100) + 10; // $10-$110
      const txHash = crypto.randomBytes(32).toString('hex');
      
      // Check if this transaction already exists
      const existingDeposit = await prisma.cryptoDeposit.findUnique({
        where: { txHash }
      });
      
      if (!existingDeposit) {
        // Create new deposit
        await prisma.cryptoDeposit.create({
          data: {
            userId: req.user.id,
            walletId: wallet.id,
            amount,
            currency: 'USDT',
            txHash,
            status: 'confirmed',
            confirmations: 20
          }
        });
        
        // Update user's real balance
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            cashBalance: { increment: amount },
            totalDeposited: { increment: amount }
          }
        });
        
        // Check for deposit bonus (example: 50% up to $100)
        const depositBonusPercent = 0.5; // 50%
        const maxDepositBonus = 100;
        const bonusAmount = Math.min(amount * depositBonusPercent, maxDepositBonus);
        
        if (bonusAmount > 0) {
          await grantDepositBonus(req.user.id, amount, bonusAmount);
        }
        
        // Create transaction record
        const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.transaction.create({
          data: {
            userId: req.user.id,
            type: 'deposit',
            amount,
            cashChange: amount,
            bonusChange: bonusAmount,
            cashBalanceAfter: updatedUser.cashBalance,
            bonusBalanceAfter: updatedUser.bonusBalance,
            lockedBalanceAfter: updatedUser.lockedBalance,
            virtualBalanceAfter: updatedUser.virtualBalance,
            description: `USDT deposit: ${txHash.substring(0, 8)}...`,
            reference: txHash
          }
        });
        
        return res.json({ 
          success: true, 
          message: `New deposit of $${amount} USDT confirmed!${bonusAmount > 0 ? ` Bonus: $${bonusAmount}` : ''}`,
          newDeposit: true
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: 'No new deposits found',
      newDeposit: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook endpoint for real blockchain notifications (for production)
router.post('/webhook', async (req, res) => {
  try {
    // In production, verify webhook signature from blockchain service
    const { address, amount, txHash, confirmations } = req.body;
    
    // Find wallet by address
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { address }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Check if deposit already exists
    const existingDeposit = await prisma.cryptoDeposit.findUnique({
      where: { txHash }
    });
    
    if (existingDeposit) {
      // Update confirmations
      await prisma.cryptoDeposit.update({
        where: { id: existingDeposit.id },
        data: { confirmations }
      });
    } else {
      // Create new deposit
      const deposit = await prisma.cryptoDeposit.create({
        data: {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: parseFloat(amount),
          currency: 'USDT',
          txHash,
          status: confirmations >= 1 ? 'confirmed' : 'pending',
          confirmations
        }
      });
      
      // Update user balance if confirmed
      if (confirmations >= 1) {
        await prisma.user.update({
          where: { id: wallet.userId },
          data: {
            realBalance: { increment: parseFloat(amount) }
          }
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;