import React, { useState, useEffect } from 'react';
import { Shield, Users, TrendingUp, Plus, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>({});
  const [bonusAmount, setBonusAmount] = useState('');
  const [diceGameEdge, setDiceGameEdge] = useState('5.0');
  const [diceBattleEdge, setDiceBattleEdge] = useState('5.0');
  const [diceRouletteEdge, setDiceRouletteEdge] = useState('5.0');
  const [maxBetWhileBonus, setMaxBetWhileBonus] = useState('50');
  const [maxBonusCashout, setMaxBonusCashout] = useState('1000');

  // Bot management state
  const [botNames, setBotNames] = useState<string[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [showBotManager, setShowBotManager] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchStats();
    fetchBotNames();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchBotNames = async () => {
    try {
      const response = await fetch('/api/admin/bot-names', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBotNames(data.botNames);
      }
    } catch (error) {
      console.error('Failed to fetch bot names:', error);
    }
  };

  const addBotName = async () => {
    if (!newBotName.trim()) return;
    
    try {
      const response = await fetch('/api/admin/bot-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newBotName.trim() })
      });
      
      if (response.ok) {
        await fetchBotNames();
        setNewBotName('');
        alert('Bot name added successfully');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to add bot name:', error);
    }
  };

  const removeBotName = async (name: string) => {
    try {
      const response = await fetch('/api/admin/bot-names', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      });
      
      if (response.ok) {
        await fetchBotNames();
        alert('Bot name removed successfully');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to remove bot name:', error);
    }
  };

  const updateSettings = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          diceGameEdge: parseFloat(diceGameEdge),
          diceBattleEdge: parseFloat(diceBattleEdge),
          maxBetWhileBonus: parseFloat(maxBetWhileBonus),
          maxBonusCashout: parseFloat(maxBonusCashout)
        })
      });

      if (response.ok) {
        fetchUsers();
        setSelectedUser(null);
        alert('User settings updated successfully');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to update win chance:', error);
    }
  };

  const addBonus = async (userId: string, amount: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amount
        })
      });

      if (response.ok) {
        fetchUsers();
        alert('Bonus added successfully');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to add bonus:', error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(prev => ({ ...prev, [userId]: data }));
      } else {
        console.error('Failed to fetch user stats:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const toggleUserStats = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userStats[userId]) {
        await fetchUserStats(userId);
      }
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center space-x-3 mb-8">
        <Shield className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
          <div className="text-gray-400">Total Users</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">${(stats.totalRealMoneyDeposited || 0).toFixed(2)}</div>
          <div className="text-gray-400">Total Deposits</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <TrendingUp className="h-8 w-8 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">${(stats.totalCommissionEarned || 0).toFixed(2)}</div>
          <div className="text-gray-400">Casino Profit</div>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Users Management</h2>
          
          {/* Payout Requests Alert */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold text-sm">🚨 Pending Payout Requests</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Check affiliate referral sections for payout requests
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {users.map((user: any) => (
            <div key={user.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-bold">{user.username}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <div>Virtual: ${(user.virtualBalance || 0).toFixed(2)}</div>
                      <div>Real: ${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}</div>
                    </div>
                    
                    {/* Affiliate Stats - Only show if user is affiliate */}
                    {user.isAffiliate && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-bold text-orange-400 text-sm">👥 Affiliate Stats</h5>
                          <div className="text-purple-400 font-bold">{(user.affiliateCommission || 0).toFixed(1)}% Commission</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="text-center">
                            <div className="text-orange-400 font-bold">
                              ${(userStats[user.id]?.realMoney?.casinoProfit || 0) > 0 ? 
                                ((userStats[user.id]?.realMoney?.casinoProfit || 0) * (user.affiliateCommission || 0) / 100).toFixed(2) : 
                                '0.00'}
                            </div>
                            <div className="text-gray-400">Commission Earned</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-400 font-bold">{userStats[user.id]?.affiliateStats?.totalReferrals || 0}</div>
                            <div className="text-gray-400">Total Referrals</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-400 font-bold">{userStats[user.id]?.affiliateStats?.activeReferrals || 0}</div>
                            <div className="text-gray-400">Active Referrals</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Commission Rate Setting - Only show if user is affiliate */}
                    {user.isAffiliate && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-400">Set Rate:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          defaultValue={user.affiliateCommission || 0}
                          className="w-16 px-2 py-1 bg-black/30 border border-white/20 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                          id={`commission-${user.id}`}
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById(`commission-${user.id}`) as HTMLInputElement;
                            const newRate = parseFloat(input.value);
                            if (newRate >= 0 && newRate <= 100) {
                              try {
                                const response = await fetch(`/api/admin/users/${user.id}/commission`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ commission: newRate })
                                });
                                if (response.ok) {
                                  fetchUsers();
                                  alert('Commission rate updated successfully');
                                } else {
                                  const error = await response.json();
                                  alert(error.error || 'Failed to update commission rate');
                                }
                              } catch (error) {
                                console.error('Failed to update commission rate:', error);
                              }
                            }
                          }}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                        >
                          Update
                        </button>
                        
                        {/* Payout Period Setting */}
                        <select
                          defaultValue={userStats[user.id]?.affiliateStats?.payoutPeriod || 'Monthly'}
                          className="px-2 py-1 bg-black/30 border border-white/20 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                          id={`period-${user.id}`}
                        >
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                        </select>
                        <button
                          onClick={async () => {
                            const select = document.getElementById(`period-${user.id}`) as HTMLSelectElement;
                            const newPeriod = select.value;
                            try {
                              const response = await fetch(`/api/affiliate/set-payout-period/${user.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ payoutPeriod: newPeriod })
                              });
                              if (response.ok) {
                                fetchUsers();
                                alert(`Payout period set to ${newPeriod}`);
                              } else {
                                const error = await response.json();
                                alert(error.error || 'Failed to update payout period');
                              }
                            } catch (error) {
                              console.error('Failed to update payout period:', error);
                            }
                          }}
                          className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors"
                        >
                          Set Period
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const amount = prompt('Enter bonus amount:');
                      if (amount && parseFloat(amount) > 0) {
                        addBonus(user.id, parseFloat(amount));
                      }
                    }}
                    className="bg-green-500/20 text-green-400 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                  >
                    💰 Bonus
                  </button>
                  <button
                    onClick={() => toggleUserStats(user.id)}
                    className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    {expandedUser === user.id ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setDiceGameEdge(user.diceGameEdge?.toString() || '5.0');
                      setDiceBattleEdge(user.diceBattleEdge?.toString() || '5.0');
                      setMaxBetWhileBonus(user.maxBetWhileBonus?.toString() || '50');
                      setMaxBonusCashout(user.maxBonusCashout?.toString() || '1000');
                    }}
                    className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded User Stats */}
              {expandedUser === user.id && userStats[user.id] && (
                <div className="border-t border-white/10 p-6 bg-black/20">
                  {/* Only show game stats and wagering for non-affiliates */}
                  {!user.isAffiliate && (
                    <>
                      {/* Wagering Progress */}
                      <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <h5 className="font-bold mb-2 text-blue-400 text-sm">🎯 Bonus Wagering Progress</h5>
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div className="text-center">
                            <div className="text-blue-400 font-bold">${(user.currentWageringProgress || 0).toFixed(2)}</div>
                            <div className="text-gray-400">Progress</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-400 font-bold">${(user.activeWageringRequirement || 0).toFixed(2)}</div>
                            <div className="text-gray-400">Required</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-400 font-bold">
                              {user.activeWageringRequirement > 0 ? 
                                ((user.currentWageringProgress || 0) / user.activeWageringRequirement * 100).toFixed(1) : 0}%
                            </div>
                            <div className="text-gray-400">Complete</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-400 font-bold">${(user.lockedBalance || 0).toFixed(2)}</div>
                            <div className="text-gray-400">Locked</div>
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, user.activeWageringRequirement > 0 ? 
                                ((user.currentWageringProgress || 0) / user.activeWageringRequirement * 100) : 0)}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Game Statistics Toggle */}
                      <div className="mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium">Game Statistics:</span>
                          <button
                            onClick={() => {
                              const currentMode = userStats[user.id].statsMode || 'real';
                              setUserStats(prev => ({
                                ...prev,
                                [user.id]: {
                                  ...prev[user.id],
                                  statsMode: currentMode === 'real' ? 'virtual' : 'real'
                                }
                              }));
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              (userStats[user.id].statsMode || 'real') === 'real' ? 'bg-yellow-600' : 'bg-purple-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                (userStats[user.id].statsMode || 'real') === 'real' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${
                            (userStats[user.id].statsMode || 'real') === 'real' ? 'text-yellow-400' : 'text-purple-400'
                          }`}>
                            {(userStats[user.id].statsMode || 'real') === 'real' ? 'REAL MONEY' : 'VIRTUAL MONEY'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Game Statistics */}
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* BarboDice */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                          <h5 className="font-bold mb-3 text-green-400 text-center">🎲 BarboDice</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.totalGames || 0
                                  : userStats[user.id].virtualStats?.barboDice?.totalGames || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.wins || 0
                                  : userStats[user.id].virtualStats?.barboDice?.wins || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.losses || 0
                                  : userStats[user.id].virtualStats?.barboDice?.losses || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Bets:</span>
                              <span className="font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.totalBets || 0
                                  : userStats[user.id].virtualStats?.barboDice?.totalBets || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Wins:</span>
                              <span className="text-green-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.totalWins || 0
                                  : userStats[user.id].virtualStats?.barboDice?.totalWins || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Loses:</span>
                              <span className="text-red-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.barboDice?.totalLoses || 0
                                  : userStats[user.id].virtualStats?.barboDice?.totalLoses || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* DiceBattle */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <h5 className="font-bold mb-3 text-red-400 text-center">⚔️ DiceBattle</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.totalGames || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.totalGames || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.wins || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.wins || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.losses || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.losses || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ties:</span>
                              <span className="text-yellow-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.ties || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.ties || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Bets:</span>
                              <span className="font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.totalBets || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.totalBets || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Wins:</span>
                              <span className="text-green-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.totalWins || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.totalWins || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Loses:</span>
                              <span className="text-red-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceBattle?.totalLoses || 0
                                  : userStats[user.id].virtualStats?.diceBattle?.totalLoses || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* DiceRoulette */}
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                          <h5 className="font-bold mb-3 text-orange-400 text-center">🎯 DiceRoulette</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.totalGames || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.totalGames || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.wins || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.wins || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400 font-bold">
                                {(userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.losses || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.losses || 0
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Bets:</span>
                              <span className="font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.totalBets || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.totalBets || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Wins:</span>
                              <span className="text-green-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.totalWins || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.totalWins || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Loses:</span>
                              <span className="text-red-400 font-bold">
                                ${((userStats[user.id].statsMode || 'real') === 'real' 
                                  ? userStats[user.id].realStats?.diceRoulette?.totalLoses || 0
                                  : userStats[user.id].virtualStats?.diceRoulette?.totalLoses || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Real Money Overview - Show for all users */}
                  <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-yellow-400 mb-4">💰 Real Money Overview</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          ${(userStats[user.id].realMoney?.totalDeposited || 0).toFixed(2)}
                        </div>
                        <div className="text-gray-400">Total Deposited</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          ${(userStats[user.id].realMoney?.totalWithdrawn || 0).toFixed(2)}
                        </div>
                        <div className="text-gray-400">Total Withdrawn</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          (userStats[user.id].realMoney?.casinoProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${(userStats[user.id].realMoney?.casinoProfit || 0).toFixed(2)}
                        </div>
                        <div className="text-gray-400">Casino Profit</div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-blue-400 mb-4">📊 Transaction History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userStats[user.id].transactions && userStats[user.id].transactions.length > 0 ? (
                        userStats[user.id].transactions.map((tx: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-black/20 rounded text-xs">
                            <div>
                              <span className={`font-bold ${
                                tx.type === 'deposit' ? 'text-green-400' :
                                tx.type === 'withdrawal' ? 'text-red-400' :
                                tx.type === 'bonus_grant' ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}>
                                {tx.type === 'deposit' ? '💳 Deposit' :
                                 tx.type === 'withdrawal' ? '💸 Withdraw' :
                                 tx.type === 'bonus_grant' ? '🎁 Bonus' :
                                 tx.type}
                              </span>
                              <div className="text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${Math.abs(tx.amount).toFixed(2)}</div>
                              <div className="text-gray-500">{tx.description}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-4">No transactions yet</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Settings Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full border border-white/20">
            <h3 className="text-xl font-bold mb-4">Settings: {selectedUser.username}</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">BarboDice Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceGameEdge}
                  onChange={(e) => setDiceGameEdge(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">DiceBattle Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceBattleEdge}
                  onChange={(e) => setDiceBattleEdge(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">DiceRoulette Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceRouletteEdge}
                  onChange={(e) => setDiceRouletteEdge(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Max Bet While Bonus ($)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="1000"
                  value={maxBetWhileBonus}
                  onChange={(e) => setMaxBetWhileBonus(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Max Bonus Cashout ($)</label>
                <input
                  type="number"
                  step="10"
                  min="100"
                  max="10000"
                  value={maxBonusCashout}
                  onChange={(e) => setMaxBonusCashout(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                />
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  onClick={() => updateSettings(selectedUser.id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 rounded-lg transition-all text-sm"
                >
                  Update
                </button>
                
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bot Management */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">DiceBattle Bot Management</h2>
          <button
            onClick={() => setShowBotManager(!showBotManager)}
            className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            {showBotManager ? 'Hide' : 'Manage Bots'}
          </button>
        </div>

        {showBotManager && (
          <div className="space-y-6">
            {/* Add New Bot */}
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">Add New Bot Name</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Enter bot name (e.g., DiceKing, RollMaster)"
                />
                <button
                  onClick={addBotName}
                  disabled={!newBotName.trim()}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg transition-all"
                >
                  Add Bot
                </button>
              </div>
            </div>

            {/* Current Bot Names */}
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">Current Bot Names ({botNames.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                {botNames.map((name, index) => (
                  <div key={index} className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-blue-400 font-medium">{name}</span>
                    <button
                      onClick={() => removeBotName(name)}
                      className="text-red-400 hover:text-red-300 ml-2 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {botNames.length === 0 && (
                <p className="text-gray-400 text-center py-4">No bot names configured</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;