import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Swords, Users, Trophy, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DiceAnimation from '../components/DiceAnimation';

const DiceBattle: React.FC = () => {
  const { user, refreshUser, gameMode } = useAuth();
  const navigate = useNavigate();
  
  // Game state
  const [gameId, setGameId] = useState<string | null>(null);
  const [stake, setStake] = useState(5);
  const [useVirtual, setUseVirtual] = useState(true);
  const [playerGuess, setPlayerGuess] = useState(10);
  const [gameActive, setGameActive] = useState(false);
  const [matchmaking, setMatchmaking] = useState(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [rolling, setRolling] = useState(false);
  const [guessConfirmed, setGuessConfirmed] = useState(false);
  const [confirmedGuess, setConfirmedGuess] = useState<number>(10);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const diceComponents = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

  const startMatchmaking = async () => {
    try {
      setError('');
      setMatchmaking(true);
      
      // Simulate matchmaking delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      const response = await fetch('/api/games/dicebattle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stake, useVirtual: gameMode === 'virtual', playerGuess: 10 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setGameId(data.gameId);
      setOpponent(data.opponent);
      setGameActive(true);
      setMatchmaking(false);
      
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
      setMatchmaking(false);
    }
  };

  const rollDice = async () => {
    if (!gameId) return;
    
    try {
      setRolling(true);
      setError('');
      
      // Use the confirmed guess value
      const response = await fetch('/api/games/dicebattle/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId, playerGuess: confirmedGuess })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      // Simulate rolling animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBattleResult(data);
      setGameActive(false);
      setGameId(null);
      await refreshUser();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  };

  const resetGame = () => {
    setGameActive(false);
    setGameId(null);
    setOpponent(null);
    setBattleResult(null);
    setMatchmaking(false);
    setRolling(false);
    setGuessConfirmed(false);
    // Don't reset playerGuess - keep user's current guess
    setConfirmedGuess(10); // Reset confirmed guess for next battle
    setError('');
  };

  const confirmGuess = () => {
    // Get the current value directly from the slider element to avoid async state issues
    const sliderElement = document.querySelector('input[type="range"]') as HTMLInputElement;
    const currentGuess = sliderElement ? parseInt(sliderElement.value) : playerGuess;
    setConfirmedGuess(currentGuess);
    setPlayerGuess(currentGuess); // Ensure state is in sync
    setGuessConfirmed(true);
  };
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Game Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Swords className="h-8 w-8 text-red-500" />
          <h1 className="text-4xl font-bold">DiceBattle</h1>
          <Swords className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-400 mb-6">Challenge opponents in dice prediction battles!</p>
        
        <div className="text-center mb-6">
          <div className={`font-bold text-2xl ${gameMode === 'virtual' ? 'text-purple-400' : 'text-yellow-400'}`}>
            ${gameMode === 'virtual' ? (user.virtualBalance || 0).toFixed(2) : ((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)}
          </div>
          <div className="text-gray-400">{gameMode === 'virtual' ? 'Virtual' : 'Real'} Balance</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Matchmaking */}
      {matchmaking && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center mb-6">
          <Users className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold mb-2">Finding Opponent...</h3>
          <p className="text-gray-400 mb-4">Matching you with a player at ${stake} stake level</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        </div>
      )}

      {/* Game Setup */}
      {!gameActive && !matchmaking && !battleResult && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-center">Start Battle</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Choose Stake</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[0.1, 0.2, 0.5, 1].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`p-3 rounded-lg font-bold transition-all text-sm ${
                      stake === amount
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    ${amount < 1 ? amount.toFixed(1) : amount}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[2, 5, 10, 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`p-3 rounded-lg font-bold transition-all ${
                      stake === amount
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Battle Info</label>
              <div className="p-3 bg-black/30 border border-white/20 rounded-lg">
                <div className="text-sm text-gray-300">
                  Predict dice sum (3-18)
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Closest guess wins the pot!
                </div>
              </div>
            </div>

          </div>
          
          <button
            onClick={startMatchmaking}
            className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <Target className="h-5 w-5" />
            <span>Find Battle - ${stake}</span>
          </button>
        </div>
      )}

      {/* Active Battle */}
      {gameActive && opponent && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Battle in Progress!</h3>
            <div className="text-lg text-yellow-400">Prize Pool: ${(stake * 2 * 0.95).toFixed(2)}</div>
            <div className="text-sm text-gray-400">House Edge: 5%</div>
          </div>

          {/* Opponent vs Player */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-red-400 mb-2">{opponent.name}</div>
              <div className="text-sm text-gray-400 mb-2">
                {guessConfirmed ? "Opponent's Guess" : "Waiting for your guess..."}
              </div>
              <div className="text-3xl font-bold">
                {guessConfirmed ? opponent.guess : "?"}
              </div>
              <div className="text-xs text-gray-500 mt-2">Level {opponent.level} • {opponent.wins}W/{opponent.losses}L</div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-blue-400 mb-2">You</div>
              <div className="text-sm text-gray-400 mb-2">Your Guess</div>
              <div className="text-3xl font-bold">
                {guessConfirmed ? confirmedGuess : "?"}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {guessConfirmed ? "Guess confirmed!" : "Set your guess below"}
              </div>
            </div>
          </div>

          {!guessConfirmed ? (
            <>
              {/* Guess Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-center">Set Your Guess (3-18)</label>
                <div className="relative max-w-md mx-auto">
                  <input
                    type="range"
                    min="3"
                    max="18"
                    value={playerGuess}
                    onChange={(e) => setPlayerGuess(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-center mt-2">
                    <span className="text-2xl font-bold text-blue-400">{playerGuess}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Choose wisely - you can't change it after confirming!
                </p>
              </div>

              <button
                onClick={confirmGuess}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all mb-6"
              >
                Confirm Guess: {playerGuess}
              </button>
            </>
          ) : (
            <>
              {/* Dice Display */}
              <div className="flex justify-center mb-6">
                <DiceAnimation 
                  isRolling={rolling}
                  diceValues={[1, 1, 1]}
                  size={80}
                />
              </div>

              <button
                onClick={rollDice}
                disabled={rolling}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <Swords className="h-5 w-5" />
                <span>{rolling ? 'Rolling Dice...' : 'Roll for Battle!'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Battle Result */}
      {battleResult && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-4">Battle Complete!</h3>
          </div>

          {/* Final Dice */}
          <div className="flex justify-center mb-6">
            <DiceAnimation 
              isRolling={false}
              diceValues={[battleResult.dice1, battleResult.dice2, battleResult.dice3]}
              size={80}
            />
          </div>

          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              Total: {battleResult.total}
            </div>
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg text-center ${
              battleResult.winner === 'opponent' ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-500/20 border border-gray-500/30'
            }`}>
              <div className="font-bold">{battleResult.opponent.name}</div>
              <div className="text-sm text-gray-400">Guessed: {battleResult.opponent.guess}</div>
              <div className="text-sm">Distance: {battleResult.opponentDistance}</div>
              {battleResult.winner === 'opponent' && <Trophy className="h-6 w-6 text-yellow-400 mx-auto mt-2" />}
            </div>
            
            <div className={`p-4 rounded-lg text-center ${
              battleResult.winner === 'player' ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-500/20 border border-gray-500/30'
            }`}>
              <div className="font-bold">You</div>
              <div className="text-sm text-gray-400">Guessed: {battleResult.playerGuess}</div>
              <div className="text-sm">Distance: {battleResult.playerDistance}</div>
              {battleResult.winner === 'player' && <Trophy className="h-6 w-6 text-yellow-400 mx-auto mt-2" />}
            </div>
          </div>

          <div className="text-center mb-6">
            {battleResult.winner === 'player' ? (
              <div className="text-green-400 text-xl font-bold">
                🎉 Victory! You won ${battleResult.winnings.toFixed(2)}!
              </div>
            ) : battleResult.winner === 'tie' ? (
              <div className="text-yellow-400 text-xl font-bold">
                🤝 It's a Tie! Your stake ${stake.toFixed(2)} was returned
              </div>
            ) : (
              <div className="text-red-400 text-xl font-bold">
                💔 Defeat! You lost ${stake.toFixed(2)}
              </div>
            )}
          </div>

          <button
            onClick={resetGame}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            Battle Again
          </button>
        </div>
      )}

      {/* Game Rules */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h3 className="text-xl font-bold mb-4 text-center">How to Play DiceBattle</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold mb-3 text-red-400">Battle Rules</h4>
            <div className="space-y-2 text-sm">
              <div>• Choose your stake: $5, $10, $20, or $50</div>
              <div>• Predict the sum of 3 dice (3-18)</div>
              <div>• Get matched with an opponent</div>
              <div>• Closest guess to actual roll wins</div>
              <div>• Winner takes 95% of total pot</div>
              <div>• House keeps 5% commission</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-3 text-blue-400">Strategy Tips</h4>
            <div className="space-y-2 text-sm">
              <div>• Most common totals: 10, 11, 12</div>
              <div>• Least common: 3, 4, 17, 18</div>
              <div>• Consider opponent psychology</div>
              <div>• Manage your bankroll wisely</div>
              <div>• Study opponent patterns</div>
              <div>• Practice with virtual money first</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceBattle;