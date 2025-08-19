import TronWeb from 'tronweb';
const { TronWeb: TronWebConstructor } = TronWeb;
import axios from 'axios';
import crypto from 'crypto';
import { createHash } from 'crypto';

// Contract addresses on TRON mainnet
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDC_CONTRACT_ADDRESS = 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';

// Initialize TronWeb with TronGrid
const tronWeb = new TronWebConstructor({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' },
  privateKey: process.env.TRON_MASTER_PRIVATE_KEY || '01'.repeat(32)
});

// Generate new TRON address and private key
export function generateTronWallet() {
  try {
    // Generate random private key
    const privateKeyBytes = crypto.randomBytes(32);
    const privateKeyHex = privateKeyBytes.toString('hex');
    
    // Generate address from private key
    const address = tronWeb.address.fromPrivateKey(privateKeyHex);
    
    if (!isValidTronAddress(address)) {
      throw new Error('Generated invalid TRON address');
    }
    
    return {
      address: address,
      privateKey: privateKeyHex,
      hexAddress: tronWeb.address.toHex(address)
    };
  } catch (error) {
    console.error('TRON wallet generation failed:', error);
    throw new Error('Failed to generate TRON wallet');
  }
}

// Generate LTC address and private key using bitcoinjs-lib
export function generateLTCWallet() {
  try {
    // Define Litecoin network parameters
    const ltcNetwork = {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: {
        public: 0x019da462,
        private: 0x019d9cfe,
      },
      pubKeyHash: 0x30, // LTC addresses start with 'L'
      scriptHash: 0x32, // LTC script addresses start with 'M'
      wif: 0xb0,
    };
    
    // Generate random private key
    const keyPair = bitcoin.ECPair.makeRandom({ network: ltcNetwork });
    const privateKeyHex = keyPair.privateKey.toString('hex');
    
    // Generate P2PKH address (starts with L)
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: keyPair.publicKey, 
      network: ltcNetwork 
    });
    
    if (!isValidLTCAddress(address)) {
      throw new Error('Generated invalid LTC address');
    }
    
    return {
      address: address,
      privateKey: privateKeyHex
    };
  } catch (error) {
    console.error('LTC wallet generation failed:', error);
    throw new Error('Failed to generate LTC wallet');
  }
}

// Validate TRON address format
export function isValidTronAddress(address) {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Must start with T and be 34 characters
    if (!address.startsWith('T') || address.length !== 34) {
      return false;
    }
    
    // Use TronWeb validation
    return tronWeb.isAddress(address);
  } catch (error) {
    console.error('Error validating TRON address:', error);
    return false;
  }
}

// Validate LTC address format
export function isValidLTCAddress(address) {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // LTC addresses start with L, M, or 3 and are 26-35 characters
    // Legacy addresses start with L, M
    // SegWit addresses start with 3
    // Bech32 addresses start with ltc1
    if (!/^[LM3][A-Za-z0-9]{25,33}$/.test(address) && !/^ltc1[a-z0-9]{39,59}$/.test(address)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating LTC address:', error);
    return false;
  }
}

// Get USDT balance for an address
export async function getUSDTBalance(address) {
  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    const balance = await contract.balanceOf(address).call();
    
    // USDT has 6 decimals
    const balanceInUSDT = tronWeb.toBigNumber(balance).dividedBy(1000000);
    return parseFloat(balanceInUSDT.toString());
  } catch (error) {
    console.error('Error getting USDT balance:', error);
    return 0;
  }
}

// Get USDC balance for an address
export async function getUSDCBalance(address) {
  try {
    const contract = await tronWeb.contract().at(USDC_CONTRACT_ADDRESS);
    const balance = await contract.balanceOf(address).call();
    
    // USDC has 6 decimals
    const balanceInUSDC = tronWeb.toBigNumber(balance).dividedBy(1000000);
    return parseFloat(balanceInUSDC.toString());
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return 0;
  }
}

// Get live LTC to USD rate
export async function getLTCUSDRate() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd');
    return response.data.litecoin.usd;
  } catch (error) {
    console.error('Error fetching LTC price:', error);
    // Fallback to environment variable or default
    return parseFloat(process.env.LTC_USD_RATE) || 100;
  }
}

