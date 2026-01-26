import express from 'express';
import { supabase, supabaseAdmin } from '../db/index.js';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;

    // Validate input
    if (!email || !password || !role || !fullName) {
      return res.status(400).json({
        error: 'Email, password, role, and full name are required'
      });
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Auth creation error:', authError.message);
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const { data, error } = await supabaseAdmin
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
      console.error('User profile creation error:', error.message);
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      user: data,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Register error:', error.message);
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

// Delete user endpoint
router.delete('/delete-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Deleting user:', userId);

    // Delete from users table first
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Database delete error:', dbError.message);
      return res.status(400).json({ error: 'Failed to delete user from database: ' + dbError.message });
    }

    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth delete error:', authError.message);
      // Log the error but don't fail - user is already deleted from database
      console.warn('Note: User deleted from database but auth deletion may have failed:', authError.message);
    }

    console.log('User deleted successfully:', userId);
    res.json({ 
      message: 'User deleted successfully',
      userId: userId
    });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;