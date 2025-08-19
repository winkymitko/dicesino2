import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  Shield,
  Mail,
  Bug,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Eye,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<{[key: string]: any}>({});
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState('all');
  const [botNames, setBotNames] = useState<string[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchStats();
    fetchBugReports();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(prev => ({
          ...prev,
          [userId]: { ...data, statsMode: prev[userId]?.statsMode || 'real' }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const toggleStatsMode = (userId: string) => {
    setUserStats(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        statsMode: (prev[userId]?.statsMode || 'real') === 'real' ? 'virtual' : 'real'
      }
    }));
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

  const fetchBugReports = async () => {
    try {
      const response = await fetch('/api/admin/bug-reports', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBugReports(data.bugReports);
      }
    } catch (error) {
      console.error('Failed to fetch bug reports:', error);
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

  const updateUserSettings = async (userId: string, settings: any) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        await fetchUsers();
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to update user settings:', error);
    }
  };

  const updateCommission = async (userId: string, commission: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commission })
      });
      
      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to update commission:', error);
    }
  };

  const addBonus = async (userId: string, amount: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to add bonus:', error);
    }
  };

  const updateBugReportStatus = async (reportId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/bug-reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        await fetchBugReports();
      }
    } catch (error) {
      console.error('Failed to update bug report:', error);
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
        setNewBotName('');
        await fetchBotNames();
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
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to remove bot name:', error);
    }
  };

  if (!user || !user.isAdmin) return null;

  const filteredReports = bugReports.filter(report => {
    if (reportFilter === 'all') return true;
    return report.status === reportFilter;
  });

  const openReportsCount = bugReports.filter(r => r.status === 'open').length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📋';
      case 'low': return '📝';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Logged in as</div>
            <div className="font-bold">{user.email}</div>
          </div>
          {openReportsCount > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {openReportsCount} Reports
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
          <div className="text-gray-400">Total Users</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.totalGames || 0}</div>
          <div className="text-gray-400">Total Games</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">${(stats.totalRealMoneyDeposited || 0).toFixed(2)}</div>
          <div className="text-gray-400">Total Deposits</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
          <Shield className="h-8 w-8 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold">${(stats.totalCasinoProfit || 0).toFixed(2)}</div>
          <div className="text-gray-400">Casino Profit</div>
        </div>
      </div>

      {/* Users Management - Full Width */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Users Management</h2>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {users.map((u) => (
            <div key={u.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold">{u.email}</div>
                  <div className="text-sm text-gray-400">@{u.username || u.email.split('@')[0]}</div>
                  <div className="text-xs text-gray-500">ID: {u.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">
                    ${((u.cashBalance || 0) + (u.bonusBalance || 0) + (u.lockedBalance || 0)).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Main Balance</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="text-center">
                  <div className="text-green-400">${(u.cashBalance || 0).toFixed(2)}</div>
                  <div className="text-gray-500">Cash</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400">${(u.bonusBalance || 0).toFixed(2)}</div>
                  <div className="text-gray-500">Bonus</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400">${(u.virtualBalance || 0).toFixed(2)}</div>
                  <div className="text-gray-500">Virtual</div>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-3">
                <button
                  onClick={() => setSelectedUser(u)}
                  className="flex-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-2 rounded text-sm transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    if (!userStats[u.id]) {
                      fetchUserStats(u.id);
                    }
                    setUserStats(prev => ({
                      ...prev,
                      [u.id]: { ...prev[u.id], showStats: !prev[u.id]?.showStats }
                    }));
                  }}
                  className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-2 rounded text-sm transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const amount = prompt('Bonus amount:');
                    if (amount && parseFloat(amount) > 0) {
                      addBonus(u.id, parseFloat(amount));
                    }
                  }}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-2 rounded text-sm transition-colors"
                >
                  Add Bonus
                </button>
                {!u.isAffiliate && (
                  <button
                    onClick={() => {
                      const commission = prompt('Commission rate (0-100%):');
                      if (commission !== null) {
                        const rate = parseFloat(commission);
                        if (rate >= 0 && rate <= 100) {
                          updateCommission(u.id, rate);
                        }
                      }
                    }}
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-2 rounded text-sm transition-colors"
                  >
                    Affiliate
                  </button>
                )}
                {u.isAffiliate && (
                  <div className="bg-purple-500/20 text-purple-400 px-3 py-2 rounded text-sm">
                    {u.affiliateCommission}% Aff
                  </div>
                )}
              </div>

              {/* Detailed User Statistics */}
              {userStats[u.id]?.showStats && userStats[u.id] && (
                <div className="mt-4 p-4 bg-black/50 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-white">Detailed Statistics</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleStatsMode(u.id)}
                        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
                      >
                        {(userStats[u.id].statsMode || 'real') === 'real' ? 
                          <ToggleRight className="h-4 w-4 text-yellow-400" /> : 
                          <ToggleLeft className="h-4 w-4 text-purple-400" />
                        }
                        <span className={`text-sm font-medium ${
                          (userStats[u.id].statsMode || 'real') === 'real' ? 'text-yellow-400' : 'text-purple-400'
                        }`}>
                          {(userStats[u.id].statsMode || 'real') === 'real' ? 'REAL MONEY' : 'VIRTUAL MONEY'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Real Money Overview */}
                  {(userStats[u.id].statsMode || 'real') === 'real' && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <h5 className="font-bold text-green-400 mb-2">💰 Real Money Overview</h5>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-green-400 font-bold">${(userStats[u.id].realMoney?.totalDeposited || 0).toFixed(2)}</div>
                          <div className="text-gray-400">Deposited</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-400 font-bold">${(userStats[u.id].realMoney?.totalWithdrawn || 0).toFixed(2)}</div>
                          <div className="text-gray-400">Withdrawn</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${(userStats[u.id].realMoney?.casinoProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${(userStats[u.id].realMoney?.casinoProfit || 0).toFixed(2)}
                          </div>
                          <div className="text-gray-400">Casino Profit</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Affiliate Stats */}
                  {userStats[u.id].affiliateStats && (
                    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded">
                      <h5 className="font-bold text-purple-400 mb-2">👥 Affiliate Performance</h5>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-purple-400 font-bold">{userStats[u.id].affiliateStats.totalReferrals}</div>
                          <div className="text-gray-400">Referrals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400 font-bold">{userStats[u.id].affiliateStats.activeReferrals}</div>
                          <div className="text-gray-400">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 font-bold">${(userStats[u.id].affiliateStats.totalCommissionEarned || 0).toFixed(2)}</div>
                          <div className="text-gray-400">Commission</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game Statistics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* BarboDice Stats */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                      <h6 className="font-bold text-blue-400 mb-2 text-sm">🎲 BarboDice</h6>
                      <div className="space-y-1 text-xs">
                        {(userStats[u.id].statsMode || 'real') === 'real' ? (
                          <>
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">{userStats[u.id].realStats?.barboDice?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].realStats?.barboDice?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400">{userStats[u.id].realStats?.barboDice?.losses || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].realStats?.barboDice?.totalWins - userStats[u.id].realStats?.barboDice?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].realStats?.barboDice?.totalWins || 0) - (userStats[u.id].realStats?.barboDice?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">{userStats[u.id].virtualStats?.barboDice?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].virtualStats?.barboDice?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400">{userStats[u.id].virtualStats?.barboDice?.losses || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].virtualStats?.barboDice?.totalWins - userStats[u.id].virtualStats?.barboDice?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].virtualStats?.barboDice?.totalWins || 0) - (userStats[u.id].virtualStats?.barboDice?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* DiceBattle Stats */}
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                      <h6 className="font-bold text-red-400 mb-2 text-sm">⚔️ DiceBattle</h6>
                      <div className="space-y-1 text-xs">
                        {(userStats[u.id].statsMode || 'real') === 'real' ? (
                          <>
                            <div className="flex justify-between">
                              <span>Battles:</span>
                              <span className="font-bold">{userStats[u.id].realStats?.diceBattle?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].realStats?.diceBattle?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ties:</span>
                              <span className="text-yellow-400">{userStats[u.id].realStats?.diceBattle?.ties || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].realStats?.diceBattle?.totalWins - userStats[u.id].realStats?.diceBattle?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].realStats?.diceBattle?.totalWins || 0) - (userStats[u.id].realStats?.diceBattle?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>Battles:</span>
                              <span className="font-bold">{userStats[u.id].virtualStats?.diceBattle?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].virtualStats?.diceBattle?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ties:</span>
                              <span className="text-yellow-400">{userStats[u.id].virtualStats?.diceBattle?.ties || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].virtualStats?.diceBattle?.totalWins - userStats[u.id].virtualStats?.diceBattle?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].virtualStats?.diceBattle?.totalWins || 0) - (userStats[u.id].virtualStats?.diceBattle?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* DiceRoulette Stats */}
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded">
                      <h6 className="font-bold text-orange-400 mb-2 text-sm">🎯 DiceRoulette</h6>
                      <div className="space-y-1 text-xs">
                        {(userStats[u.id].statsMode || 'real') === 'real' ? (
                          <>
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">{userStats[u.id].realStats?.diceRoulette?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].realStats?.diceRoulette?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400">{userStats[u.id].realStats?.diceRoulette?.losses || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].realStats?.diceRoulette?.totalWins - userStats[u.id].realStats?.diceRoulette?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].realStats?.diceRoulette?.totalWins || 0) - (userStats[u.id].realStats?.diceRoulette?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>Games:</span>
                              <span className="font-bold">{userStats[u.id].virtualStats?.diceRoulette?.totalGames || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wins:</span>
                              <span className="text-green-400">{userStats[u.id].virtualStats?.diceRoulette?.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losses:</span>
                              <span className="text-red-400">{userStats[u.id].virtualStats?.diceRoulette?.losses || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className={`font-bold ${(userStats[u.id].virtualStats?.diceRoulette?.totalWins - userStats[u.id].virtualStats?.diceRoulette?.totalBets || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${((userStats[u.id].virtualStats?.diceRoulette?.totalWins || 0) - (userStats[u.id].virtualStats?.diceRoulette?.totalBets || 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wagering Progress */}
                  {userStats[u.id].wagering && userStats[u.id].wagering.required > 0 && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                      <h6 className="font-bold text-blue-400 mb-2 text-sm">🎯 Wagering Progress</h6>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${userStats[u.id].wagering.progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-blue-400 font-bold">${userStats[u.id].wagering.progress.toFixed(2)}</div>
                          <div className="text-gray-400">Progress</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 font-bold">${userStats[u.id].wagering.required.toFixed(2)}</div>
                          <div className="text-gray-400">Required</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Transactions */}
                  {userStats[u.id].transactions && userStats[u.id].transactions.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-500/10 border border-gray-500/20 rounded">
                      <h6 className="font-bold text-gray-400 mb-2 text-sm">📊 Recent Transactions</h6>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {userStats[u.id].transactions.slice(0, 5).map((tx: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-gray-300">{tx.type}</span>
                            <span className={`font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${Math.abs(tx.amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bug Reports Inbox - Full Width */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bug className="h-6 w-6 text-red-400" />
            <h2 className="text-2xl font-bold">Bug Reports Inbox</h2>
            {openReportsCount > 0 && (
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                {openReportsCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="bg-black/30 border border-white/20 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Reports</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div key={report.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getPriorityEmoji(report.priority)}</span>
                      <div className="font-bold">{report.subject}</div>
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    </div>
                    
                    {/* User Information */}
                    <div className="text-sm text-blue-400 mb-2">
                      {report.user ? (
                        <span>👤 ID: {report.user.id} | {report.user.email} | @{report.user.username || 'no-username'}</span>
                      ) : (
                        <span>👤 Anonymous User</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-300 mb-3">{report.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {report.status === 'open' && (
                    <button
                      onClick={() => updateBugReportStatus(report.id, 'in_progress')}
                      className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Start Working
                    </button>
                  )}
                  {report.status === 'in_progress' && (
                    <button
                      onClick={() => updateBugReportStatus(report.id, 'resolved')}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {(report.status === 'resolved' || report.status === 'in_progress') && (
                    <button
                      onClick={() => updateBugReportStatus(report.id, 'closed')}
                      className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Close
                    </button>
                  )}
                  {report.status === 'closed' && (
                    <button
                      onClick={() => updateBugReportStatus(report.id, 'open')}
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bug reports found</p>
              <p className="text-sm">
                {reportFilter === 'all' ? 'No reports submitted yet' : `No ${reportFilter} reports`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bot Names Management */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold mb-6">DiceBattle Bot Names</h2>
        
        <div className="mb-4 flex space-x-2">
          <input
            type="text"
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            placeholder="Enter new bot name"
            className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors"
          />
          <button
            onClick={addBotName}
            className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-4 py-2 rounded-lg transition-colors"
          >
            Add Bot
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {botNames.map((name, index) => (
            <div key={index} className="flex items-center justify-between bg-black/30 rounded px-3 py-2">
              <span className="text-sm">{name}</span>
              <button
                onClick={() => {
                  if (confirm(`Remove bot "${name}"?`)) {
                    removeBotName(name);
                  }
                }}
                className="text-red-400 hover:text-red-300 ml-2"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Total: {botNames.length} bot names (minimum 5 required)
        </div>
      </div>

      {/* User Settings Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">User Settings: {selectedUser.email}</h3>
              <button onClick={() => setSelectedUser(null)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-4">House Edge Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">BarboDice Edge (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      defaultValue={selectedUser.diceGameEdge}
                      id="diceGameEdge"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">DiceBattle Edge (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      defaultValue={selectedUser.diceBattleEdge}
                      id="diceBattleEdge"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">DiceRoulette Edge (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      defaultValue={selectedUser.diceRouletteEdge}
                      id="diceRouletteEdge"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">Bonus Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Max Bet While Bonus ($)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      defaultValue={selectedUser.maxBetWhileBonus}
                      id="maxBetWhileBonus"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Max Bonus Cashout ($)</label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      defaultValue={selectedUser.maxBonusCashout}
                      id="maxBonusCashout"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Wagering Multiplier</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      defaultValue={selectedUser.wageringMultiplier}
                      id="wageringMultiplier"
                      className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded focus:border-yellow-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  const settings = {
                    diceGameEdge: parseFloat((document.getElementById('diceGameEdge') as HTMLInputElement).value),
                    diceBattleEdge: parseFloat((document.getElementById('diceBattleEdge') as HTMLInputElement).value),
                    diceRouletteEdge: parseFloat((document.getElementById('diceRouletteEdge') as HTMLInputElement).value),
                    maxBetWhileBonus: parseFloat((document.getElementById('maxBetWhileBonus') as HTMLInputElement).value),
                    maxBonusCashout: parseFloat((document.getElementById('maxBonusCashout') as HTMLInputElement).value),
                    wageringMultiplier: parseFloat((document.getElementById('wageringMultiplier') as HTMLInputElement).value)
                  };
                  updateUserSettings(selectedUser.id, settings);
                }}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-lg transition-all"
              >
                Save Settings
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;