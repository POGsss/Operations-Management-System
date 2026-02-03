import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../db/index.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase using admin API
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(token);

    if (error || !data.user) {
      console.log('Token verification failed:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Token verified for user:', data.user.id);

    // Attach user to request
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Token verification failed' });
  }
};

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Create a Supabase client with the user's token to verify it
    const supabaseWithToken = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Get the authenticated user
    const { data, error } = await supabaseWithToken.auth.getUser();

    if (error || !data.user) {
      console.log('Auth failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('User authenticated:', data.user.id);

    // Get the public user record
    const { data: publicUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !publicUser) {
      console.log('Public user not found, creating demo profile for:', data.user.id, data.user.email);

      // For demo purposes, create a user profile if it doesn't exist
      const demoProfile = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        role: 'admin', // Default to admin for demo
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([demoProfile])
        .select()
        .single();

      if (createError) {
        console.log('Failed to create demo user profile:', createError.message);
        return res.status(403).json({ error: 'Failed to create user profile. Please contact administrator.' });
      }

      console.log('Demo user profile created:', newUser.id);
      req.user = newUser;
    } else {
      req.user = publicUser;
    }

    // Attach auth user to request
    req.authUser = data.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      console.log('Checking role for user:', req.user.id, 'Role:', req.user.role);

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = req.user.role;
      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
};