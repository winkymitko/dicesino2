import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  phone?: string;
  cashBalance: number;
  bonusBalance: number;
  lockedBalance: number;
  virtualBalance: number;
  activeWageringRequirement: number;
  currentWageringProgress: number;
  wageringMultiplier: number;
  isAdmin: boolean;
  currentWinStreak: number;
  totalGameWins: number;
  totalGameLosses: number;
  diceGameEdge: number;
  diceBattleEdge: number;
  maxBetWhileBonus: number;
  maxBonusCashout: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  gameMode: 'virtual' | 'real';
  setGameMode: (mode: 'virtual' | 'real') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameMode, setGameMode] = useState<'virtual' | 'real'>('virtual');

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Invalid credentials');
    }
    
    const data = await response.json();
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const data = await response.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include' 
    });
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, gameMode, setGameMode }}>
      {children}
    </AuthContext.Provider>
  );
};