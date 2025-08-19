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
  sendTRXForGas,
  sendUSDT,
  sendUSDC,
  sendLTC,
  encryptPrivateKey,
  decryptPrivateKey
} from '../utils/tron.js';

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
      // Create separate wallets for each currency
      console.log('Creating new wallets for user:', req.user.id);
      
      try {
        // Generate USDT wallet
        const usdtWallet = generateTronWallet();
        // Generate USDC wallet (separate from USDT)
        const usdcWallet = generateTronWallet();
        // Generate LTC wallet
        const ltcWallet = generateLTCWallet();
        
        // Validate all addresses
        if (!isValidTronAddress(usdtWallet.address) || 
            !isValidTronAddress(usdcWallet.address) || 
            !isValidLTCAddress(ltcWallet.address)) {
          throw new Error('Generated invalid addresses');
        }
        
        // Create wallet record with all three currencies
        wallet = await prisma.cryptoWallet.create({
          data: {
            userId: req.user.id,
            usdtAddress: usdtWallet.address,
            usdtPrivateKey: encryptPrivateKey(usdtWallet.privateKey),
            usdcAddress: usdcWallet.address,
            usdcPrivateKey: encryptPrivateKey(usdcWallet.privateKey),
            ltcAddress: ltcWallet.address,
            ltcPrivateKey: encryptPrivateKey(ltcWallet.privateKey)
          }
        });
        
        console.log('Wallets created successfully:', wallet.id);
        
        // Send TRX for gas fees to both TRON wallets
        try {
          await sendTRXForGas(usdtWallet.address, 1);
          await sendTRXForGas(usdcWallet.address, 1);
          console.log('TRX sent for gas fees to both wallets');
        } catch (error) {
          console.warn('Failed to send TRX for gas fees:', error.message);
        }
        
      } catch (error) {
        console.error('Failed to generate wallets:', error);
        return res.status(500).json({ error: 'Failed to generate wallets' });
      }
    }

    // Don't send private keys to frontend
    const { usdtPrivateKey, usdcPrivateKey, ltcPrivateKey, ...safeWallet } = wallet;
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

// Check balance for specific currency
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
    
    // Get balance and address based on currency
    if (currency === 'USDT') {
      address = wallet.usdtAddress;
      currentBalance = await getUSDTBalance(address);
    } else if (currency === 'USDC') {
      address = wallet.usdcAddress;
      currentBalance = await getUSDCBalance(address);
    } else if (currency === 'LTC') {
      address = wallet.ltcAddress;
      currentBalance = await getLTCBalance(address);
    }
    
    // Get last deposit timestamp
    const lastDeposit = await prisma.cryptoDeposit.findFirst({
      where: { userId: req.user.id, currency },
      orderBy: { createdAt: 'desc' }
    });
    
    const lastCheckedTimestamp = lastDeposit ? 
      Math.floor(new Date(lastDeposit.createdAt).getTime() / 1000) : 
      Math.floor(Date.now() / 1000) - 86400;
    
    // Check for new deposits
    const newDeposits = await checkNewDeposits(address, currency, lastCheckedTimestamp);
    
    let totalNewDeposits = 0;
    let processedDeposits = [];
    
    for (const deposit of newDeposits) {
      // Check if transaction already exists
      const existingDeposit = await prisma.cryptoDeposit.findUnique({
        where: { txHash: deposit.txHash }
      });
      
      const minDeposit = currency === 'LTC' ? 0.1 : 10;
      
      if (!existingDeposit && deposit.amount >= minDeposit) {
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
          // Convert LTC to USD for balance (approximate rate)
          const usdAmount = currency === 'LTC' ? deposit.amount * 100 : deposit.amount;
          
          // Update user's cash balance
          await prisma.user.update({
            where: { id: req.user.id },
            data: {
              cashBalance: { increment: usdAmount }
            }
          });
          
          // Grant deposit bonus (50% up to $100)
          const bonusAmount = Math.min(usdAmount * 0.5, 100);
          
          if (bonusAmount > 0) {
            await grantDepositBonus(req.user.id, usdAmount, bonusAmount);
          }
          
          // Create transaction record
          const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
          await prisma.transaction.create({
            data: {
              userId: req.user.id,
              type: 'deposit',
              amount: usdAmount,
              cashChange: usdAmount,
              bonusChange: bonusAmount,
              cashBalanceAfter: updatedUser.cashBalance,
              bonusBalanceAfter: updatedUser.bonusBalance,
              lockedBalanceAfter: updatedUser.lockedBalance,
              virtualBalanceAfter: updatedUser.virtualBalance,
              description: `${currency} deposit: ${deposit.txHash.substring(0, 8)}...`,
              reference: deposit.txHash
            }
          });
          
          totalNewDeposits += usdAmount;
          processedDeposits.push(newDeposit);
        }
      }
    }
    
    if (totalNewDeposits > 0) {
      return res.json({ 
        success: true, 
        message: `New deposits confirmed: $${totalNewDeposits.toFixed(2)} from ${currency}`,
        newDeposit: true,
        deposits: processedDeposits,
        currentBalance,
        currency
      });
    }
    
    // Get TRX balance for gas fees (only for TRON currencies)
    let trxBalance = 0;
    if (currency === 'USDT') {
      trxBalance = await getTRXBalance(wallet.usdtAddress);
    } else if (currency === 'USDC') {
      trxBalance = await getTRXBalance(wallet.usdcAddress);
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

// Get wallet status and balances for all currencies
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const [usdtBalance, usdcBalance, ltcBalance, usdtTrxBalance, usdcTrxBalance] = await Promise.all([
      getUSDTBalance(wallet.usdtAddress),
      getUSDCBalance(wallet.usdcAddress),
      getLTCBalance(wallet.ltcAddress),
      getTRXBalance(wallet.usdtAddress),
      getTRXBalance(wallet.usdcAddress)
    ]);

    res.json({
      usdtAddress: wallet.usdtAddress,
      usdcAddress: wallet.usdcAddress,
      ltcAddress: wallet.ltcAddress,
      usdtBalance,
      usdcBalance,
      ltcBalance,
      usdtTrxBalance,
      usdcTrxBalance,
      supportedCurrencies: ['USDT', 'USDC', 'LTC']
    });
  } catch (error) {
    console.error('Error getting wallet status:', error);
    res.status(500).json({ error: 'Failed to get wallet status' });
  }
});

// Request withdrawal
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, toAddress, currency = 'USDT' } = req.body;
    
    const minWithdraw = currency === 'LTC' ? 0.01 : 10;
    if (!amount || amount < minWithdraw) {
      return res.status(400).json({ error: `Minimum withdrawal is ${currency === 'LTC' ? '0.01 LTC' : '$10'}` });
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
    
    // Convert LTC amount to USD for balance check
    const usdAmount = currency === 'LTC' ? amount * 100 : amount;
    
    if (user.cashBalance < usdAmount) {
      return res.status(400).json({ error: 'Insufficient cash balance' });
    }
    
    // Get wallet for withdrawal
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Create withdrawal request
    const withdrawal = await prisma.cryptoWithdrawal.create({
      data: {
        userId: req.user.id,
        amount: usdAmount,
        currency,
        network: currency === 'LTC' ? 'LTC' : 'TRC20',
        toAddress,
        status: 'processing'
      }
    });
    
    // Deduct from user balance
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        cashBalance: { decrement: usdAmount }
      }
    });
    
    // Process withdrawal automatically
    try {
      let txResult;
      
      if (currency === 'USDT') {
        const privateKey = decryptPrivateKey(wallet.usdtPrivateKey);
        txResult = await sendUSDT(privateKey, toAddress, amount);
      } else if (currency === 'USDC') {
        const privateKey = decryptPrivateKey(wallet.usdcPrivateKey);
        txResult = await sendUSDC(privateKey, toAddress, amount);
      } else if (currency === 'LTC') {
        const privateKey = decryptPrivateKey(wallet.ltcPrivateKey);
        txResult = await sendLTC(privateKey, toAddress, amount);
      }
      
      // Update withdrawal with transaction hash
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          txHash: txResult.txid || txResult.transaction_id,
          status: 'completed'
        }
      });
      
      // Create transaction record
      const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'withdrawal',
          amount: -usdAmount,
          cashChange: -usdAmount,
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
        message: `Withdrawal completed! TX: ${txResult.txid || txResult.transaction_id}`,
        withdrawalId: withdrawal.id,
        txHash: txResult.txid || txResult.transaction_id
      });
      
    } catch (sendError) {
      console.error('Withdrawal send error:', sendError);
      
      // Refund user balance
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          cashBalance: { increment: usdAmount }
        }
      });
      
      // Update withdrawal status
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed' }
      });
      
      res.status(500).json({ error: 'Withdrawal failed: ' + sendError.message });
    }
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