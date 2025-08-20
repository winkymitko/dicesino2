import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateTronWallet,
  getUSDTBalance,
  getUSDCBalance,
  checkNewDeposits,
  isValidTronAddress,
  getTRXBalance,
  sendTRXForGas,
  sendUSDT,
  sendUSDC,
  encryptPrivateKey,
  decryptPrivateKey
} from '../utils/tron.js';

const router = express.Router();
const prisma = new PrismaClient();

const MIN_DEPOSIT = { USDT: 10, USDC: 10 };
const MIN_WITHDRAW = { USDT: 10, USDC: 10 };
const TRX_GAS_FUND = 1; // TRX to send to each TRON wallet for gas

// Grant deposit bonus
async function grantDepositBonus(userId, depositAmountUSD, bonusAmountUSD) {
  const wageringMultiplier = 25;
  const wageringRequired = bonusAmountUSD * wageringMultiplier;

  await prisma.bonus.create({
    data: {
      userId,
      amount: bonusAmountUSD,
      type: 'deposit',
      description: `Deposit bonus for $${depositAmountUSD.toFixed(2)} deposit`,
      wageringRequired,
      wageringMultiplier
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      bonusBalance: { increment: bonusAmountUSD },
      activeWageringRequirement: { increment: wageringRequired }
    }
  });
}

