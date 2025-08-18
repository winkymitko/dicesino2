// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Dice6,
  Trophy,
  Shield,
  Zap,
  Target,
  Coins,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  const mainBal = user ? Number((user.cashBalance ?? 0) + (user.bonusBalance ?? 0) + (user.lockedBalance ?? 0)) : 0;
  const vBal = user ? Number(user.virtualBalance ?? 0) : 0;

  const getRandomGame = () => {
    const games = ['BarboDice', 'DiceBattle'];
    return games[Math.floor(Math.random() * games.length)];
  };

  const getRandomGamePath = () => {
    const paths = ['/dice', '/dicebattle'];
    return paths[Math.floor(Math.random() * paths.length)];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            DiceSino
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Experience the thrill of provably fair dice games. Roll, win, and cash out in our premium gambling platform.
        </p>

        {user ? (
          <div className="space-y-4">
            <Link
              to={getRandomGamePath()}
              className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105"
            >
              Play {getRandomGame()}
            </Link>
            <div className="flex justify-center items-center space-x-8 text-sm">
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-lg">${mainBal.toFixed(2)}</div>
                <div className="text-gray-400">Main Balance</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-bold text-lg">${vBal.toFixed(2)}</div>
                <div className="text-gray-400">Virtual (Demo)</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-x-4">
            <Link
              to="/register"
              className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="inline-block border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold text-lg px-8 py-4 rounded-xl transition-all"
            >
              Login
            </Link>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
          <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Provably Fair</h3>
          <p className="text-gray-400">Every roll is verifiable and transparent using cryptographic hashes</p>
        </div>

        <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
          <Zap className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Instant Payouts</h3>
          <p className="text-gray-400">Cash out anytime during your winning streak</p>
        </div>

        <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
          <Trophy className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Big Multipliers</h3>
          <p className="text-gray-400">Win up to ~2.2x per scoring roll (configurable)</p>
        </div>
      </div>

      {/* Games Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Casino Games</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* BarboDice */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:border-yellow-500/50 transition-all transform hover:scale-105">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-black" />
                </div>
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-black" />
                </div>
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-black" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">BarboDice</h3>
              <p className="text-gray-400 text-sm mb-4">
                Roll for singles, straights, and triples. Multiply your pot up to ~2.2x!
              </p>
              <div className="flex justify-center space-x-2 mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Live</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Provably Fair</span>
              </div>
              {user ? (
                <Link
                  to="/dice"
                  className="block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Play Now
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Register to Play
                </Link>
              )}
            </div>
          </div>

          {/* Dice Roulette */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:border-orange-500/50 transition-all transform hover:scale-105">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Dice Roulette</h3>
              <p className="text-gray-400 text-sm mb-4">
                Bet on dice outcomes with multiple betting options and big payouts!
              </p>
              <div className="flex justify-center space-x-2 mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Live</span>
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Multi-Bet</span>
              </div>
              {user ? (
                <Link
                  to="/diceroulette"
                  className="block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Play Now
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Register to Play
                </Link>
              )}
            </div>
          </div>

          {/* DiceBattle */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:border-red-500/50 transition-all transform hover:scale-105">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-white" />
                </div>
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mt-2">
                  <span className="text-black font-bold text-sm">VS</span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Dice6 className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">DiceBattle</h3>
              <p className="text-gray-400 text-sm mb-4">
                Challenge opponents in dice prediction battles. Closest guess wins!
              </p>
              <div className="flex justify-center space-x-2 mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Live</span>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">PvP</span>
              </div>
              {user ? (
                <Link
                  to="/dicebattle"
                  className="block bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Battle Now
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Register to Battle
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Featured Game Details */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Featured: BarboDice</h2>
          <div className="flex justify-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Dice6 className="h-8 w-8 text-black" />
            </div>
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Dice6 className="h-8 w-8 text-black" />
            </div>
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Dice6 className="h-8 w-8 text-black" />
            </div>
          </div>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Roll three dice and score points with singles (1s &amp; 5s), straights, or triples.
            Each winning roll multiplies your pot - cash out anytime or risk it all!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Scoring Rules */}
          <div className="bg-black/30 rounded-xl p-6">
            <h4 className="text-lg font-bold mb-4 text-center">Scoring Rules</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Each 1:</span>
                <span className="text-green-400 font-bold">100 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Each 5:</span>
                <span className="text-green-400 font-bold">50 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Straight (1-2-3, 2-3-4, 1-3-5, 2-4-6):</span>
                <span className="text-yellow-400 font-bold">100 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Triple (n-n-n):</span>
                <span className="text-purple-400 font-bold">n × 100 pts</span>
              </div>
            </div>
          </div>

          {/* Multiplier Table */}
          <div className="bg-black/30 rounded-xl p-6">
            <h4 className="text-lg font-bold mb-4 text-center">Multipliers</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>50pts:</span><span className="text-green-400">1.1x</span>
              </div>
              <div className="flex justify-between">
                <span>100pts:</span><span className="text-green-400">1.2x</span>
              </div>
              <div className="flex justify-between">
                <span>150pts:</span><span className="text-yellow-400">1.3x</span>
              </div>
              <div className="flex justify-between">
                <span>200pts:</span><span className="text-yellow-400">1.4x</span>
              </div>
              <div className="flex justify-between">
                <span>250pts:</span><span className="text-orange-400">1.6x</span>
              </div>
              <div className="flex justify-between">
                <span>300pts:</span><span className="text-orange-400">1.8x</span>
              </div>
              <div className="flex justify-between">
                <span>400pts:</span><span className="text-red-400">2.0x</span>
              </div>
              <div className="flex justify-between">
                <span>500pts:</span><span className="text-red-400">2.1x</span>
              </div>
              <div className="flex justify-between">
                <span>600pts:</span><span className="text-purple-400">2.2x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 text-center">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <Clock className="h-8 w-8 text-purple-400" />
          <h2 className="text-3xl font-bold">More Games Coming Soon</h2>
        </div>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          We&apos;re constantly expanding our casino with new exciting games. Stay tuned for blackjack, poker, roulette, slots, and more!
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm">Live Dealer Games</span>
          <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm">Tournament Mode</span>
          <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm">Progressive Jackpots</span>
          <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">VIP Rewards</span>
        </div>
      </div>
    </div>
  );
};

export default Home;
