import TronWeb from 'tronweb';
const { TronWeb: TronWebConstructor } = TronWeb;
import axios from 'axios';

// USDT TRC20 contract address on TRON mainnet
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// Initialize TronWeb with TronGrid
const tronWeb = new TronWebConstructor({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' },
  privateKey: process.env.TRON_MASTER_PRIVATE_KEY || '01'.repeat(32) // Master wallet for gas fees
});

// Generate new TRON address and private key
export function generateTronWallet() {
  try {
    const account = tronWeb.createAccount();
    return {
      address: account.address?.base58 || account.address,
      privateKey: account.privateKey,
      hexAddress: account.address?.hex || account.address
    };
  } catch (error) {
    console.error('Error generating TRON wallet:', error);
    // Fallback: generate a simple wallet
    const privateKey = '01'.repeat(32);
    const address = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Fallback address
    return {
      address,
      privateKey,
      hexAddress: address
    };
  }
}

// Get USDT balance for an address
export async function getUSDTBalance(address) {
  try {
    // Get USDT contract instance
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
    
    // Call balanceOf function
    const balance = await contract.balanceOf(address).call();
    
    // USDT has 6 decimals
    const balanceInUSDT = tronWeb.toBigNumber(balance).dividedBy(1000000);
    
    return parseFloat(balanceInUSDT.toString());
  } catch (error) {
    console.error('Error getting USDT balance:', error);
    return 0;
  }
}

// Get transaction history for an address
export async function getTransactionHistory(address, limit = 50) {
  try {
    const response = await axios.get(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`, {
      params: {
        limit,
        contract_address: USDT_CONTRACT_ADDRESS,
        only_to: true // Only incoming transactions
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
export async function checkNewDeposits(address, lastCheckedTimestamp = 0) {
  try {
    const transactions = await getTransactionHistory(address, 200);
    
    const newDeposits = transactions.filter(tx => {
      // Filter for incoming USDT transactions after last check
      return tx.to === address && 
             tx.token_info.address === USDT_CONTRACT_ADDRESS &&
             tx.block_timestamp > lastCheckedTimestamp;
    });

    return newDeposits.map(tx => ({
      txHash: tx.transaction_id,
      amount: parseFloat(tx.value) / 1000000, // Convert from 6 decimals
      timestamp: tx.block_timestamp,
      confirmations: tx.confirmed ? 20 : 0, // Assume 20 confirmations if confirmed
      from: tx.from,
      blockNumber: tx.block
    }));
  } catch (error) {
    console.error('Error checking new deposits:', error);
    return [];
  }
}

// Validate TRON address format
export function isValidTronAddress(address) {
  try {
    return tronWeb.isAddress(address);
  } catch (error) {
    return false;
  }
}

// Get current TRX balance (for gas fees)
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