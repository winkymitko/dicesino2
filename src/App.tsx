import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DiceGame from './pages/DiceGame';
import DiceBattle from './pages/DiceBattle';
import DiceRoulette from './pages/DiceRoulette';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import TopUp from './pages/TopUp';
import { AuthProvider, useAuth } from './context/AuthContext';
import FloatingReportButton from './components/FloatingReportButton';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <Header />
      <main className="pt-16 pb-20">
        <Routes>
          <Route path="/" element={user?.isAffiliate ? <Profile /> : <Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dice" element={<DiceGame />} />
          <Route path="/dicebattle" element={<DiceBattle />} />
          <Route path="/diceroulette" element={<DiceRoulette />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/topup" element={<TopUp />} />
        </Routes>
      </main>
      <Footer />
      <FloatingReportButton />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;