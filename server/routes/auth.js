import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Grant signup bonus
async function grantSignupBonus(userId) {
  const bonusAmount = 50; // $50 signup bonus
  const wageringMultiplier = 20; // 20x wagering requirement
  const wageringRequired = bonusAmount * wageringMultiplier;
  
  // Create bonus record
  await prisma.bonus.create({
    data: {
      userId,
      amount: bonusAmount,
      type: 'signup',
      description: 'Welcome bonus',
      wageringRequired,
      wageringMultiplier
    }
  });
  
  // Update user balances
  await prisma.user.update({
    where: { id: userId },
    data: {
      bonusBalance: { increment: bonusAmount },
      activeWageringRequirement: { increment: wageringRequired }
    }
  });
  
  // Create transaction record
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.transaction.create({
    data: {
      userId,
      type: 'bonus_grant',
      amount: bonusAmount,
      bonusChange: bonusAmount,
      cashBalanceAfter: user.cashBalance,
      bonusBalanceAfter: user.bonusBalance,
      lockedBalanceAfter: user.lockedBalance,
      virtualBalanceAfter: user.virtualBalance,
      description: 'Welcome bonus granted',
      reference: 'signup'
    }
  });
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate username from email (part before @)
    const username = email.split('@')[0];
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        isAdmin: email === process.env.ADMIN_EMAIL
      }
    });
    
    console.log('User created successfully:', user.id);
    
    // Grant signup bonus
    try {
      await grantSignupBonus(user.id);
      console.log('Signup bonus granted successfully');
    } catch (bonusError) {
      console.error('Failed to grant signup bonus:', bonusError);
      // Don't fail registration if bonus fails
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.cookie('token', token, { httpOnly: true });
    
    // Fetch updated user with bonus
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Try to find user by email first, then by username
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    // If not found by email, try username
    if (!user) {
      user = await prisma.user.findFirst({
        where: { username: email } // User entered username in email field
      });
    }
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.cookie('token', token, { httpOnly: true });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const { password, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Update profile
router.post('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || null,
        phone: phone || null
      }
    });
    
    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, req.user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;