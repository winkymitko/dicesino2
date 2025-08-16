import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Play, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DiceGame: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<string | null>(null);
  const [stake, setStake] = useState(5);
  const [useVirtual, setUseVirtual] = useState(true);
  const [totalPot, setTotalPot] = useState(0);
  const [lastRoll, setLastRoll] = useState<any>(null);
  const [gameActive, setGameActive] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [canCashOut, setCanCashOut] = useState(false);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const diceComponents = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

  const startGame = async () => {
    try {
      setError('');
      const response = await fetch('/api/games/dice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stake, useVirtual })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setGameId(data.gameId);
      setTotalPot(data.totalPot);
      setGameActive(true);
      setCanCashOut(false);
      setLastRoll(null);
      setShowResult(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const rollDice = async () => {
    if (!gameId) return;
    
    try {
      setRolling(true);
      setError('');
      
      // Generate client seed for provably fair
      const clientSeed = Math.random().toString(36).substring(2, 15);
      
      const response = await fetch('/api/games/dice/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId, clientSeed })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      // Simulate rolling animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLastRoll(data.round);
      setTotalPot(data.totalPot);
      setCanCashOut(data.canCashOut);
      
      if (data.gameOver) {
        setGameActive(false);
        setShowResult(true);
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  };

  const cashOut = async () => {
    if (!gameId) return;
    
    try {
      setError('');
      const response = await fetch('/api/games/dice/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId, useVirtual })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setGameActive(false);
      setShowResult(true);
      setCanCashOut(false);
      await refreshUser();
      
      alert(`Congratulations! You won $${data.finalPot.toFixed(2)}! Win streak: ${data.winStreak}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetGame = () => {
    setGameActive(false);
    setGameId(null);
    setLastRoll(null);
    setCanCashOut(false);
    setTotalPot(0);
    setShowResult(false);
  };

  const getScoreExplanation = (round: any) => {
    if (!round) return '';
    
    const { dice1, dice2, dice3, points } = round;
    
    if (dice1 === dice2 && dice2 === dice3) {
      return `Triple ${dice1}s = ${points} points`;
    }
    
    const sorted = [dice1, dice2, dice3].sort();
    if ((sorted[0] === 1 && sorted[1] === 3 && sorted[2] === 5) ||
        (sorted[0] === 2 && sorted[1] === 4 && sorted[2] === 6)) {
      return `Straight = ${points} points`;
    }
    
    let explanation = '';
    let ones = 0, fives = 0;
    [dice1, dice2, dice3].forEach(die => {
      if (die === 1) ones++;
      if (die === 5) fives++;
    });
    
    if (ones > 0) explanation += `${ones} × 1s = ${ones * 100} pts`;
    if (fives > 0) {
      if (explanation) explanation += ', ';
      explanation += `${fives} × 5s = ${fives * 50} pts`;
    }
    
    return explanation || 'No points';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Game Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">BarboDice</h1>
        <div className="flex justify-center items-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-green-400 font-bold text-xl">${user.virtualBalance.toFixed(2)}</div>
            <div className="text-gray-400">Virtual</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-xl">${user.realBalance.toFixed(2)}</div>
            <div className="text-gray-400">Real</div>
          </div>
          {/* <div className="text-center">
            <div className="text-blue-400 font-bold text-xl">{user.currentWinStreak}</div>
            <div className="text-gray-400">Win Streak</div>
          </div> */}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Game Controls */}
      {!gameActive && !showResult && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Start New Game</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Choose Stake</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[0.2, 0.5, 1, 2].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`p-3 rounded-lg font-bold transition-all ${
                      stake === amount
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    ${amount < 1 ? amount.toFixed(1) : amount}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[5, 10].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`p-3 rounded-lg font-bold transition-all ${
                      stake === amount
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Custom Amount</label>
                <input
                  type="number"
                  min="0.5"
                  max="1000"
                  step="0.1"
                  value={stake}
                  onChange={(e) => setStake(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-colors text-sm"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Balance Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setUseVirtual(true)}
                  className={`p-3 rounded-lg font-bold transition-all ${
                    useVirtual
                      ? 'bg-green-500 text-black'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Virtual
                </button>
                <button
                  onClick={() => setUseVirtual(false)}
                  className={`p-3 rounded-lg font-bold transition-all ${
                    !useVirtual
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Real
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
          >
            Start Game - ${stake}
          </button>
        </div>
      )}

      {/* Active Game */}
      {(gameActive || showResult) && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              Current Pot: ${totalPot.toFixed(2)}
            </div>
            <div className="text-gray-400">Stake: ${stake}</div>
          </div>

          {/* Dice Display */}
          <div className="flex justify-center space-x-4 mb-6">
            {lastRoll ? (
              [lastRoll.dice1, lastRoll.dice2, lastRoll.dice3].map((die, index) => {
                const DiceComponent = diceComponents[die - 1];
                return (
                  <div key={index} className="relative">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      <DiceComponent className="h-12 w-12 text-black" />
                    </div>
                  </div>
                );
              })
            ) : (
              [1, 2, 3].map((index) => (
                <div key={index} className="relative">
                  <div className={`w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg ${
                    rolling ? 'animate-spin' : ''
                  }`}>
                    <Dice1 className="h-12 w-12 text-black" />
                  </div>
                </div>
              ))
            )}
          </div>

          {lastRoll && (
            <div className="text-center mb-6 p-4 bg-black/30 rounded-lg">
              {gameActive && !showResult ? (
                <>
                  <div className="text-lg font-bold mb-2">
                    {getScoreExplanation(lastRoll)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Multiplier: {lastRoll.multiplier}x | Pot: ${lastRoll.potBefore.toFixed(2)} → ${lastRoll.potAfter.toFixed(2)}
                  </div>
                </>
              ) : showResult && lastRoll.points === 0 ? (
                <>
                  <div className="text-lg font-bold mb-2 text-red-400">
                    Game Over! No winning combination
                  </div>
                  <div className="text-sm text-gray-400">
                    {getScoreExplanation(lastRoll)} | Pot Lost: ${lastRoll.potBefore.toFixed(2)}
                  </div>
                </>
              ) : showResult && lastRoll.points > 0 ? (
                <>
                  <div className="text-lg font-bold mb-2 text-green-400">
                    Winning combination! You cashed out successfully!
                  </div>
                  <div className="text-sm text-gray-400">
                    {getScoreExplanation(lastRoll)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Multiplier: {lastRoll.multiplier}x | Pot: ${lastRoll.potBefore.toFixed(2)} → ${lastRoll.potAfter.toFixed(2)}
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div className="flex space-x-4">
            {gameActive && !showResult ? (
              <>
                <button
                  onClick={rollDice}
                  disabled={rolling}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Play className="h-5 w-5" />
                  <span>{rolling ? 'Rolling...' : 'Roll Dice'}</span>
                </button>
                
                {canCashOut && (
                  <button
                    onClick={cashOut}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>Cash Out</span>
                  </button>
                )}
              </>
            ) : showResult ? (
              <button
                onClick={resetGame}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-lg transition-all"
              >
                Play Again
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h3 className="text-xl font-bold mb-4 text-center">Scoring & Multipliers</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold mb-3">Scoring Rules</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Each 1:</span>
                <span className="text-green-400 font-bold">100 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Each 5:</span>
                <span className="text-green-400 font-bold">50 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Straight (1-3-5, 2-4-6):</span>
                <span className="text-yellow-400 font-bold">100 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Triple (n-n-n):</span>
                <span className="text-purple-400 font-bold">n × 100 pts</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-3">Multipliers</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
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
        
        <div className="mt-6 p-4 bg-black/30 rounded-lg">
          <h4 className="font-bold mb-2">How to Play</h4>
          <p className="text-sm text-gray-300">
            Roll three dice to score points. Your pot multiplies based on your score. 
            You can cash out after any winning roll, or risk it all for bigger multipliers. 
            Rolling zero points ends the game and you lose everything!
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiceGame;