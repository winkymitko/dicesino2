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
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');
  const [diceGameModifier, setDiceGameModifier] = useState('1.0');
  const [diceBattleModifier, setDiceBattleModifier] = useState('1.0');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchStats();
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

  const updateModifiers = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/modifiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          diceGameModifier: parseFloat(diceGameModifier),
          diceBattleModifier: parseFloat(diceBattleModifier)
        })
      });

      if (response.ok) {
        fetchUsers();
        setSelectedUser(null);
        alert('Game modifiers updated successfully');
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
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Virtual Balance</th>
                <th className="text-left p-3">Real Balance</th>
                <th className="text-left p-3">Games</th>
                <th className="text-left p-3">Win Rate</th>
                <th className="text-left p-3">Casino Profit</th>
                <th className="text-left p-3">Dice/Battle Mod</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.name || '-'}</td>
                  <td className="p-3 text-green-400">${user.virtualBalance.toFixed(2)}</td>
                  <td className="p-3 text-yellow-400">${user.realBalance.toFixed(2)}</td>
                  <td className="p-3">{user.totalGames}</td>
                  <td className="p-3">
                    {user.totalGames > 0 ? `${(user.totalWins / user.totalGames * 100).toFixed(1)}%` : '0%'}
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      <div className="text-green-400">Dice: ${(user.casinoProfitDice || 0).toFixed(2)}</div>
                      <div className="text-blue-400">Battle: ${(user.casinoProfitBattle || 0).toFixed(2)}</div>
                      <div className="text-yellow-400 font-bold">Total: ${((user.casinoProfitDice || 0) + (user.casinoProfitBattle || 0)).toFixed(2)}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.diceGameModifier > 1 || user.diceBattleModifier > 1 ? 'bg-green-500/20 text-green-400' :
                      user.diceGameModifier < 1 || user.diceBattleModifier < 1 ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.diceGameModifier}x/{user.diceBattleModifier}x
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setDiceGameModifier(user.diceGameModifier.toString());
                        setDiceBattleModifier(user.diceBattleModifier.toString());
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
                    <td colSpan={9} className="p-0">
                      <div className="bg-black/30 p-6 border-t border-white/10">
                        <h4 className="text-lg font-bold mb-4 text-purple-400">
                          Detailed Statistics for {user.email}
                        </h4>
                        
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          {/* Money Flow */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-blue-400">Money Flow</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Virtual Deposited:</span>
                                <span className="text-green-400">${userStats[user.id].virtualDeposited?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Real Deposited:</span>
                                <span className="text-yellow-400">${userStats[user.id].realDeposited?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Wagered:</span>
                                <span className="text-orange-400">${userStats[user.id].totalWagered?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Won:</span>
                                <span className="text-green-400">${userStats[user.id].totalWon?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/20 pt-2">
                                <span className="font-bold">Net P&L:</span>
                                <span className={`font-bold ${
                                  (userStats[user.id].totalWon - userStats[user.id].totalWagered) >= 0 
                                    ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  ${((userStats[user.id].totalWon || 0) - (userStats[user.id].totalWagered || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BarboDice Stats */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-green-400">BarboDice</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Games Played:</span>
                                <span>{userStats[user.id].diceGames?.total || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games Won:</span>
                                <span className="text-green-400">{userStats[user.id].diceGames?.won || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games Lost:</span>
                                <span className="text-red-400">{userStats[user.id].diceGames?.lost || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Wagered:</span>
                                <span className="text-orange-400">${userStats[user.id].diceGames?.wagered?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Won:</span>
                                <span className="text-green-400">${userStats[user.id].diceGames?.won_amount?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/20 pt-2">
                                <span className="font-bold">Casino Profit:</span>
                                <span className="text-yellow-400 font-bold">
                                  ${userStats[user.id].diceGames?.casino_profit?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* DiceBattle Stats */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="font-bold mb-3 text-red-400">DiceBattle</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Battles Played:</span>
                                <span>{userStats[user.id].battleGames?.total || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Battles Won:</span>
                                <span className="text-green-400">{userStats[user.id].battleGames?.won || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Battles Lost:</span>
                                <span className="text-red-400">{userStats[user.id].battleGames?.lost || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Battles Tied:</span>
                                <span className="text-yellow-400">{userStats[user.id].battleGames?.tied || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Wagered:</span>
                                <span className="text-orange-400">${userStats[user.id].battleGames?.wagered?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Won:</span>
                                <span className="text-green-400">${userStats[user.id].battleGames?.won_amount?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/20 pt-2">
                                <span className="font-bold">Casino Profit:</span>
                                <span className="text-yellow-400 font-bold">
                                  ${userStats[user.id].battleGames?.casino_profit?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recent Games */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <h5 className="font-bold mb-3 text-blue-400">Recent Games (Last 10)</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/20">
                                  <th className="text-left p-2">Date</th>
                                  <th className="text-left p-2">Game</th>
                                  <th className="text-left p-2">Stake</th>
                                  <th className="text-left p-2">Result</th>
                                  <th className="text-left p-2">Payout</th>
                                  <th className="text-left p-2">Casino P&L</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userStats[user.id].recentGames?.map((game: any, index: number) => (
                                  <tr key={index} className="border-b border-white/10">
                                    <td className="p-2">{new Date(game.createdAt).toLocaleDateString()}</td>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        game.gameType === 'dice' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                      }`}>
                                        {game.gameType === 'dice' ? 'BarboDice' : 'DiceBattle'}
                                      </span>
                                    </td>
                                    <td className="p-2">${game.stake?.toFixed(2)}</td>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        game.status === 'cashed_out' ? 'bg-green-500/20 text-green-400' :
                                        game.status === 'tie' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {game.status === 'cashed_out' ? 'Won' : 
                                         game.status === 'tie' ? 'Tie' : 'Lost'}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      ${game.finalPot?.toFixed(2) || '0.00'}
                                    </td>
                                    <td className="p-2">
                                      <span className={`font-bold ${
                                        game.casinoProfit > 0 ? 'text-green-400' : 
                                        game.casinoProfit < 0 ? 'text-red-400' : 'text-gray-400'
                                      }`}>
                                        ${game.casinoProfit?.toFixed(2) || '0.00'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
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
                <label className="block text-sm font-medium mb-2">Dice Game Modifier</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={diceGameModifier}
                  onChange={(e) => setDiceGameModifier(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {'1.0 = normal, >1.0 = better luck, <1.0 = worse luck'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">DiceBattle Modifier</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={diceBattleModifier}
                  onChange={(e) => setDiceBattleModifier(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {'1.0 = normal, >1.0 = better luck, <1.0 = worse luck'}
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
                  onClick={() => updateModifiers(selectedUser.id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 rounded-lg transition-all"
                >
                  Update Modifiers
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
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
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
    </div>
  );
};

export default AdminPanel;