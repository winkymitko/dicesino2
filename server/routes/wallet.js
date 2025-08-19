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

/** ────────────────────────────────────────────────────────────────────────────
 *  Config
 *  - LTC_USD_RATE: set in env (e.g., 85.25). If missing, we won't auto-credit LTC.
 * ──────────────────────────────────────────────────────────────────────────── */
const MIN_DEPOSIT: Record<'USDT'|'USDC'|'LTC', number> = { USDT: 10, USDC: 10, LTC: 0.1 };
const MIN_WITHDRAW: Record<'USDT'|'USDC'|'LTC', number> = { USDT: 10, USDC: 10, LTC: 0.01 };
const TRX_GAS_FUND = 1; // TRX to send to each TRON wallet for gas

function getLtcUsdRate(): number | null {
  const raw = process.env.LTC_USD_RATE;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Bonus
 * ──────────────────────────────────────────────────────────────────────────── */
async function grantDepositBonus(userId: string, depositAmountUSD: number, bonusAmountUSD: number) {
  const wageringMultiplier = 25; // 25x for deposit bonus
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

/** ────────────────────────────────────────────────────────────────────────────
 *  Get or create wallet info (separate USDT, USDC, LTC)
 * ──────────────────────────────────────────────────────────────────────────── */
router.get('/info', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });

    let wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });

    if (!wallet) {
      // Create separate wallets
      const usdt = generateTronWallet();
      const usdc = generateTronWallet();
      const ltc = generateLTCWallet();

      if (!isValidTronAddress(usdt.address)) return res.status(500).json({ error: 'Failed to generate valid TRON address (USDT)' });
      if (!isValidTronAddress(usdc.address)) return res.status(500).json({ error: 'Failed to generate valid TRON address (USDC)' });
      if (!isValidLTCAddress(ltc.address)) return res.status(500).json({ error: 'Failed to generate valid LTC address' });

      wallet = await prisma.cryptoWallet.create({
        data: {
          userId: req.user.id,
          usdtAddress: usdt.address,
          usdtPrivateKey: encryptPrivateKey(usdt.privateKey),
          usdcAddress: usdc.address,
          usdcPrivateKey: encryptPrivateKey(usdc.privateKey),
          ltcAddress: ltc.address,
          ltcPrivateKey: encryptPrivateKey(ltc.privateKey)
        }
      });

      // Fund TRX gas to each TRON wallet (non-fatal if it fails)
      try {
        await Promise.all([
          sendTRXForGas(usdt.address, TRX_GAS_FUND),
          sendTRXForGas(usdc.address, TRX_GAS_FUND)
        ]);
      } catch (e: any) {
        console.warn('Failed to fund TRX for gas:', e?.message || e);
      }
    }

    const { usdtPrivateKey, usdcPrivateKey, ltcPrivateKey, ...safe } = wallet as any;
    return res.json(safe);
  } catch (error: any) {
    console.error('Wallet info error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/** ────────────────────────────────────────────────────────────────────────────
 *  Deposits history
 * ──────────────────────────────────────────────────────────────────────────── */
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

/** ────────────────────────────────────────────────────────────────────────────
 *  Check balance & pull new deposits for a currency
 *  - cryptoDeposit.amount is always in the token's native unit
 *  - We credit cashBalance in USD:
 *     * USDT/USDC: 1 token = $1
 *     * LTC: uses LTC_USD_RATE if set; otherwise we DO NOT auto-credit
 * ──────────────────────────────────────────────────────────────────────────── */
router.post('/check-balance', authenticateToken, async (req, res) => {
  try {
    const { currency = 'USDT' } = req.body as { currency: 'USDT'|'USDC'|'LTC' };

    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    let address = '';
    let currentBalance = 0;

    if (currency === 'USDT') {
      address = wallet.usdtAddress!;
      currentBalance = await getUSDTBalance(address);
    } else if (currency === 'USDC') {
      address = wallet.usdcAddress!;
      currentBalance = await getUSDCBalance(address);
    } else if (currency === 'LTC') {
      address = wallet.ltcAddress!;
      currentBalance = await getLTCBalance(address);
    }

    const lastDeposit = await prisma.cryptoDeposit.findFirst({
      where: { userId: req.user.id, currency },
      orderBy: { createdAt: 'desc' }
    });

    const lastCheckedTimestamp =
      lastDeposit ? Math.floor(new Date(lastDeposit.createdAt).getTime() / 1000)
                  : Math.floor(Date.now() / 1000) - 86400;

    const newDeposits = await checkNewDeposits(address, currency, lastCheckedTimestamp);

    let totalUsdCredited = 0;
    const processedDeposits: any[] = [];

    const ltcRate = currency === 'LTC' ? getLtcUsdRate() : null;

    for (const dep of newDeposits) {
      // Skip below minimums
      if (dep.amount < MIN_DEPOSIT[currency]) continue;

      // Skip if we already have this tx
      const exists = await prisma.cryptoDeposit.findUnique({ where: { txHash: dep.txHash } });
      if (exists) continue;

      // Record the deposit in native units
      const created = await prisma.cryptoDeposit.create({
        data: {
          userId: req.user.id,
          walletId: wallet.id,
          amount: dep.amount,                 // NATIVE token units
          currency,                           // 'USDT' | 'USDC' | 'LTC'
          network: currency === 'LTC' ? 'LTC' : 'TRC20',
          toAddress: address,
          txHash: dep.txHash,
          status: dep.confirmations >= 1 ? 'confirmed' : 'pending',
          confirmations: dep.confirmations
        }
      });

      // Only credit balance on confirmation
      if (dep.confirmations >= 1) {
        let usdToCredit = 0;

        if (currency === 'USDT' || currency === 'USDC') {
          usdToCredit = dep.amount; // 1 token = $1
        } else if (currency === 'LTC') {
          if (ltcRate) {
            usdToCredit = dep.amount * ltcRate;
          } else {
            // No rate configured -> leave credited USD at 0; deposit record exists.
            // (You can later reconcile manually or set LTC_USD_RATE)
            usdToCredit = 0;
          }
        }

        if (usdToCredit > 0) {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { cashBalance: { increment: usdToCredit } }
          });

          // 50% bonus up to $100, based on USD credited
          const bonusAmount = Math.min(usdToCredit * 0.5, 100);
          if (bonusAmount > 0) {
            await grantDepositBonus(req.user.id, usdToCredit, bonusAmount);
          }

          const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
          await prisma.transaction.create({
            data: {
              userId: req.user.id,
              type: 'deposit',
              amount: usdToCredit,                    // USD credited
              cashChange: usdToCredit,                // USD
              bonusChange: Math.min(usdToCredit * 0.5, 100),
              cashBalanceAfter: updatedUser!.cashBalance,
              bonusBalanceAfter: updatedUser!.bonusBalance,
              lockedBalanceAfter: updatedUser!.lockedBalance,
              virtualBalanceAfter: updatedUser!.virtualBalance,
              description: `${currency} deposit (${dep.amount} ${currency}) ${dep.txHash.substring(0, 8)}...`,
              reference: dep.txHash
            }
          });

          totalUsdCredited += usdToCredit;
        }
      }

      processedDeposits.push(created);
    }

    let trxBalance = 0;
    if (currency === 'USDT') trxBalance = await getTRXBalance(wallet.usdtAddress!);
    if (currency === 'USDC') trxBalance = await getTRXBalance(wallet.usdcAddress!);

    if (processedDeposits.length > 0) {
      return res.json({
        success: true,
        message:
          totalUsdCredited > 0
            ? `New deposits confirmed. USD credited: $${totalUsdCredited.toFixed(2)}`
            : `New deposits recorded. USD credit pending${currency === 'LTC' ? ' (set LTC_USD_RATE to auto-credit)' : ''}.`,
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
  } catch (error: any) {
    console.error('Error checking balance:', error);
    res.status(500).json({ error: 'Failed to check balance: ' + error.message });
  }
});

/** ────────────────────────────────────────────────────────────────────────────
 *  Wallet status
 * ──────────────────────────────────────────────────────────────────────────── */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const [usdtBalance, usdcBalance, ltcBalance, usdtTrxBalance, usdcTrxBalance] = await Promise.all([
      getUSDTBalance(wallet.usdtAddress!),
      getUSDCBalance(wallet.usdcAddress!),
      getLTCBalance(wallet.ltcAddress!),
      getTRXBalance(wallet.usdtAddress!),
      getTRXBalance(wallet.usdcAddress!)
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

/** ────────────────────────────────────────────────────────────────────────────
 *  Withdraw
 *  - Request amounts are in native token units.
 *  - We deduct user's cashBalance in USD (USDT/USDC = amount; LTC uses LTC_USD_RATE).
 * ──────────────────────────────────────────────────────────────────────────── */
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, toAddress, currency = 'USDT' } = req.body as {
      amount: number;
      toAddress: string;
      currency: 'USDT'|'USDC'|'LTC';
    };

    if (!amount || amount < MIN_WITHDRAW[currency]) {
      return res.status(400).json({
        error:
          currency === 'LTC'
            ? `Minimum withdrawal is ${MIN_WITHDRAW.LTC} LTC`
            : `Minimum withdrawal is $${MIN_WITHDRAW[currency]}`
      });
    }

    let isValidAddress = false;
    if (currency === 'LTC') isValidAddress = isValidLTCAddress(toAddress);
    else isValidAddress = isValidTronAddress(toAddress);
    if (!toAddress || !isValidAddress) return res.status(400).json({ error: `Invalid ${currency} address` });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(400).json({ error: 'User not found' });

    // Compute USD to deduct
    let usdToDeduct = 0;
    if (currency === 'USDT' || currency === 'USDC') {
      usdToDeduct = amount; // 1 token = $1
    } else {
      const rate = getLtcUsdRate();
      if (!rate) {
        return res.status(400).json({ error: 'LTC_USD_RATE not configured. Cannot compute USD deduction for LTC withdrawal.' });
      }
      usdToDeduct = amount * rate;
    }

    if (user.cashBalance < usdToDeduct) {
      return res.status(400).json({ error: 'Insufficient cash balance' });
    }

    const wallet = await prisma.cryptoWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Create withdrawal record (store token amount)
    const withdrawal = await prisma.cryptoWithdrawal.create({
      data: {
        userId: req.user.id,
        amount, // token units
        currency,
        network: currency === 'LTC' ? 'LTC' : 'TRC20',
        toAddress,
        status: 'processing'
      }
    });

    // Deduct USD from user balance
    await prisma.user.update({
      where: { id: req.user.id },
      data: { cashBalance: { decrement: usdToDeduct } }
    });

    try {
      // Decrypt key + send
      let txResult: any;

      if (currency === 'USDT') {
        const pk = decryptPrivateKey(wallet.usdtPrivateKey!);
        txResult = await sendUSDT(pk, toAddress, amount);
      } else if (currency === 'USDC') {
        const pk = decryptPrivateKey(wallet.usdcPrivateKey!);
        txResult = await sendUSDC(pk, toAddress, amount);
      } else {
        const pk = decryptPrivateKey(wallet.ltcPrivateKey!);
        txResult = await sendLTC(pk, toAddress, amount);
      }

      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          txHash: txResult?.txid || txResult?.transaction_id || null,
          status: 'completed'
        }
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'withdrawal',
          amount: -usdToDeduct,                  // USD impact on cash balance
          cashChange: -usdToDeduct,
          cashBalanceAfter: updatedUser!.cashBalance,
          bonusBalanceAfter: updatedUser!.bonusBalance,
          lockedBalanceAfter: updatedUser!.lockedBalance,
          virtualBalanceAfter: updatedUser!.virtualBalance,
          description: `${currency} withdrawal (${amount} ${currency}) to ${toAddress.substring(0, 8)}...`,
          reference: withdrawal.id
        }
      });

      return res.json({
        success: true,
        message: `Withdrawal completed! TX: ${txResult?.txid || txResult?.transaction_id || 'n/a'}`,
        withdrawalId: withdrawal.id,
        txHash: txResult?.txid || txResult?.transaction_id || null
      });
    } catch (sendError: any) {
      console.error('Withdrawal send error:', sendError);

      // Refund USD
      await prisma.user.update({
        where: { id: req.user.id },
        data: { cashBalance: { increment: usdToDeduct } }
      });

      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed' }
      });

      return res.status(500).json({ error: 'Withdrawal failed: ' + (sendError?.message || sendError) });
    }
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

/** ────────────────────────────────────────────────────────────────────────────
 *  Withdrawals history
 * ──────────────────────────────────────────────────────────────────────────── */
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
