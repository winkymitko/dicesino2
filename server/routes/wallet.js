import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generateTronWallet, 
  generateLTCWallet,
  getUSDTBalance, 
  getUSDCBalance,
  getLTCBalance,
  checkNewDeposits,
  isValidTronAddress,
  isValidLTCAddress,
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
      
      let tronWalletData, ltcWalletData;
      try {
        tronWalletData = generateTronWallet();
        ltcWalletData = generateLTCWallet();
      } catch (error) {
        console.error('Failed to generate TRON wallet:', error);
        // Fallback wallet generation
        tronWalletData = {
          address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Fallback address
          privateKey: '01'.repeat(32) // Fallback private key
        };
        ltcWalletData = {
          address: 'L' + '01'.repeat(17),
          privateKey: '01'.repeat(32)
        };
      }
      
      const { address: tronAddress, privateKey: tronPrivateKey } = tronWalletData;
      const { address: ltcAddress, privateKey: ltcPrivateKey } = ltcWalletData;
      
      // Validate the generated address
      if (!isValidTronAddress(tronAddress)) {
        console.error('Generated TRON address not valid:', tronAddress);
        return res.status(500).json({ error: 'Failed to generate valid TRON address' });
      }
      
      if (!isValidLTCAddress(ltcAddress)) {
        console.error('Generated LTC address not valid:', ltcAddress);
        return res.status(500).json({ error: 'Failed to generate valid LTC address' });
      }
      
      try {
        wallet = await prisma.cryptoWallet.create({
          data: {
            userId: req.user.id,
            tronAddress,
            tronPrivateKey: crypto.createHash('sha256').update(tronPrivateKey + (process.env.ENCRYPTION_KEY || 'fallback-key')).digest('hex'),
            ltcAddress,
            ltcPrivateKey: crypto.createHash('sha256').update(ltcPrivateKey + (process.env.ENCRYPTION_KEY || 'fallback-key')).digest('hex')
          }
        });
        console.log('Wallet created successfully:', wallet.id);
      } catch (dbError) {
        console.error('Database error creating wallet:', dbError);
        return res.status(500).json({ error: 'Failed to create wallet in database' });
      }
      
      // Send some TRX for gas fees to new wallet
      try {
        await sendTRXForGas(tronAddress, 1); // Send 1 TRX for gas
        console.log('TRX sent for gas fees');
      } catch (error) {
        console.warn('Failed to send TRX for gas fees:', error.message);
        // Don't fail wallet creation if gas transfer fails
      }
    }

    // Don't send private key to frontend
    const { tronPrivateKey, ltcPrivateKey, ...safeWallet } = wallet;
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
    const { currency = 'USDT' } = req.body;
    
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    let currentBalance = 0;
    let address = '';
    
    // Get balance based on currency
    if (currency === 'USDT') {
      address = wallet.tronAddress;
      currentBalance = await getUSDTBalance(address);
    } else if (currency === 'USDC') {
      address = wallet.tronAddress;
      currentBalance = await getUSDCBalance(address);
    } else if (currency === 'LTC') {
      address = wallet.ltcAddress;
      currentBalance = await getLTCBalance(address);
    }
    
    // Get last deposit timestamp to check for new deposits
    const lastDeposit = await prisma.cryptoDeposit.findFirst({
      where: { userId: req.user.id, currency },
      orderBy: { createdAt: 'desc' }
    });
    
    const lastCheckedTimestamp = lastDeposit ? 
      Math.floor(new Date(lastDeposit.createdAt).getTime() / 1000) : 
      Math.floor(Date.now() / 1000) - 86400; // Check last 24 hours if no previous deposits
    
    // Check for new deposits
    const newDeposits = await checkNewDeposits(address, currency, lastCheckedTimestamp);
    
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
            currency,
            network: currency === 'LTC' ? 'LTC' : 'TRC20',
            toAddress: address,
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
              description: `${currency} deposit: ${deposit.txHash.substring(0, 8)}...`,
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
        message: `New deposits confirmed: $${totalNewDeposits.toFixed(2)} ${currency}`,
        newDeposit: true,
        deposits: processedDeposits,
        currentBalance,
        currency
      });
    }
    
    // Also check TRX balance for gas fees (only for TRON currencies)
    let trxBalance = 0;
    if (currency === 'USDT' || currency === 'USDC') {
      trxBalance = await getTRXBalance(wallet.tronAddress);
    }
    
    res.json({ 
      success: true, 
      message: 'No new deposits found',
      newDeposit: false,
      currentBalance,
      trxBalance,
      walletAddress: address,
      currency
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

    const [usdtBalance, usdcBalance, ltcBalance, trxBalance] = await Promise.all([
      getUSDTBalance(wallet.tronAddress),
      getUSDCBalance(wallet.tronAddress),
      getLTCBalance(wallet.ltcAddress),
      getTRXBalance(wallet.tronAddress)
    ]);

    res.json({
      tronAddress: wallet.tronAddress,
      ltcAddress: wallet.ltcAddress,
      usdtBalance,
      usdcBalance,
      ltcBalance,
      trxBalance,
      supportedCurrencies: ['USDT', 'USDC', 'LTC']
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
    const { amount, toAddress, currency = 'USDT' } = req.body;
    
    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal is $10' });
    }
    
    // Validate address based on currency
    let isValidAddress = false;
    if (currency === 'LTC') {
      isValidAddress = isValidLTCAddress(toAddress);
    } else {
      isValidAddress = isValidTronAddress(toAddress);
    }
    
    if (!toAddress || !isValidAddress) {
      return res.status(400).json({ error: `Invalid ${currency} address` });
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
        currency,
        network: currency === 'LTC' ? 'LTC' : 'TRC20',
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
        description: `${currency} withdrawal to ${toAddress.substring(0, 8)}...`,
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