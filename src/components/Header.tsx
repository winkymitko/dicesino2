import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dice6, User, LogOut, Settings, Plus, ChevronDown, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user, logout, gameMode, setGameMode } = useAuth();
  const navigate = useNavigate();
  const [showBalanceBreakdown, setShowBalanceBreakdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-b border-yellow-500/20 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Dice6 className="h-8 w-8 text-yellow-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              DiceSino
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {!user?.isAffiliate && (
              <>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
                {user && (
                  <Link to="/dice" className="text-gray-300 hover:text-white transition-colors">
                    BarboDice
                  </Link>
                )}
                {user && (
                  <Link to="/dicebattle" className="text-gray-300 hover:text-white transition-colors">
                    DiceBattle
                  </Link>
                )}
                {user && (
                  <Link to="/diceroulette" className="text-gray-300 hover:text-white transition-colors">
                    DiceRoulette
                  </Link>
                )}
              </>
            )}
            
            {/* Game Mode Toggle */}
            {user && !user.isAffiliate && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setGameMode(gameMode === 'virtual' ? 'real' : 'virtual')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    gameMode === 'real' ? 'bg-green-600' : 'bg-purple-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gameMode === 'real' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-medium ${
                  gameMode === 'real' ? 'text-green-400' : 'text-purple-400'
                }`}>
                  {gameMode === 'real' ? 'REAL' : 'DEMO'}
                </span>
              </div>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {!user.isAffiliate && (
                  <div className="hidden sm:flex flex-col items-end text-sm cursor-pointer" onClick={() => setShowBalanceBreakdown(!showBalanceBreakdown)}>
                    <span className="text-yellow-400 font-bold">
                      ${((user.cashBalance || 0) + (user.bonusBalance || 0) + (user.lockedBalance || 0)).toFixed(2)} Main
                    </span>
                    <span className="text-gray-400 text-xs">Click for breakdown</span>
                  </div>
                )}
                
                {/* Balance Breakdown Dropdown */}
                {showBalanceBreakdown && !user.isAffiliate && (
                  <div className="absolute top-16 right-4 bg-gray-900 border border-white/20 rounded-lg p-4 shadow-xl z-50 min-w-64">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-400">💰 Cash (Withdrawable)</span>
                        <span className="font-bold">${(user.cashBalance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400">🎁 Bonus (Play-only)</span>
                        <span className="font-bold">${(user.bonusBalance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-orange-400">🔒 Locked (Pending WR)</span>
                        <span className="font-bold">${(user.lockedBalance || 0).toFixed(2)}</span>
                      </div>
                      <hr className="border-white/20" />
                      <div className="flex justify-between items-center">
                        <span className="text-purple-400">🎮 Virtual (Demo)</span>
                        <span className="font-bold">${(user.virtualBalance || 0).toFixed(2)}</span>
                      </div>
                      
                      {/* Wagering Progress */}
                      {(user.activeWageringRequirement || 0) > 0 && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                          <div className="text-sm text-blue-400 mb-2">Wagering Progress</div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(100, ((user.currentWageringProgress || 0) / (user.activeWageringRequirement || 1)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-400">
                            ${(user.currentWageringProgress || 0).toFixed(2)} / ${(user.activeWageringRequirement || 0).toFixed(2)} wagered
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {!user.isAffiliate && (
                  <Link
                  to="/topup"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-3 py-2 rounded-lg transition-all flex items-center space-x-1"
                  >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Top Up</span>
                  </Link>
                )}
                
                <div className="flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                  
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium px-4 py-2 rounded-lg transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Game Mode Indicator */}
      {user && !user.isAffiliate && gameMode === 'virtual' && (
        <div className="fixed top-20 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold z-40">
          DEMO MODE
        </div>
      )}
    </header>
  );
};

export default Header;