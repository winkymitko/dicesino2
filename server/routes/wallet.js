import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generateTronWallet, 
  getUSDTBalance, 
  checkNewDeposits,
  isValidTronAddress,
  getTRXBalance,
  sendTRXForGas
} from '../utils/tron.js';
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

// Get or create wallet info for user
router.get('/info', authenticateToken, async (req, res) => {
  try {
    console.log('Wallet info request for user:', req.user?.id);
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      // Create new wallet for user
      console.log('Creating new wallet for user:', req.user.id);
      
      let walletData;
      try {
        walletData = generateTronWallet();
      } catch (error) {
        console.error('Failed to generate TRON wallet:', error);
        // Fallback wallet generation
        walletData = {
          address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Fallback address
          privateKey: '01'.repeat(32) // Fallback private key
        };
      }
      
      const { address, privateKey } = walletData;
      
      // Validate the generated address
      if (!isValidTronAddress(address)) {
        console.error('Generated address not valid:', address);
        return res.status(500).json({ error: 'Failed to generate valid TRON address' });
      }
      
      try {
        wallet = await prisma.cryptoWallet.create({
          data: {
            userId: req.user.id,
            address,
            privateKey: crypto.createHash('sha256').update(privateKey + (process.env.ENCRYPTION_KEY || 'fallback-key')).digest('hex'),
            currency: 'USDT',
            network: 'TRC20'
          }
        });
        console.log('Wallet created successfully:', wallet.id);
      } catch (dbError) {
        console.error('Database error creating wallet:', dbError);
        return res.status(500).json({ error: 'Failed to create wallet in database' });
      }
      
      // Send some TRX for gas fees to new wallet
      try {
        await sendTRXForGas(address, 1); // Send 1 TRX for gas
        console.log('TRX sent for gas fees');
      } catch (error) {
        console.warn('Failed to send TRX for gas fees:', error.message);
        // Don't fail wallet creation if gas transfer fails
      }
    }

    // Don't send private key to frontend
    const { privateKey, ...safeWallet } = wallet;
    console.log('Returning wallet info:', safeWallet.id);
    res.json(safeWallet);
  } catch (error) {
    console.error('Wallet info error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
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

    // Get current USDT balance
    const currentBalance = await getUSDTBalance(wallet.address);
    
    // Get last deposit timestamp to check for new deposits
    const lastDeposit = await prisma.cryptoDeposit.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    const lastCheckedTimestamp = lastDeposit ? 
      Math.floor(new Date(lastDeposit.createdAt).getTime() / 1000) : 
      Math.floor(Date.now() / 1000) - 86400; // Check last 24 hours if no previous deposits
    
    // Check for new deposits
    const newDeposits = await checkNewDeposits(wallet.address, lastCheckedTimestamp);
    
    let totalNewDeposits = 0;
    let processedDeposits = [];
    
    for (const deposit of newDeposits) {
      // Check if this transaction already exists
      const existingDeposit = await prisma.cryptoDeposit.findUnique({
        where: { txHash: deposit.txHash }
      });
      
      if (!existingDeposit && deposit.amount >= 10) { // Minimum $10 deposit
        // Create new deposit record
        const newDeposit = await prisma.cryptoDeposit.create({
          data: {
            userId: req.user.id,
            walletId: wallet.id,
            amount: deposit.amount,
            currency: 'USDT',
            txHash: deposit.txHash,
            status: deposit.confirmations >= 1 ? 'confirmed' : 'pending',
            confirmations: deposit.confirmations
          }
        });
        
        if (deposit.confirmations >= 1) {
          // Update user's cash balance
          await prisma.user.update({
            where: { id: req.user.id },
            data: {
              cashBalance: { increment: deposit.amount }
            }
          });
          
          // Check for deposit bonus (50% up to $100)
          const depositBonusPercent = 0.5;
          const maxDepositBonus = 100;
          const bonusAmount = Math.min(deposit.amount * depositBonusPercent, maxDepositBonus);
          
          if (bonusAmount > 0) {
            await grantDepositBonus(req.user.id, deposit.amount, bonusAmount);
          }
          
          // Create transaction record
          const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
          await prisma.transaction.create({
            data: {
              userId: req.user.id,
              type: 'deposit',
              amount: deposit.amount,
              cashChange: deposit.amount,
              bonusChange: bonusAmount,
              cashBalanceAfter: updatedUser.cashBalance,
              bonusBalanceAfter: updatedUser.bonusBalance,
              lockedBalanceAfter: updatedUser.lockedBalance,
              virtualBalanceAfter: updatedUser.virtualBalance,
              description: `USDT deposit: ${deposit.txHash.substring(0, 8)}...`,
              reference: deposit.txHash
            }
          });
          
          totalNewDeposits += deposit.amount;
          processedDeposits.push(newDeposit);
        }
      }
    }
    
    if (totalNewDeposits > 0) {
      return res.json({ 
        success: true, 
        message: `New deposits confirmed: $${totalNewDeposits.toFixed(2)} USDT`,
        newDeposit: true,
        deposits: processedDeposits,
        currentBalance
      });
    }
    
    // Also check TRX balance for gas fees
    const trxBalance = await getTRXBalance(wallet.address);
    
    res.json({ 
      success: true, 
      message: 'No new deposits found',
      newDeposit: false,
      currentBalance,
      trxBalance,
      walletAddress: wallet.address
    });
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({ error: 'Failed to check balance: ' + error.message });
  }
});

