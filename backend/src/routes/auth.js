import express from 'express';
import { supabase } from '../db/index.js';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        error: 'Email, password, and role are required'
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUpWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      user: data,
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    console.log('Login attempt:', email);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Auth error:', error.message);
      return res.status(401).json({ error: error.message });
    }

    console.log('Auth successful, user ID:', data.user.id);

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('User profile error:', userError.message);
      return res.status(400).json({ error: userError.message });
    }

    console.log('User profile found:', userData.email, userData.role);

    res.json({
      session: data.session,
      user: userData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('Verifying token...');

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('Token verification failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('Token verified for user:', data.user.id);

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('User profile error:', userError.message);
      return res.status(400).json({ error: userError.message });
    }

    console.log('User profile found:', userData.email);
    res.json({ user: userData });
  } catch (error) {
    console.error('Me endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;