import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dice6, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
              DiceCasino
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            {user && (
              <Link to="/dice" className="text-gray-300 hover:text-white transition-colors">
                Dice Game
              </Link>
            )}
            {user && (
              <Link to="/dicebattle" className="text-gray-300 hover:text-white transition-colors">
                DiceBattle
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end text-sm">
                  <span className="text-green-400">${user.virtualBalance.toFixed(2)} Virtual</span>
                  <span className="text-yellow-400">${user.realBalance.toFixed(2)} Real</span>
                </div>
                
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
    </header>
  );
};

export default Header;