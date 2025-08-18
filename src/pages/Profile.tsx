import React, { useState, useEffect } from 'react';
import { User, Trophy, History, Wallet, Users, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type GameRound = {
  id: string;
  roundNumber: number;
  points: number;
  multiplier: number;
  potBefore: number;
  potAfter: number;
  createdAt: string;
};

type Game = {
  id: string;
  createdAt: string;
  stake: number;
  totalPot: number;
  finalPot?: number | null;
  status: 'active' | 'cashed_out' | 'lost';
  rounds: GameRound[];
};

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [gameHistory, setGameHistory] = useState<Game[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<any>({});
  const [referralLink, setReferralLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<{[key: string]: boolean}>({});
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Stats shown in UI
  const [lastStrike, setLastStrike] = useState<number>(0);
  const [bestStrike, setBestStrike] = useState<number>(0);
  const [totalSuccessfulRolls, setTotalSuccessfulRolls] = useState<number>(0);
  const [totalGames, setTotalGames] = useState<number>(0);
  
  // DiceBattle stats
  const [battleStats, setBattleStats] = useState<any>({});

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    if (user.isAffiliate) {
      fetchAffiliateStats();
      generateReferralLink();
    } else {
      fetchGameHistory();
    }
  }, [user]);

  const fetchAffiliateStats = async () => {
    try {
      const response = await fetch('/api/affiliate/stats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAffiliateStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch affiliate stats:', error);
    }
  };

  const generateReferralLink = async () => {
    try {
      const response = await fetch('/api/affiliate/link', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setReferralLink(data.link);
      }
    } catch (error) {
      console.error('Failed to generate referral link:', error);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const response = await fetch('/api/games/history', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGameHistory(data.games || []);
      }
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }

    // Fetch ALL-TIME stats for the user
    try {
      const statsRes = await fetch('/api/games/stats', { credentials: 'include' });
      if (statsRes.ok) {
        const s = await statsRes.json();
        setLastStrike(s.lastStrike ?? 0);
        setBestStrike(s.bestStrike ?? 0);
        setTotalSuccessfulRolls(s.totalSuccessfulRolls ?? 0);
        setTotalGames(s.totalGames ?? 0);
      } else {
        setLastStrike(0);
        setBestStrike(0);
        setTotalSuccessfulRolls(0);
        setTotalGames(0);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
      setLastStrike(0);
      setBestStrike(0);
      setTotalSuccessfulRolls(0);
      setTotalGames(0);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        await refreshUser?.();
      } else {
        console.error('Failed to save profile');
      }
    } catch (e) {
      console.error('Save error', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);
    try {
      console.log('Sending password change request:', { currentPassword: '***', newPassword: '***' });
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      console.log('Response status:', res.status);
      const responseData = await res.json();
      console.log('Response data:', responseData);
      
      if (res.ok) {
        setPasswordSuccess(responseData.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(responseData.error || 'Failed to change password');
      }
    } catch (e) {
      console.error('Password change error', e);
      setPasswordError('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  // Affiliate Dashboard
  if (user.isAffiliate) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center space-x-3 mb-8">
          <Users className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="px-4 py-3 bg-black/30 border border-white/20 rounded-lg">
                    {user.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Your name"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 hover:from-blue-400 hover:to-blue-200 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-all"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold mb-4">Your Referral Link</h3>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                >
                  {linkCopied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              {linkCopied && (
                <p className="text-green-400 text-sm">Link copied to clipboard!</p>
              )}
              
              {/* Payout Wallet */}
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-bold text-blue-400 mb-2">💳 Payout Wallet</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add your TRON wallet address for commission payouts.
                </p>
                <div className="flex space-x-2">
                  <input
                    id="payout-wallet-input"
                    type="text"
                    placeholder="Enter TRON address (TRC20)"
                    defaultValue={affiliateStats.payoutWallet || ''}
                    className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                  <button 
                    onClick={async () => {
                      const walletInput = document.getElementById('payout-wallet-input') as HTMLInputElement;
                      const wallet = walletInput?.value?.trim();
                      
                      if (!wallet) {
                        alert('Please enter a wallet address');
                        return;
                      }
                      
                      try {
                        const response = await fetch('/api/affiliate/save-wallet', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ wallet })
                        });
                        
                        if (response.ok) {
                          alert('Payout wallet saved successfully!');
                          fetchAffiliateStats();
                        } else {
                          const error = await response.json();
                          alert(error.error);
                        }
                      } catch (error) {
                        alert('Failed to save wallet address');
                      }
                    }}
                    className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    Save
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  ⚠️ Make sure this is a valid TRON (TRC20) address for USDT payouts
                </div>
              </div>
            </div>
          </div>

          {/* Affiliate Stats */}
          <div className="md:col-span-2 space-y-6">
            {/* Overview Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold mb-6">Your Affiliate Performance</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{affiliateStats.totalReferrals || 0}</div>
                  <div className="text-sm text-gray-400">Total Referrals</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    ${(affiliateStats.totalCommissionEarned || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">Commission Earned</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">${(affiliateStats.pendingCommission || 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-400">Pending</div>
                </div>
                <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">${(affiliateStats.currentPeriodCommission || 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-400">Current Period</div>
                </div>
              </div>
              
              {/* Current Period Info */}
              {affiliateStats.currentPeriod && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h4 className="font-bold text-green-400 mb-2">📅 Current Period ({affiliateStats.payoutPeriod})</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-400 font-bold">
                        {new Date(affiliateStats.currentPeriod.periodStart).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400">Period Start</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-bold">
                        {new Date(affiliateStats.currentPeriod.periodEnd).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400">Period End</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-bold">
                        ${(affiliateStats.currentPeriod.totalProfit || 0).toFixed(2)}
                      </div>
                      <div className="text-gray-400">Total Profit</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payout History */}
            {affiliateStats.payoutPeriods && affiliateStats.payoutPeriods.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-bold mb-4">Payout History</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {affiliateStats.payoutPeriods.map((period: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          Profit: ${(period.totalProfit || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400">
                          ${(period.commission || 0).toFixed(2)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          period.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                          period.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {period.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referral Details */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold mb-4">Your Referrals</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {affiliateStats.referrals && affiliateStats.referrals.length > 0 ? (
                  affiliateStats.referrals.map((referral: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                      <div>
                        <div className="font-medium">{referral.email}</div>
                        <div className="text-sm text-gray-400">
                          Joined: {new Date(referral.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-blue-400 space-y-1">
                          <div>Deposited: ${(referral.totalDeposited || 0).toFixed(2)}</div>
                          <div>Withdrawn: ${(referral.totalWithdrawn || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${(referral.casinoProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(referral.casinoProfit || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">Casino Profit</div>
                        <div className="text-yellow-400 font-bold text-sm">
                          ${(referral.commissionEarned || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">Your Commission</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No referrals yet. Share your referral link to start earning!
                  </div>
                )}
              </div>
            </div>
            
            {/* Commission Rate Display */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Your Commission Rate</h3>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {(user.affiliateCommission || 0).toFixed(1)}%
              </div>
              <p className="text-gray-400 text-sm">
                You earn {(user.affiliateCommission || 0).toFixed(1)}% commission on casino profits from your referrals
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="px-4 py-3 bg-black/30 border border-white/20 rounded-lg">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-gray-400">
                @{user.username || user.email.split('@')[0]}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                placeholder="+359..."
              />
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          </div>

          {/* Change Password */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold mb-6">Change Password</h2>

            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-4">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
              >
                {passwordLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 space-y-6">
          {/* Top Up Button */}
          <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6 text-center">
            <h3 className="text-lg font-bold mb-2 text-green-400">💰 Need More Real Money?</h3>
            <p className="text-gray-300 text-sm mb-4">Top up your account with USDT and start playing with real money!</p>
            <div className="flex space-x-4 justify-center">
              <Link
                to="/topup"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                💳 Top Up
              </Link>
              <button
                onClick={() => window.location.href = '/topup'}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                💸 Withdraw
              </button>
            </div>
          </div>

          {/* Balances */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Wallet className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-bold">Wallet Breakdown</h2>
            </div>

            <div className="space-y-4">
              {/* Main Balance Display */}
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-3xl font-bold text-yellow-400">
                  ${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Main Balance</div>
              </div>
              
              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-lg font-bold text-green-400">
                    ${(user.cashBalance || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">💰 Cash</div>
                  <div className="text-xs text-gray-500">Withdrawable</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">
                    ${(user.bonusBalance || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">🎁 Bonus</div>
                  <div className="text-xs text-gray-500">Play-only</div>
                </div>
                <div className="text-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="text-lg font-bold text-orange-400">
                    ${(user.lockedBalance || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">🔒 Locked</div>
                  <div className="text-xs text-gray-500">Pending WR</div>
                </div>
              </div>
              
              {/* Virtual Balance (Separate) */}
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  ${(user.virtualBalance || 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">🎮 Virtual (Demo)</div>
              </div>
              
              {/* Wagering Progress */}
              {(user.activeWageringRequirement || 0) > 0 && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-sm font-bold text-blue-400 mb-2">Wagering Progress</div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, ((user.currentWageringProgress || 0) / (user.activeWageringRequirement || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ${(user.currentWageringProgress || 0).toFixed(2)} / ${(user.activeWageringRequirement || 0).toFixed(2)} wagered
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Complete wagering to unlock ${(user.lockedBalance || 0).toFixed(2)} to cash
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Trophy className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-bold">BarboDice Statistics</h2>
            </div>

            {/* Four tiles as requested */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">{lastStrike}</div>
                <div className="text-gray-400">Last Strike</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">{bestStrike}</div>
                <div className="text-gray-400">Best Strike</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{totalSuccessfulRolls}</div>
                <div className="text-gray-400">Total Successful Rolls</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{totalGames}</div>
                <div className="text-gray-400">Total Games</div>
              </div>
            </div>
          </div>
          
          {/* DiceBattle Statistics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Trophy className="h-6 w-6 text-red-500" />
              <h2 className="text-2xl font-bold">DiceBattle Statistics</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{battleStats.totalBattles || 0}</div>
                <div className="text-gray-400">Total Battles</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{battleStats.winRate || '0.0'}%</div>
                <div className="text-gray-400">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{battleStats.wonBattles || 0}</div>
                <div className="text-gray-400">Victories</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">{battleStats.tiedBattles || 0}</div>
                <div className="text-gray-400">Ties</div>
              </div>
            </div>
            
            {/* Battle History */}
            {battleStats.battleHistory && battleStats.battleHistory.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-4 text-center text-red-400">Battle Records vs Opponents</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {battleStats.battleHistory.map((battle: any, index: number) => (
                    <div key={index} className="bg-black/30 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-white text-lg">{battle.opponent}</div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          battle.result === 'won' ? 'bg-green-500/20 text-green-400' :
                          battle.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          Last: {battle.result === 'won' ? 'Win' : battle.result === 'lost' ? 'Loss' : 'Tie'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-green-500/10 rounded p-2">
                          <div className="text-lg font-bold text-green-400">{battle.opponentRecord?.wins || 0}</div>
                          <div className="text-xs text-gray-400">Wins</div>
                        </div>
                        <div className="bg-red-500/10 rounded p-2">
                          <div className="text-lg font-bold text-red-400">{battle.opponentRecord?.losses || 0}</div>
                          <div className="text-xs text-gray-400">Losses</div>
                        </div>
                        <div className="bg-yellow-500/10 rounded p-2">
                          <div className="text-lg font-bold text-yellow-400">{battle.opponentRecord?.ties || 0}</div>
                          <div className="text-xs text-gray-400">Ties</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-sm text-gray-300">
                          Total Battles: {(battle.opponentRecord?.wins || 0) + (battle.opponentRecord?.losses || 0) + (battle.opponentRecord?.ties || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;