// Get or create wallet info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });

    let wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });

    if (!wallet) {
      // Create separate wallets
      const usdt = generateTronWallet();
      const usdc = generateTronWallet();

      if (!isValidTronAddress(usdt.address)) return res.status(500).json({ error: 'Failed to generate valid TRON address (USDT)' });
      if (!isValidTronAddress(usdc.address)) return res.status(500).json({ error: 'Failed to generate valid TRON address (USDC)' });

      wallet = await prisma.cryptoWallet.create({
        data: {
          userId: req.user.id,
          usdtAddress: usdt.address,
          usdtPrivateKey: encryptPrivateKey(usdt.privateKey),
          usdcAddress: usdc.address,
          usdcPrivateKey: encryptPrivateKey(usdc.privateKey)
        }
      });

      // Fund TRX gas to each TRON wallet
      try {
        await Promise.all([
          sendTRXForGas(usdt.address, TRX_GAS_FUND),
          sendTRXForGas(usdc.address, TRX_GAS_FUND)
        ]);
      } catch (e) {
        console.warn('Failed to fund TRX for gas:', e?.message || e);
      }
    }

    const { usdtPrivateKey, usdcPrivateKey, ...safe } = wallet;
    
    return res.json(safe);
  } catch (error) {
    console.error('Wallet info error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get deposits history
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

// Check balance & pull new deposits
router.post('/check-balance', authenticateToken, async (req, res) => {
  try {
    const currency = (req.body && req.body.currency) || 'USDT';

    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    let address = '';
    let currentBalance = 0;

    if (currency === 'USDT') {
      address = wallet.usdtAddress;
      currentBalance = await getUSDTBalance(address);
    } else if (currency === 'USDC') {
      address = wallet.usdcAddress;
      currentBalance = await getUSDCBalance(address);
    } else {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const lastDeposit = await prisma.cryptoDeposit.findFirst({
      where: { userId: req.user.id, currency },
      orderBy: { createdAt: 'desc' }
    });

    const lastCheckedTimestamp = lastDeposit
      ? Math.floor(new Date(lastDeposit.createdAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400;

    const newDeposits = await checkNewDeposits(address, currency, lastCheckedTimestamp);

    let totalUsdCredited = 0;
    const processedDeposits = [];

    for (const dep of newDeposits) {
      if (dep.amount < MIN_DEPOSIT[currency]) continue;

      const exists = await prisma.cryptoDeposit.findUnique({ where: { txHash: dep.txHash } });
      if (exists) continue;

      const created = await prisma.cryptoDeposit.create({
        data: {
          userId: req.user.id,
          walletId: wallet.id,
          amount: dep.amount,
          currency,
          network: 'TRC20',
          toAddress: address,
          txHash: dep.txHash,
          status: dep.confirmations >= 1 ? 'confirmed' : 'pending',
          confirmations: dep.confirmations
        }
      });

      if (dep.confirmations >= 1) {
        const usdToCredit = dep.amount; // 1:1 for USDT/USDC

        await prisma.user.update({
          where: { id: req.user.id },
          data: { cashBalance: { increment: usdToCredit } }
        });

        const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.transaction.create({
          data: {
            userId: req.user.id,
            type: 'deposit',
            amount: usdToCredit,
            cashChange: usdToCredit,
            bonusChange: 0,
            cashBalanceAfter: updatedUser.cashBalance,
            bonusBalanceAfter: updatedUser.bonusBalance,
            lockedBalanceAfter: updatedUser.lockedBalance,
            virtualBalanceAfter: updatedUser.virtualBalance,
            description: `${currency} deposit (${dep.amount} ${currency}) ${dep.txHash.substring(0, 8)}...`,
            reference: dep.txHash
          }
        });

        totalUsdCredited += usdToCredit;
      }

      processedDeposits.push(created);
    }

    const trxBalance = await getTRXBalance(address);

    if (processedDeposits.length > 0) {
      return res.json({
        success: true,
        message: totalUsdCredited > 0 
          ? `New deposits confirmed. USD credited: $${totalUsdCredited.toFixed(2)}`
          : 'New deposits recorded. USD credit pending.',
        newDeposit: true,
        deposits: processedDeposits,
        currentBalance,
        trxBalance,
        currency
      });
    }

    return res.json({
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

// Get wallet status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const [usdtBalance, usdcBalance, usdtTrxBalance, usdcTrxBalance] = await Promise.all([
      getUSDTBalance(wallet.usdtAddress),
      getUSDCBalance(wallet.usdcAddress),
      getTRXBalance(wallet.usdtAddress),
      getTRXBalance(wallet.usdcAddress)
    ]);

    res.json({
      usdtAddress: wallet.usdtAddress,
      usdcAddress: wallet.usdcAddress,
      usdtBalance,
      usdcBalance,
      usdtTrxBalance,
      usdcTrxBalance,
      supportedCurrencies: ['USDT', 'USDC']
    });
  } catch (error) {
    console.error('Error getting wallet status:', error);
    res.status(500).json({ error: 'Failed to get wallet status' });
  }
});

// Withdraw
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, toAddress, currency = 'USDT' } = req.body || {};

    if (!amount || amount < MIN_WITHDRAW[currency]) {
      return res.status(400).json({ error: `Minimum withdrawal is $${MIN_WITHDRAW[currency]}` });
    }

    if (!toAddress || !isValidTronAddress(toAddress)) {
      return res.status(400).json({ error: `Invalid ${currency} address` });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (user.cashBalance < amount) {
      return res.status(400).json({ error: 'Insufficient cash balance' });
    }

    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Create withdrawal record
    const withdrawal = await prisma.cryptoWithdrawal.create({
      data: {
        userId: req.user.id,
        amount,
        currency,
        network: 'TRC20',
        toAddress,
        status: 'processing'
      }
    });

    // Deduct from user balance
    await prisma.user.update({
      where: { id: req.user.id },
      data: { cashBalance: { decrement: amount } }
    });

    try {
      // Send crypto
      let txResult;
      if (currency === 'USDT') {
        const pk = decryptPrivateKey(wallet.usdtPrivateKey);
        txResult = await sendUSDT(pk, toAddress, amount);
      } else {
        const pk = decryptPrivateKey(wallet.usdcPrivateKey);
        txResult = await sendUSDC(pk, toAddress, amount);
      }

      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          txHash: txResult.txid,
          status: 'completed'
        }
      });

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
          description: `${currency} withdrawal (${amount} ${currency}) to ${toAddress.substring(0, 8)}...`,
          reference: withdrawal.id
        }
      });

      return res.json({
        success: true,
        message: `Withdrawal completed! TX: ${txResult.txid}`,
        withdrawalId: withdrawal.id,
        txHash: txResult.txid
      });
    } catch (sendError) {
      console.error('Withdrawal send error:', sendError);

      // Refund
      await prisma.user.update({
        where: { id: req.user.id },
        data: { cashBalance: { increment: amount } }
      });

      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed' }
      });

      return res.status(500).json({ error: 'Withdrawal failed: ' + (sendError?.message || sendError) });
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get withdrawals history
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