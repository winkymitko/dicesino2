import TronWeb from 'tronweb';
import crypto from 'crypto';

// TRON configuration
const TRON_GRID_API = 'https://api.trongrid.io';
const tronWeb = new TronWeb({
  fullHost: TRON_GRID_API,
  privateKey: process.env.TRON_MASTER_PRIVATE_KEY || '0'.repeat(64)
});

// Contract addresses on TRON
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDC_CONTRACT = 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';

// Generate TRON wallet
export function generateTronWallet() {
  try {
    const account = tronWeb.createAccount();
    return {
      address: account.address.base58,
      privateKey: account.privateKey
    };
  } catch (error) {
    console.error('TRON wallet generation failed:', error);
    throw new Error('Failed to generate TRON wallet');
  }
}

// Validate TRON address
export function isValidTronAddress(address) {
  try {
    return tronWeb.isAddress(address);
  } catch {
    return false;
  }
}

// Get USDT balance
export async function getUSDTBalance(address) {
  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const balance = await contract.balanceOf(address).call();
    return parseFloat(tronWeb.fromSun(balance)) / 1000000; // USDT has 6 decimals
  } catch (error) {
    console.error('Failed to get USDT balance:', error);
    return 0;
  }
}

// Get USDC balance
export async function getUSDCBalance(address) {
  try {
    const contract = await tronWeb.contract().at(USDC_CONTRACT);
    const balance = await contract.balanceOf(address).call();
    return parseFloat(tronWeb.fromSun(balance)) / 1000000; // USDC has 6 decimals
  } catch (error) {
    console.error('Failed to get USDC balance:', error);
    return 0;
  }
}

// Get TRX balance
export async function getTRXBalance(address) {
  try {
    const balance = await tronWeb.trx.getBalance(address);
    return parseFloat(tronWeb.fromSun(balance));
  } catch (error) {
    console.error('Failed to get TRX balance:', error);
    return 0;
  }
}

// Send TRX for gas
export async function sendTRXForGas(toAddress, amount) {
  try {
    const transaction = await tronWeb.trx.sendTransaction(toAddress, tronWeb.toSun(amount));
    return transaction;
  } catch (error) {
    console.error('Failed to send TRX for gas:', error);
    throw error;
  }
}

// Send USDT
export async function sendUSDT(privateKey, toAddress, amount) {
  try {
    const tempTronWeb = new TronWeb({
      fullHost: TRON_GRID_API,
      privateKey
    });
    
    const contract = await tempTronWeb.contract().at(USDT_CONTRACT);
    const result = await contract.transfer(toAddress, amount * 1000000).send(); // 6 decimals
    return { txid: result };
  } catch (error) {
    console.error('Failed to send USDT:', error);
    throw error;
  }
}

// Send USDC
export async function sendUSDC(privateKey, toAddress, amount) {
  try {
    const tempTronWeb = new TronWeb({
      fullHost: TRON_GRID_API,
      privateKey
    });
    
    const contract = await tempTronWeb.contract().at(USDC_CONTRACT);
    const result = await contract.transfer(toAddress, amount * 1000000).send(); // 6 decimals
    return { txid: result };
  } catch (error) {
    console.error('Failed to send USDC:', error);
    throw error;
  }
}

// Check for new deposits
export async function checkNewDeposits(address, currency, lastTimestamp) {
  try {
    const contractAddress = currency === 'USDT' ? USDT_CONTRACT : USDC_CONTRACT;
    
    // Get recent transactions
    const response = await fetch(`${TRON_GRID_API}/v1/accounts/${address}/transactions/trc20?limit=50&contract_address=${contractAddress}`);
    const data = await response.json();
    
    if (!data.data) return [];
    
    const deposits = [];
    for (const tx of data.data) {
      if (tx.to === address && tx.block_timestamp > lastTimestamp * 1000) {
        deposits.push({
          txHash: tx.transaction_id,
          amount: parseFloat(tx.value) / 1000000, // Convert from 6 decimals
          confirmations: 1, // Assume confirmed if in API
          timestamp: tx.block_timestamp
        });
      }
    }
    
    return deposits;
  } catch (error) {
    console.error('Failed to check new deposits:', error);
    return [];
  }
}

// Encryption functions
export function encryptPrivateKey(privateKey) {
  const key = process.env.ENCRYPTION_KEY || 'default-key';
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptPrivateKey(encryptedKey) {
  const key = process.env.ENCRYPTION_KEY || 'default-key';
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}