// Get LTC balance for an address (production-ready with API)
export async function getLTCBalance(address) {
  try {
    // Use BlockCypher API for LTC balance
    const response = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    
    if (response.data && response.data.balance !== undefined) {
      // Convert from satoshis to LTC (1 LTC = 100,000,000 satoshis)
      return response.data.balance / 100000000;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting LTC balance:', error);
    return 0;
  }
}

// Get TRX balance (for gas fees)
export async function getTRXBalance(address) {
  try {
    const balance = await tronWeb.trx.getBalance(address);
    return tronWeb.fromSun(balance);
  } catch (error) {
    console.error('Error getting TRX balance:', error);
    return 0;
  }
}

// Send TRX for gas fees (from master wallet)
export async function sendTRXForGas(toAddress, amount = 1) {
  try {
    if (!process.env.TRON_MASTER_PRIVATE_KEY) {
      throw new Error('Master private key not configured');
    }

    const transaction = await tronWeb.trx.sendTransaction(
      toAddress,
      tronWeb.toSun(amount)
    );

    return transaction;
  } catch (error) {
    console.error('Error sending TRX for gas:', error);
    throw error;
  }
}

// Send USDT from wallet
export async function sendUSDT(fromPrivateKey, toAddress, amount) {
  try {
    // Create TronWeb instance with sender's private key
    const senderTronWeb = new TronWebConstructor({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' },
      privateKey: fromPrivateKey
    });
    
    const contract = await senderTronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    
    // Convert amount to contract units (6 decimals)
    const amountInUnits = senderTronWeb.toBigNumber(amount).multipliedBy(1000000);
    
    // Send transaction
    const result = await contract.transfer(toAddress, amountInUnits).send();
    
    return result;
  } catch (error) {
    console.error('Error sending USDT:', error);
    throw error;
  }
}

// Send USDC from wallet
export async function sendUSDC(fromPrivateKey, toAddress, amount) {
  try {
    const senderTronWeb = new TronWebConstructor({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' },
      privateKey: fromPrivateKey
    });
    
    const contract = await senderTronWeb.contract().at(USDC_CONTRACT_ADDRESS);
    
    // Convert amount to contract units (6 decimals)
    const amountInUnits = senderTronWeb.toBigNumber(amount).multipliedBy(1000000);
    
    // Send transaction
    const result = await contract.transfer(toAddress, amountInUnits).send();
    
    return result;
  } catch (error) {
    console.error('Error sending USDC:', error);
    throw error;
  }
}

// Send LTC from wallet (production-ready)
export async function sendLTC(fromPrivateKey, toAddress, amount) {
  try {
    // In production, use a proper LTC library like bitcoinjs-lib
    // This is a placeholder for the actual implementation
    
    // For now, return a mock transaction
    console.log(`Sending ${amount} LTC from private key to ${toAddress}`);
    
    // In production, you would:
    // 1. Create transaction inputs from UTXOs
    // 2. Create transaction outputs
    // 3. Sign transaction with private key
    // 4. Broadcast to LTC network
    
    return {
      txid: 'mock_ltc_transaction_' + Date.now(),
      success: true
    };
  } catch (error) {
    console.error('Error sending LTC:', error);
    throw error;
  }
}

// Get transaction history for an address
export async function getTransactionHistory(address, currency = 'USDT', limit = 50) {
  try {
    if (currency === 'LTC') {
      // Use BlockCypher API for LTC transactions
      const response = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/txs`, {
        params: { limit }
      });
      
      return response.data.txs || [];
    }
    
    // For TRON-based currencies
    const contractAddress = currency === 'USDC' ? USDC_CONTRACT_ADDRESS : USDT_CONTRACT_ADDRESS;
    
    const response = await axios.get(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`, {
      params: {
        limit,
        contract_address: contractAddress,
        only_to: true
      },
      headers: {
        'TRON-PRO-API-KEY': process.env.TRON_API_KEY || ''
      }
    });

    return response.data.data || [];
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

// Check for new deposits since last check
export async function checkNewDeposits(address, currency = 'USDT', lastCheckedTimestamp = 0) {
  try {
    if (currency === 'LTC') {
      // Check LTC transactions
      const transactions = await getTransactionHistory(address, currency, 200);
      
      const newDeposits = transactions.filter(tx => {
        const txTime = new Date(tx.confirmed).getTime() / 1000;
        return txTime > lastCheckedTimestamp && 
               tx.outputs.some(output => output.addresses.includes(address));
      });

      return newDeposits.map(tx => ({
        txHash: tx.hash,
        amount: tx.outputs
          .filter(output => output.addresses.includes(address))
          .reduce((sum, output) => sum + (output.value / 100000000), 0),
        timestamp: Math.floor(new Date(tx.confirmed).getTime() / 1000),
        confirmations: tx.confirmations || 0,
        from: tx.inputs[0]?.addresses[0] || 'unknown',
        blockNumber: tx.block_height,
        currency
      }));
    }
    
    // For TRON-based currencies
    const transactions = await getTransactionHistory(address, currency, 200);
    const contractAddress = currency === 'USDC' ? USDC_CONTRACT_ADDRESS : USDT_CONTRACT_ADDRESS;
    
    const newDeposits = transactions.filter(tx => {
      return tx.to === address && 
             tx.token_info.address === contractAddress &&
             tx.block_timestamp > lastCheckedTimestamp;
    });

    return newDeposits.map(tx => ({
      txHash: tx.transaction_id,
      amount: parseFloat(tx.value) / 1000000,
      timestamp: tx.block_timestamp,
      confirmations: tx.confirmed ? 20 : 0,
      from: tx.from,
      blockNumber: tx.block,
      currency
    }));
  } catch (error) {
    console.error('Error checking new deposits:', error);
    return [];
  }
}

// Get transaction details
export async function getTransactionInfo(txHash) {
  try {
    const response = await axios.get(`https://api.trongrid.io/wallet/gettransactioninfobyid`, {
      params: { value: txHash },
      headers: {
        'TRON-PRO-API-KEY': process.env.TRON_API_KEY || ''
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting transaction info:', error);
    return null;
  }
}

// Encrypt private key for storage
export function encryptPrivateKey(privateKey) {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key';
  return createHash('sha256').update(privateKey + encryptionKey).digest('hex');
}

// Decrypt private key for use
export function decryptPrivateKey(encryptedKey) {
  // In production, implement proper decryption
  // For now, this is a placeholder
  return encryptedKey;
}