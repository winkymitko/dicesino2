import React, { useState, useEffect } from 'react';
import { Shield, Users, TrendingUp, Plus, Settings } from 'lucide-react';
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
  const [statsViewMode, setStatsViewMode] = useState<{[key: string]: 'virtual' | 'real'}>({});
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');
  const [diceGameEdge, setDiceGameEdge] = useState('5.0');
  const [diceBattleEdge, setDiceBattleEdge] = useState('5.0');
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
      // Initialize view mode to virtual by default
      if (!statsViewMode[userId]) {
        setStatsViewMode(prev => ({ ...prev, [userId]: 'virtual' }));
      }
      if (!userStats[userId]) {
        await fetchUserStats(userId);
      }
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center space-x-3 mb-8">
        <Shield className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="text-gray-400">Total Users</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.totalGames}</div>
          <div className="text-gray-400">Total Games</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <TrendingUp className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">${(stats.totalRevenue || 0).toFixed(2)}</div>
          <div className="text-gray-400">Total Revenue</div>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Users Management</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Username</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Virtual Balance</th>
                <th className="text-left p-3">Real Balance</th>
                <th className="text-left p-3">Games</th>
                <th className="text-left p-3">Win Rate</th>
                <th className="text-left p-3">Casino Profit</th>
                <th className="text-left p-3">House Edge %</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <React.Fragment key={user.id}>
                  <tr className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3 text-blue-400">@{user.username}</td>
                  <td className="p-3">{user.name || '-'}</td>
                  <td className="p-3 text-green-400">${(user.virtualBalance || 0).toFixed(2)}</td>
                  <td className="p-3 text-yellow-400">${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}</td>
                  <td className="p-3">{user.totalGames}</td>
                  <td className="p-3">
                    {(user.totalGames || 0) > 0 ? `${((user.totalWins || 0) / (user.totalGames || 1) * 100).toFixed(1)}%` : '0%'}
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      <div className="text-yellow-400 font-bold">${((user.totalBets || 0) - (user.totalWins || 0)).toFixed(2)}</div>
                      <div className="text-gray-400">Casino Profit</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      (user.diceGameEdge || 5) < 5 || (user.diceBattleEdge || 5) < 5 ? 'bg-green-500/20 text-green-400' :
                      (user.diceGameEdge || 5) > 5 || (user.diceBattleEdge || 5) > 5 ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {(user.diceGameEdge || 5).toFixed(1)}%/{(user.diceBattleEdge || 5).toFixed(1)}%
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                      {(user.diceGameEdge || 5) > 5 ? 'Bad Luck' : (user.diceGameEdge || 5) < 5 ? 'Good Luck' : 'Normal'}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setDiceGameEdge((user.diceGameEdge || 5).toString());
                        setDiceBattleEdge((user.diceBattleEdge || 5).toString());
                        setMaxBetWhileBonus((user.maxBetWhileBonus || 50).toString());
                        setMaxBonusCashout((user.maxBonusCashout || 1000).toString());
                      }}
                      className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs hover:bg-blue-500/30 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-xs hover:bg-green-500/30"
                    >
                      Bonus
                    </button>
                    <button
                      onClick={() => toggleUserStats(user.id)}
                      className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded text-xs hover:bg-purple-500/30 ml-2"
                    >
                      {expandedUser === user.id ? 'Hide Stats' : 'View Stats'}
                    </button>
                  </td>
                  </tr>
                  {expandedUser === user.id && userStats[user.id] && (
                    <tr>
                    <td colSpan={10} className="p-0">
                      <div className="bg-black/30 p-6 border-t border-white/10">
                        <h4 className="text-lg font-bold mb-4 text-purple-400">
                          Detailed Statistics for {user.email}
                        </h4>
                        
                          {/* Toggle Button */}
                          <div className="flex justify-center mb-6">
                            <div className="bg-white/10 rounded-lg p-1 flex">
                              <button
                                onClick={() => setStatsViewMode(prev => ({ ...prev, [user.id]: 'virtual' }))}
                                className={`px-4 py-2 rounded-md font-medium transition-all ${
                                  (statsViewMode[user.id] || 'virtual') === 'virtual'
                                    ? 'bg-green-500 text-black'
                                    : 'text-green-400 hover:bg-green-500/20'
                                }`}
                              >
                                💚 Virtual Money Stats
                              </button>
                              <button
                                onClick={() => setStatsViewMode(prev => ({ ...prev, [user.id]: 'real' }))}
                                className={`px-4 py-2 rounded-md font-medium transition-all ${
                                  statsViewMode[user.id] === 'real'
                                    ? 'bg-yellow-500 text-black'
                                    : 'text-yellow-400 hover:bg-yellow-500/20'
                                }`}
                              >
                                💛 Real Money Stats
                              </button>
                            </div>
                          </div>
                          
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          {/* Money Flow */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-blue-400">
                              💰 {(statsViewMode[user.id] || 'virtual') === 'virtual' ? 'Virtual' : 'Real'} Money Flow Summary
                            </h5>
                            <div className="space-y-2 text-sm">
                              {(statsViewMode[user.id] || 'virtual') === 'virtual' ? (
                                <>
                                  <div className="flex justify-between">
                                    <span>Virtual Money Added:</span>
                                    <span className="text-green-400">${userStats[user.id].virtual?.deposited?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Virtual Money Bet:</span>
                                    <span className="text-orange-400">${userStats[user.id].virtual?.wagered?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Virtual Money Won:</span>
                                    <span className="text-green-400">${userStats[user.id].virtual?.won?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-white/20 pt-2">
                                    <span className="font-bold">Virtual Net Result:</span>
                                    <span className={`font-bold ${
                                      ((userStats[user.id].virtual?.won || 0) - (userStats[user.id].virtual?.wagered || 0)) >= 0 
                                        ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      ${((userStats[user.id].virtual?.won || 0) - (userStats[user.id].virtual?.wagered || 0)).toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span>Real Money Deposited:</span>
                                    <span className="text-yellow-400">${userStats[user.id].real?.deposited?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Real Money Bet:</span>
                                    <span className="text-orange-400">${userStats[user.id].real?.wagered?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Real Money Won:</span>
                                    <span className="text-green-400">${userStats[user.id].real?.won?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-white/20 pt-2">
                                    <span className="font-bold">Real Net Result:</span>
                                    <span className={`font-bold ${
                                      ((userStats[user.id].real?.won || 0) - (userStats[user.id].real?.wagered || 0)) >= 0 
                                        ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      ${((userStats[user.id].real?.won || 0) - (userStats[user.id].real?.wagered || 0)).toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 3-Dice Game Stats */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-green-400">
                              🎲 {(statsViewMode[user.id] || 'virtual') === 'virtual' ? 'Virtual' : 'Real'} BarboDice (3-Dice Game)
                            </h5>
                            <div className="space-y-2 text-sm">
                              {(() => {
                                const currentStats = userStats[user.id][(statsViewMode[user.id] || 'virtual')];
                                const diceStats = currentStats?.diceGames || {};
                                return (
                                  <>
                              <div className="flex justify-between">
                                <span>Total Games:</span>
                                    <span>{diceStats.total || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games Won (Cashed Out):</span>
                                    <span className="text-green-400">{diceStats.won || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games Lost (Busted):</span>
                                    <span className="text-red-400">{diceStats.lost || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Money Bet on BarboDice:</span>
                                    <span className="text-orange-400">${diceStats.wagered?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Money Won from BarboDice:</span>
                                    <span className="text-green-400">${diceStats.won_amount?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/20 pt-2">
                                <span className="font-bold">🏦 Casino Profit (BarboDice):</span>
                                <span className="text-yellow-400 font-bold">
                                  ${currentStats?.diceCasinoProfit?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* DiceBattle Game Stats */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-red-400">
                              ⚔️ {(statsViewMode[user.id] || 'virtual') === 'virtual' ? 'Virtual' : 'Real'} DiceBattle (PvP Game)
                            </h5>
                            <div className="space-y-2 text-sm">
                              {(() => {
                                const currentStats = userStats[user.id][(statsViewMode[user.id] || 'virtual')];
                                const battleStats = currentStats?.battleGames || {};
                                return (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Total Battles:</span>
                                      <span>{battleStats.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Battles Won:</span>
                                      <span className="text-green-400">{battleStats.won || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Battles Lost:</span>
                                      <span className="text-red-400">{battleStats.lost || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Battles Tied:</span>
                                      <span className="text-yellow-400">{battleStats.tied || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Money Bet on DiceBattle:</span>
                                      <span className="text-orange-400">${battleStats.wagered?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Money Won from DiceBattle:</span>
                                      <span className="text-green-400">${battleStats.won_amount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/20 pt-2">
                                      <span className="font-bold">🏦 Casino Profit (DiceBattle):</span>
                                      <span className="text-yellow-400 font-bold">
                                        ${(currentStats?.battleCasinoProfit || 0) >= 0 ? '+' : ''}${currentStats?.battleCasinoProfit?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Recent Games History */}
                        <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-blue-400">
                              📊 Recent {(statsViewMode[user.id] || 'virtual') === 'virtual' ? 'Virtual' : 'Real'} Games History (Last 10)
                            </h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/20">
                                  <th className="text-left p-2">Date</th>
                                  <th className="text-left p-2">Game Type</th>
                                  <th className="text-left p-2">Bet Amount</th>
                                  <th className="text-left p-2">Result</th>
                                  <th className="text-left p-2">Player Won</th>
                                  <th className="text-left p-2">Casino Profit</th>
                                </tr>
                              </thead>
                              <tbody>
                              <span>Initial Virtual + Bonuses:</span>
                                  <tr key={index} className="border-b border-white/10">
                                    <td className="p-2">{new Date(game.createdAt).toLocaleDateString()}</td>
                            <div className="flex justify-between">
                              <span>Signup Bonuses Granted:</span>
                              <span className="text-blue-400">${userStats[user.id].virtual?.totalBonusesGranted?.toFixed(2) || '0.00'}</span>
                            </div>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        game.gameType === 'dice' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                      }`}>
                                        {game.gameType === 'dice' ? '🎲 BarboDice' : '⚔️ DiceBattle'}
                                      </span>
                                    </td>
                                    <td className="p-2">${game.stake?.toFixed(2)}</td>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        game.status === 'cashed_out' ? 'bg-green-500/20 text-green-400' :
                                (userStats[user.id].virtual?.netResult || 0) >= 0 
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                ${(userStats[user.id].virtual?.netResult || 0).toFixed(2)}
                                         game.status === 'tie' ? '🤝 Tie' : '❌ Lost'}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      ${game.finalPot?.toFixed(2) || '0.00'}
                                    </td>
                                    <td className="p-2">
                                      <span className={`font-bold ${
                                        game.casinoProfit > 0 ? 'text-green-400' : 
                            <div className="flex justify-between">
                              <span>Deposit Bonuses Granted:</span>
                              <span className="text-blue-400">${userStats[user.id].real?.depositBonuses?.toFixed(2) || '0.00'}</span>
                            </div>
                                        game.casinoProfit < 0 ? 'text-red-400' : 'text-gray-400'
                                      }`}>
                                        {game.casinoProfit > 0 ? '+' : ''}${game.casinoProfit?.toFixed(2) || '0.00'}
                                      </span>
                                    </td>
                                  </tr>
                                )) || []}
                                {(!userStats[user.id][(statsViewMode[user.id] || 'virtual')]?.recentGames || 
                            <div className="flex justify-between">
                              <span>Gross Gaming Revenue (GGR):</span>
                              <span className="text-purple-400">${userStats[user.id].real?.grossGamingRevenue?.toFixed(2) || '0.00'}</span>
                            </div>
                                  userStats[user.id][(statsViewMode[user.id] || 'virtual')]?.recentGames?.length === 0) && (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-gray-400">
                                (userStats[user.id].real?.netResult || 0) >= 0 
                                    </td>
                                  </tr>
                                ${(userStats[user.id].real?.netResult || 0).toFixed(2)}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">
              Manage User: {selectedUser.email}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dice Game House Edge (%)</label>
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

      {/* Recent Games */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Recent Games</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Stake</th>
                <th className="text-left p-3">Rounds</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentGames?.map((game: any) => (
                <tr key={game.id} className="border-b border-white/10">
                  <td className="p-3">{new Date(game.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{game.user?.email}</td>
                  <td className="p-3">${game.stake}</td>
                  <td className="p-3">{game.rounds?.length || 0}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      game.status === 'cashed_out' ? 'bg-green-500/20 text-green-400' :
                      game.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {game.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {game.finalPot ? `$${game.finalPot.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <span className="text-sm font-medium">{name}</span>
                    <button
                      onClick={() => removeBotName(name)}
                      className="text-red-400 hover:text-red-300 text-xs ml-2"
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