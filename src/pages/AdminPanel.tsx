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
  const [bonusDescription, setBonusDescription] = useState('');
  const [diceGameEdge, setDiceGameEdge] = useState('5.0');
  const [diceBattleEdge, setDiceBattleEdge] = useState('5.0');
  const [diceRouletteEdge, setDiceRouletteEdge] = useState('5.0');
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

  const addBonus = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(bonusAmount),
          description: bonusDescription
        })
      });

      if (response.ok) {
        fetchUsers();
        setBonusAmount('');
        setBonusDescription('');
        setSelectedUser(null);
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
          <div className="text-2xl font-bold">${(stats.totalCasinoProfit || 0).toFixed(2)}</div>
          <div className="text-gray-400">Casino Profit</div>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Users Management</h2>
        
        <div className="space-y-4">
          {users.map((user: any) => (
            <div key={user.id} className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-bold">{user.username}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                  <div className="text-sm">
                    <div>Virtual: ${(user.virtualBalance || 0).toFixed(2)}</div>
                    <div>Real: ${(user.realBalance || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-sm">
                    <div>Deposited: ${(user.totalRealMoneyDeposited || 0).toFixed(2)}</div>
                    <div>Wagered: ${(user.totalWagered || 0).toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleUserStats(user.id)}
                    className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded hover:bg-blue-500/30 transition-colors"
                  >
                    {expandedUser === user.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Stats
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setDiceGameEdge((user.diceGameEdge || 5).toString());
                      setDiceBattleEdge((user.diceBattleEdge || 5).toString());
                      setDiceRouletteEdge((user.diceRouletteEdge || 5).toString());
                      setMaxBetWhileBonus((user.maxBetWhileBonus || 50).toString());
                      setMaxBonusCashout((user.maxBonusCashout || 1000).toString());
                    }}
                    className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded hover:bg-yellow-500/30 transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              {/* Affiliate Stats */}
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">${(user.totalCommissionEarned || 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-400">Total Earned</div>
                </div>
                
                <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{user.totalReferrals || 0}</div>
                  <div className="text-sm text-gray-400">Total Referrals</div>
                </div>
                
                <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{user.activeReferrals || 0}</div>
                  <div className="text-sm text-gray-400">Active Referrals</div>
                </div>
                
                <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{(user.affiliateCommission || 0).toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Commission Rate</div>
                </div>
                
                {/* Add Commission Rate Setting */}
                <div className="col-span-4 mt-4">
                  <label className="block text-sm font-medium mb-2">Set Commission Rate (%)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      defaultValue={user.affiliateCommission || 0}
                      className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      id={`commission-${user.id}`}
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById(`commission-${user.id}`) as HTMLInputElement;
                        const newRate = parseFloat(input.value);
                        if (newRate >= 0 && newRate <= 50) {
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
                      className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

              {/* Wagering Progress */}
              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h5 className="font-bold mb-3 text-blue-400">🎯 Bonus Wagering Progress</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-400 font-bold">${userStats[user.id]?.wagering?.progress?.toFixed(2) || '0.00'}</div>
                    <div className="text-gray-400">Progress</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold">${userStats[user.id]?.wagering?.required?.toFixed(2) || '0.00'}</div>
                    <div className="text-gray-400">Required</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold">{userStats[user.id]?.wagering?.progressPercent || 0}%</div>
                    <div className="text-gray-400">Complete</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold">${userStats[user.id]?.wagering?.lockedBalance?.toFixed(2) || '0.00'}</div>
                    <div className="text-gray-400">Locked Balance</div>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, userStats[user.id]?.wagering?.progressPercent || 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* Expanded User Stats */}
              {expandedUser === user.id && userStats[user.id] && (
                <div className="border-t border-white/10 p-6 bg-black/20">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Demo Money Stats */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-purple-400 mb-4">🎮 Demo Money Stats</h4>
                      
                      {/* Demo Overview */}
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3">Demo Overview</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-purple-400 font-bold">${userStats[user.id].virtual?.deposited?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Initial + Bonuses</div>
                          </div>
                          <div>
                            <div className="text-purple-400 font-bold">${userStats[user.id].virtual?.wagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-purple-400 font-bold">${userStats[user.id].virtual?.won?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Won</div>
                          </div>
                          <div>
                            <div className={`font-bold ${(userStats[user.id].virtual?.netResult || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${(userStats[user.id].virtual?.netResult || 0).toFixed(2)}
                            </div>
                            <div className="text-gray-400">Net Result</div>
                          </div>
                        </div>
                      </div>

                      {/* Demo BarboDice */}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-green-400">🎲 Demo BarboDice</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].virtual?.diceGames?.total || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].virtual?.diceGames?.won || 0}</div>
                            <div className="text-gray-400">Won (Cashed Out)</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].virtual?.diceGames?.wagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Wagered</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].virtual?.diceGames?.won_amount?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Won Amount</div>
                          </div>
                        </div>
                      </div>

                      {/* Demo DiceBattle */}
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-red-400">⚔️ Demo DiceBattle</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-red-400 font-bold">{userStats[user.id].virtual?.battleGames?.total || 0}</div>
                            <div className="text-gray-400">Battles</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">{userStats[user.id].virtual?.battleGames?.won || 0}W/{userStats[user.id].virtual?.battleGames?.lost || 0}L/{userStats[user.id].virtual?.battleGames?.tied || 0}T</div>
                            <div className="text-gray-400">W/L/T</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].virtual?.battleGames?.wagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Wagered</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].virtual?.battleGames?.won_amount?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Won Amount</div>
                          </div>
                        </div>
                      </div>

                      {/* Virtual BarboDice */}
                      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-green-400">🎲 BarboDice</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].virtual?.dice?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].virtual?.dice?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].virtual?.dice?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Virtual DiceBattle */}
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-red-400">⚔️ DiceBattle</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-red-400 font-bold">{userStats[user.id].virtual?.battle?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Battles</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].virtual?.battle?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].virtual?.battle?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Virtual DiceRoulette */}
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-orange-400">🎯 DiceRoulette</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-orange-400 font-bold">{userStats[user.id].virtual?.roulette?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-orange-400 font-bold">${userStats[user.id].virtual?.roulette?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-orange-400 font-bold">${userStats[user.id].virtual?.roulette?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Virtual Total */}
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-purple-400">📊 Virtual Total</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-purple-400 font-bold">{userStats[user.id].virtual?.total?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Total Games</div>
                          </div>
                          <div>
                            <div className="text-purple-400 font-bold">${userStats[user.id].virtual?.total?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-purple-400 font-bold">${userStats[user.id].virtual?.total?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Total Casino Profit</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real Money Stats */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-yellow-400 mb-4">💰 Real Money Stats</h4>
                      
                      {/* Real Money Overview */}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3">Real Money Overview</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.deposited?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Deposited</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.wagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.won?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Won</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].real?.totalCasinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Real BarboDice */}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-green-400">🎲 Real BarboDice</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].real?.diceGames?.total || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].real?.diceGames?.won || 0}</div>
                            <div className="text-gray-400">Won (Cashed Out)</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].real?.diceGames?.wagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Wagered</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].real?.diceCasinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Real BarboDice */}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-green-400">🎲 BarboDice</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-green-400 font-bold">{userStats[user.id].real?.dice?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].real?.dice?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold">${userStats[user.id].real?.dice?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Real DiceBattle */}
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-red-400">⚔️ DiceBattle</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-red-400 font-bold">{userStats[user.id].real?.battle?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Battles</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].real?.battle?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-red-400 font-bold">${userStats[user.id].real?.battle?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Real DiceRoulette */}
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-orange-400">🎯 DiceRoulette</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-orange-400 font-bold">{userStats[user.id].real?.roulette?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Games Played</div>
                          </div>
                          <div>
                            <div className="text-orange-400 font-bold">${userStats[user.id].real?.roulette?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-orange-400 font-bold">${userStats[user.id].real?.roulette?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Real Total */}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-yellow-400">📊 Real Money Total</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.deposited?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Deposited</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-bold">{userStats[user.id].real?.total?.gamesPlayed || 0}</div>
                            <div className="text-gray-400">Total Games</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.total?.totalWagered?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">Total Wagered</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-bold">${userStats[user.id].real?.total?.casinoProfit?.toFixed(2) || '0.00'}</div>
                            <div className="text-gray-400">🏦 Total Casino Profit</div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Games */}
                      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h5 className="font-bold mb-3 text-blue-400">🎮 Recent Real Money Games</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/20">
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Game</th>
                                <th className="text-left p-2">Stake</th>
                                <th className="text-left p-2">Result</th>
                                <th className="text-left p-2">Won</th>
                                <th className="text-left p-2">Casino Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userStats[user.id].real?.recentGames?.slice(0, 5).map((game: any) => (
                                <tr key={game.id} className="border-b border-white/10">
                                  <td className="p-2">{new Date(game.createdAt).toLocaleDateString()}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      game.gameType === 'dice' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {game.gameType === 'dice' ? '🎲' : '⚔️'}
                                    </span>
                                  </td>
                                  <td className="p-2">${game.stake?.toFixed(2)}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      game.status === 'cashed_out' || game.status === 'won' ? 'bg-green-500/20 text-green-400' :
                                      game.status === 'tie' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {game.status === 'cashed_out' ? 'Won' : 
                                       game.status === 'won' ? 'Won' :
                                       game.status === 'tie' ? 'Tie' : 'Lost'}
                                    </span>
                                  </td>
                                  <td className="p-2">${game.finalPot?.toFixed(2) || '0.00'}</td>
                                  <td className="p-2">
                                    <span className={`font-bold ${
                                      game.casinoProfit > 0 ? 'text-green-400' : 
                                      game.casinoProfit < 0 ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                      {game.casinoProfit > 0 ? '+' : ''}${game.casinoProfit?.toFixed(2) || '0.00'}
                                    </span>
                                  </td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-gray-400">
                                    No real money games found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20">
            <h3 className="text-xl font-bold mb-6">Settings for {selectedUser.username}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">BarboDice House Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceGameEdge}
                  onChange={(e) => setDiceGameEdge(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  5.0% = normal luck, higher = more bad luck for user, lower = more good luck
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">DiceBattle House Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceBattleEdge}
                  onChange={(e) => setDiceBattleEdge(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  5.0% = normal luck, higher = more bad luck for user, lower = more good luck
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">DiceRoulette House Edge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={diceRouletteEdge}
                  onChange={(e) => setDiceRouletteEdge(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  5.0% = normal luck, higher = more bad luck for user, lower = more good luck
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Bet While Bonus Active ($)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="1000"
                  value={maxBetWhileBonus}
                  onChange={(e) => setMaxBetWhileBonus(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Maximum bet amount when user has active bonus
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Bonus Cashout ($)</label>
                <input
                  type="number"
                  step="10"
                  min="100"
                  max="10000"
                  value={maxBonusCashout}
                  onChange={(e) => setMaxBonusCashout(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Maximum amount that can be unlocked from bonus winnings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Add Bonus (Virtual Money)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                  placeholder="Bonus amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bonus Description</label>
                <input
                  type="text"
                  value={bonusDescription}
                  onChange={(e) => setBonusDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                  placeholder="e.g., Welcome bonus, Loyalty reward"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => updateSettings(selectedUser.id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 rounded-lg transition-all"
                >
                  Update Settings
                </button>
                
                <button
                  onClick={() => addBonus(selectedUser.id)}
                  disabled={!bonusAmount}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all"
                >
                  Add Bonus
                </button>
                
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
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
                      className="text-red-400 hover:text-red-300 ml-2 text-sm"
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