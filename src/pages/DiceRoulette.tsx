import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Target, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DiceRoulette: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [bets, setBets] = useState<{[key: string]: number}>({});
  const [totalBet, setTotalBet] = useState(0);
  const [useVirtual, setUseVirtual] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    const total = Object.values(bets).reduce((sum, bet) => sum + bet, 0);
    setTotalBet(total);
  }, [bets]);

  if (!user) return null;

  const diceComponents = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

  const placeBet = (betType: string, amount: number) => {
    setBets(prev => ({
      ...prev,
      [betType]: (prev[betType] || 0) + amount
    }));
  };

  const clearBets = () => {
    setBets({});
  };

  const rollDice = async () => {
    if (totalBet === 0) {
      setError('Place at least one bet');
      return;
    }

    try {
      setRolling(true);
      setError('');
      
      const response = await fetch('/api/games/diceroulette/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bets, useVirtual })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLastRoll(data.roll);
      setResults(data.results);
      setBets({});
      await refreshUser();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Dice Roulette</h1>
        <div className="flex justify-center items-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-green-400 font-bold text-xl">${(user.virtualBalance || 0).toFixed(2)}</div>
            <div className="text-gray-400">Virtual</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-xl">${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}</div>
            <div className="text-gray-400">Real</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Dice Display */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
        <div className="flex justify-center space-x-4 mb-6">
          {lastRoll ? (
            [lastRoll.dice1, lastRoll.dice2, lastRoll.dice3].map((die: number, index: number) => {
              const DiceComponent = diceComponents[die - 1];
              return (
                <div key={index} className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <DiceComponent className="h-12 w-12 text-black" />
                </div>
              );
            })
          ) : (
            [1, 2, 3].map((index) => (
              <div key={index} className={`w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg ${rolling ? 'animate-spin' : ''}`}>
                <Dice1 className="h-12 w-12 text-black" />
              </div>
            ))
          )}
        </div>
        
        {lastRoll && (
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Sum: {lastRoll.sum}</div>
            {results && (
              <div className="text-lg">
                {results.totalWin > 0 ? (
                  <span className="text-green-400">Won: ${results.totalWin.toFixed(2)}</span>
                ) : (
                  <span className="text-red-400">Lost: ${results.totalLost.toFixed(2)}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Betting Table */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Number Bets */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h3 className="text-xl font-bold mb-4">Number Bets (2.2x)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <div key={num} className="text-center">
                <div className="bg-blue-500/20 rounded-lg p-3 mb-2">
                  <div className="text-lg font-bold">{num}</div>
                  <div className="text-xs text-gray-400">Any die shows {num}</div>
                </div>
                <div className="text-sm font-bold">${(bets[`number_${num}`] || 0).toFixed(2)}</div>
                <div className="flex gap-1 mt-1">
                  {[1, 5, 10].map(amount => (
                    <button
                      key={amount}
                      onClick={() => placeBet(`number_${num}`, amount)}
                      className="px-2 py-1 bg-blue-500/30 hover:bg-blue-500/50 rounded text-xs"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sum Bets */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h3 className="text-xl font-bold mb-4">Sum Bets</h3>
          <div className="space-y-2">
            {[
              { type: 'odd', label: 'Odd Sum', payout: '1.9x' },
              { type: 'even', label: 'Even Sum', payout: '1.9x' },
              { type: 'low', label: 'Low (3-9)', payout: '1.9x' },
              { type: 'high', label: 'High (10-18)', payout: '1.9x' }
            ].map(bet => (
              <div key={bet.type} className="flex items-center justify-between bg-green-500/20 rounded-lg p-3">
                <div>
                  <div className="font-bold">{bet.label}</div>
                  <div className="text-xs text-gray-400">{bet.payout}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">${(bets[bet.type] || 0).toFixed(2)}</div>
                  <div className="flex gap-1 mt-1">
                    {[1, 5, 10].map(amount => (
                      <button
                        key={amount}
                        onClick={() => placeBet(bet.type, amount)}
                        className="px-2 py-1 bg-green-500/30 hover:bg-green-500/50 rounded text-xs"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-bold">Total Bet: ${totalBet.toFixed(2)}</div>
            <div className="flex space-x-2">
              <button
                onClick={() => setUseVirtual(true)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  useVirtual ? 'bg-green-500 text-black' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Virtual
              </button>
              <button
                onClick={() => setUseVirtual(false)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  !useVirtual ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Real
              </button>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={clearBets}
              className="px-6 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
            >
              Clear Bets
            </button>
            <button
              onClick={rollDice}
              disabled={rolling || totalBet === 0}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center space-x-2"
            >
              <Target className="h-5 w-5" />
              <span>{rolling ? 'Rolling...' : 'Roll Dice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceRoulette;