import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Copy, CheckCircle, RefreshCw, History, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as QRCode from 'qrcode';

const TopUp: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchWalletInfo();
    fetchDeposits();
  }, [user, navigate]);

  const fetchWalletInfo = async () => {
    try {
      const response = await fetch('/api/wallet/info', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWalletAddress(data.address);
        
        // Generate QR code
        const qrUrl = await QRCode.toDataURL(data.address, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
      }
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeposits = async () => {
    try {
      const response = await fetch('/api/wallet/deposits', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits);
      }
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const checkBalance = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/wallet/check-balance', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        await refreshUser();
        await fetchDeposits();
      }
    } catch (error) {
      console.error('Failed to check balance:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading wallet information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center space-x-3 mb-8">
        <Wallet className="h-8 w-8 text-green-500" />
        <h1 className="text-3xl font-bold">Top Up with Crypto</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Wallet Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Your USDT Wallet</h2>
          
          {/* QR Code */}
          <div className="text-center mb-6">
            {qrCodeUrl && (
              <div className="inline-block p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}
          </div>

          {/* Wallet Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">USDT (TRC20) Address</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={walletAddress}
                readOnly
                className="flex-1 px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-sm font-mono"
              />
              <button
                onClick={copyAddress}
                className="p-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
              >
                {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            {copied && (
              <p className="text-green-400 text-sm mt-2">Address copied to clipboard!</p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-yellow-400 mb-2">⚠️ Important Instructions</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Send only USDT (TRC20) to this address</li>
              <li>• Minimum deposit: $10 USDT</li>
              <li>• Deposits are usually confirmed within 5-10 minutes</li>
              <li>• Do not send other cryptocurrencies to this address</li>
            </ul>
          </div>

          {/* Check Balance Button */}
          <button
            onClick={checkBalance}
            disabled={checking}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check for New Deposits'}</span>
          </button>
        </div>

        {/* Balance & History */}
        <div className="space-y-6">
          {/* Current Balance */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold mb-4">Current Balance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  ${user.virtualBalance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Virtual Balance</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  ${user.realBalance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Real Balance</div>
              </div>
            </div>
          </div>

          {/* Deposit History */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <History className="h-5 w-5 text-blue-400" />
              <h3 className="text-xl font-bold">Deposit History</h3>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {deposits.length > 0 ? (
                deposits.map((deposit, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                    <div>
                      <div className="font-medium">${deposit.amount.toFixed(2)} USDT</div>
                      <div className="text-sm text-gray-400">
                        {new Date(deposit.createdAt).toLocaleDateString()} at{' '}
                        {new Date(deposit.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        deposit.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        deposit.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {deposit.status}
                      </div>
                      {deposit.txHash && (
                        <div className="text-xs text-gray-500 mt-1">
                          TX: {deposit.txHash.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No deposits yet</p>
                  <p className="text-sm">Send USDT to your wallet address above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopUp;