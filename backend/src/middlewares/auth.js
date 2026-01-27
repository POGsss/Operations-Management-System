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

    // Verify the token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.log('Auth failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('User authenticated:', data.user.id);
    req.user = data.user;
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

      console.log('Checking role for user:', req.user.id);

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !data) {
        console.log('User role not found:', error?.message);
        return res.status(403).json({ error: 'User role not found' });
      }

      console.log('User role:', data.role);

      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = data.role;
      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
};