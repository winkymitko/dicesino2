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
  const [maxBetWhileBonus, setMaxBetWhileBonus] = useState('50');
  const [maxBonusCashout, setMaxBonusCashout] = useState('1000');
  const [wageringMultiplier, setWageringMultiplier] = useState('20');

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
          diceRouletteEdge: parseFloat(diceRouletteEdge),
          maxBetWhileBonus: parseFloat(maxBetWhileBonus),
          maxBonusCashout: parseFloat(maxBonusCashout),
          wageringMultiplier: parseFloat(wageringMultiplier)
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
      console.error('Failed to update settings:', error);
    }
  };

  const grantRealBonus = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/real-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(bonusAmount),
          description: bonusDescription,
          wageringMultiplier: parseFloat(wageringMultiplier)
        })
      });

      if (response.ok) {
        fetchUsers();
        setBonusAmount('');
        setBonusDescription('');
        setSelectedUser(null);
        alert('Real money bonus granted successfully');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to grant bonus:', error);
    }
  };

  const adjustWagering = async (userId: string, action: 'add' | 'reduce') => {
    try {
      const inputId = `${action}-wagering-${userId}`;
      const input = document.getElementById(inputId) as HTMLInputElement;
      const amount = parseFloat(input.value);
      
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      const response = await fetch(`/api/admin/users/${userId}/adjust-wagering`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          amount
        })
      });

      if (response.ok) {
        fetchUsers();
        input.value = '';
        alert(`Wagering ${action === 'add' ? 'increased' : 'reduced'} by $${amount.toFixed(2)}`);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to adjust wagering:', error);
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
              <div className="space-y-4">
                {/* User Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{user.username}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setDiceGameEdge(user.diceGameEdge?.toString() || '5.0');
                        setDiceBattleEdge(user.diceBattleEdge?.toString() || '5.0');
                        setDiceRouletteEdge(user.diceRouletteEdge?.toString() || '5.0');
                        setMaxBetWhileBonus(user.maxBetWhileBonus?.toString() || '50');
                        setMaxBonusCashout(user.maxBonusCashout?.toString() || '1000');
                        setWageringMultiplier(user.wageringMultiplier?.toString() || '20');
                      }}
                      className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded text-sm hover:bg-yellow-500/30 transition-colors"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => toggleUserStats(user.id)}
                      className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      {expandedUser === user.id ? 'Hide' : 'Stats'}
                    </button>
                  </div>
                </div>
                
                {/* Balance Overview */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2 text-center">
                    <div className="text-purple-400 font-bold">${(user.virtualBalance || 0).toFixed(2)}</div>
                    <div className="text-gray-400 text-xs">Virtual</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                    <div className="text-green-400 font-bold">${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}</div>
                    <div className="text-gray-400 text-xs">Real Money</div>
                  </div>
                </div>
                
                {/* Affiliate Info - Only show if user is affiliate */}
                {user.isAffiliate && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-orange-400 font-bold text-sm">👥 Affiliate</span>
                      <span className="text-purple-400 font-bold">{(user.affiliateCommission || 0).toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={user.affiliateCommission || 0}
                        className="px-2 py-1 bg-black/30 border border-white/20 rounded text-xs focus:border-blue-500 outline-none"
                        id={`commission-${user.id}`}
                        placeholder="Rate %"
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
                                alert('Commission updated');
                              } else {
                                const error = await response.json();
                                alert(error.error);
                              }
                            } catch (error) {
                              console.error('Failed to update commission:', error);
                            }
                          }
                        }}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Stats Section */}
              {expandedUser === user.id && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                  {/* User Stats Display */}
                  {userStats[user.id] && (
                    <div className="bg-black/20 rounded p-3">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="text-center">
                          <div className="text-green-400 font-bold">${(userStats[user.id].realMoney?.totalDeposited || 0).toFixed(2)}</div>
                          <div className="text-gray-400">Deposited</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-400 font-bold">${(userStats[user.id].realMoney?.totalWithdrawn || 0).toFixed(2)}</div>
                          <div className="text-gray-400">Withdrawn</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${(userStats[user.id].realMoney?.casinoProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${(userStats[user.id].realMoney?.casinoProfit || 0).toFixed(2)}
                          </div>
                          <div className="text-gray-400">Casino Profit</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Modal - Made Slimmer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Settings: {selectedUser.username}</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {/* House Edges */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dice %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={diceGameEdge}
                      onChange={(e) => setDiceGameEdge(e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Battle %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={diceBattleEdge}
                      onChange={(e) => setDiceBattleEdge(e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Roulette %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={diceRouletteEdge}
                      onChange={(e) => setDiceRouletteEdge(e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Bet $</label>
                    <input
                      type="number"
                      value={maxBetWhileBonus}
                      onChange={(e) => setMaxBetWhileBonus(e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Cashout $</label>
                    <input
                      type="number"
                      value={maxBonusCashout}
                      onChange={(e) => setMaxBonusCashout(e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Bonus Section */}
                <div className="border-t border-white/10 pt-3">
                  <h4 className="text-sm font-bold mb-2">Grant Real Bonus</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Amount $"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Wagering Coefficient"
                      value={wageringMultiplier}
                      onChange={(e) => setWageringMultiplier(e.target.value)}
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Wagering Adjustment */}
                <div className="border-t border-white/10 pt-3">
                  <h4 className="text-sm font-bold mb-2">Adjust Wagering</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Add $"
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                      id={`add-wagering-${selectedUser.id}`}
                    />
                    <input
                      type="number"
                      placeholder="Reduce $"
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-sm"
                      id={`reduce-wagering-${selectedUser.id}`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <button
                    onClick={() => updateSettings(selectedUser.id)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded text-sm"
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={() => grantRealBonus(selectedUser.id)}
                    disabled={!bonusAmount}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2 rounded text-sm"
                  >
                    Grant Bonus
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => adjustWagering(selectedUser.id, 'add')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded text-sm"
                  >
                    Add Wagering
                  </button>
                  <button
                    onClick={() => adjustWagering(selectedUser.id, 'reduce')}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded text-sm"
                  >
                    Reduce Wagering
                  </button>
                </div>
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