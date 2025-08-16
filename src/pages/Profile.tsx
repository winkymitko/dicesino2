import React, { useState, useEffect } from 'react';
import { User, Trophy, History, Wallet } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [loading, setLoading] = useState(false);

  // Stats shown in UI
  const [lastStrike, setLastStrike] = useState<number>(0);
  const [bestStrike, setBestStrike] = useState<number>(0);
  const [totalSuccessfulRolls, setTotalSuccessfulRolls] = useState<number>(0);
  const [totalGames, setTotalGames] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setCryptoWallet(user.cryptoWallet || '');
    fetchGameHistory();
  }, [user]);

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
        body: JSON.stringify({ name, phone, cryptoWallet }),
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

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Profile Info */}
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

            <div>
              <label className="block text-sm font-medium mb-2">Crypto Wallet</label>
              <input
                value={cryptoWallet}
                onChange={(e) => setCryptoWallet(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                placeholder="Enter your crypto wallet address"
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

        {/* Stats */}
        <div className="space-y-6">
          {/* Balances */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Wallet className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-bold">Balances</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  ${Number(user.virtualBalance ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Virtual Balance</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  ${Number(user.realBalance ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Real Balance</div>
              </div>
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Trophy className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-bold">Game Statistics</h2>
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
        </div>
      </div>

      {/* Game History */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <History className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Recent Games</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Stake</th>
                <th className="text-left p-3">Rounds</th>
                <th className="text-left p-3">Result</th>
                <th className="text-left p-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.map((game) => (
                <tr key={game.id} className="border-b border-white/10">
                  <td className="p-3">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">${Number(game.stake ?? 0).toFixed(2)}</td>
                  <td className="p-3">{Array.isArray(game.rounds) ? game.rounds.length : 0}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        game.status === 'cashed_out'
                          ? 'bg-green-500/20 text-green-400'
                          : game.status === 'lost'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {game.status === 'cashed_out'
                        ? 'Won'
                        : game.status === 'lost'
                        ? 'Lost'
                        : 'Active'}
                    </span>
                  </td>
                  <td className="p-3">
                    {game.finalPot != null ? `$${Number(game.finalPot).toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
              {gameHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    No games yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Profile;
