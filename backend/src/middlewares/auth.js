import { supabase } from '../db/index.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed' });
  }
};

export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !data) {
        return res.status(403).json({ error: 'User role not found' });
      }

      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = data.role;
      next();
    } catch (error) {
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
};