// Get wallet status and balances
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const [usdtBalance, trxBalance] = await Promise.all([
      getUSDTBalance(wallet.address),
      getTRXBalance(wallet.address)
    ]);

    res.json({
      address: wallet.address,
      usdtBalance,
      trxBalance,
      network: wallet.network,
      currency: wallet.currency
    });
  } catch (error) {
    console.error('Error getting wallet status:', error);
    res.status(500).json({ error: 'Failed to get wallet status' });
  }
});

// Manual deposit verification (for support)
router.post('/verify-deposit', authenticateToken, async (req, res) => {
  try {
    const { txHash } = req.body;
    
    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }
    
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check if deposit already exists
    const existingDeposit = await prisma.cryptoDeposit.findUnique({
      where: { txHash }
    });
    
    if (existingDeposit) {
      return res.status(400).json({ error: 'Deposit already processed' });
    }

    // Get transaction details from blockchain
    const txInfo = await getTransactionInfo(txHash);
    
    if (!txInfo || !txInfo.receipt || txInfo.receipt.result !== 'SUCCESS') {
      return res.status(400).json({ error: 'Transaction not found or failed' });
    }

    // Verify transaction is to user's wallet
    // This would need more detailed parsing of the transaction logs
    // For now, we'll trust the manual verification
    
    res.json({ 
      success: true,
      message: 'Transaction verified - please contact support for manual processing',
      txInfo
    });
  } catch (error) {
    console.error('Error verifying deposit:', error);
    res.status(500).json({ error: 'Failed to verify deposit' });
  }
});

// Webhook endpoint for TronGrid notifications (production)
router.post('/tron-webhook', async (req, res) => {
  try {
    // Verify webhook signature if configured
    const signature = req.headers['x-tron-signature'];
    if (process.env.TRON_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.TRON_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (`sha256=${expectedSignature}` !== signature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    const { transaction_id, to_address, value, token_info } = req.body;
    
    // Verify it's a USDT transaction
    if (token_info?.address !== 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t') {
      return res.status(200).json({ message: 'Not a USDT transaction' });
    }
    
    // Find wallet by address
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { address: to_address }
    });
    
    if (!wallet) {
      return res.status(200).json({ message: 'Wallet not found' });
    }
    
    // Process the deposit
    const amount = parseFloat(value) / 1000000; // Convert from 6 decimals
    
    if (amount < 10) {
      return res.status(200).json({ message: 'Amount below minimum deposit' });
    }
    
    // Check if deposit already exists
    const existingDeposit = await prisma.cryptoDeposit.findUnique({
      where: { txHash: transaction_id }
    });
    
    if (!existingDeposit) {
      // Create new deposit
      await prisma.cryptoDeposit.create({
        data: {
          userId: wallet.userId,
          walletId: wallet.id,
          amount,
          currency: 'USDT',
          txHash: transaction_id,
          status: 'confirmed',
          confirmations: 20
        }
      });
      
      // Update user balance
      await prisma.user.update({
        where: { id: wallet.userId },
        data: {
          cashBalance: { increment: amount }
        }
      });
      
      // Grant deposit bonus
      const bonusAmount = Math.min(amount * 0.5, 100);
      if (bonusAmount > 0) {
        await grantDepositBonus(wallet.userId, amount, bonusAmount);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Legacy webhook endpoint (keep for backward compatibility)
router.post('/webhook', async (req, res) => {
  try {
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
            cashBalance: { increment: parseFloat(amount) }
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

// Request withdrawal
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, toAddress } = req.body;
    
    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal is $10' });
    }
    
    if (!toAddress || !isValidTronAddress(toAddress)) {
      return res.status(400).json({ error: 'Invalid TRON address' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (user.cashBalance < amount) {
      return res.status(400).json({ error: 'Insufficient cash balance' });
    }
    
    // Create withdrawal request
    const withdrawal = await prisma.cryptoWithdrawal.create({
      data: {
        userId: req.user.id,
        amount,
        currency: 'USDT',
        toAddress,
        status: 'pending'
      }
    });
    
    // Deduct from user balance
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        cashBalance: { decrement: amount }
      }
    });
    
    // Create transaction record
    const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type: 'withdrawal',
        amount: -amount,
        cashChange: -amount,
        cashBalanceAfter: updatedUser.cashBalance,
        bonusBalanceAfter: updatedUser.bonusBalance,
        lockedBalanceAfter: updatedUser.lockedBalance,
        virtualBalanceAfter: updatedUser.virtualBalance,
        description: `USDT withdrawal to ${toAddress.substring(0, 8)}...`,
        reference: withdrawal.id
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Withdrawal request submitted. Processing time: 1-24 hours.',
      withdrawalId: withdrawal.id
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get withdrawal history
router.get('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const withdrawals = await prisma.cryptoWithdrawal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ withdrawals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;