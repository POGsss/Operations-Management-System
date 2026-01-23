# Supabase Authentication Setup Guide

This guide will help you set up real authentication using Supabase for the Operations Management System. Follow each step carefully.

---

## Table of Contents
1. [Supabase Project Setup](#supabase-project-setup)
2. [Database Schema](#database-schema)
3. [Supabase Authentication Configuration](#supabase-authentication-configuration)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Testing](#testing)

---

## Supabase Project Setup

### Step 1: Create a Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start Your Project" and sign up
3. Create a new organization and project

### Step 2: Get Your Credentials
1. In your Supabase dashboard, go to **Settings → API**
2. Copy these credentials and add them to your `.env` files:
   - `VITE_SUPABASE_URL` - Project URL
   - `VITE_SUPABASE_ANON_KEY` - Anon Public Key

### Step 3: Update Backend `.env`
```bash
# backend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=4000
NODE_ENV=development
```

### Step 4: Update Frontend `.env`
```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Database Schema

### Step 1: Create Users Table
This table extends Supabase's built-in auth system with additional user information.

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query and paste:

```sql
-- Create extended users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to read their own data
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Create RLS policy for authenticated users to read all users
CREATE POLICY "Authenticated users can read all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
```

3. Click "Run" to execute

### Step 2: Create Roles Table
```sql
-- Create roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles
CREATE POLICY "Anyone can read roles" ON public.roles
  FOR SELECT USING (true);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('branch_manager', 'Branch Manager'),
  ('service_advisor', 'Service Advisor'),
  ('mechanic', 'Mechanic'),
  ('inventory_officer', 'Inventory Officer'),
  ('executive', 'Executive')
ON CONFLICT DO NOTHING;
```

3. Click "Run" to execute

---

## Supabase Authentication Configuration

### Step 1: Enable Email/Password Authentication
1. Go to **Authentication → Providers** in Supabase dashboard
2. Make sure "Email" is enabled with "Email/Password" option

### Step 2: Configure Email Templates (Optional)
1. Go to **Authentication → Email Templates**
2. Customize confirmation and reset email templates as needed

### Step 3: Set Redirect URLs
1. Go to **Authentication → URL Configuration**
2. Add these redirect URLs:
   - Localhost: `http://localhost:5173/dashboard`
   - Production: `https://yourdomain.com/dashboard`

---

## Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install @supabase/supabase-js jsonwebtoken
```

### Step 2: Create Auth Routes
Create `backend/src/routes/auth.js`:

```javascript
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

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.json({
      session: data.session,
      user: userData,
      message: 'Login successful'
    });
  } catch (error) {
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

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Step 3: Create Middleware for JWT Verification
Create `backend/src/middlewares/auth.js`:

```javascript
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
```

### Step 4: Update Backend App
Update `backend/src/app.js`:

```javascript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { verifyToken } from './middlewares/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    userId: req.user.id
  });
});

export default app;
```

---

## Frontend Setup

### Step 1: Install Supabase Client
```bash
cd frontend
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Client
Create `frontend/src/lib/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 3: Update AuthContext
Update `frontend/src/context/AuthContext.jsx`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Initialize auth state
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user.id, session.access_token);
        } else {
          setUser(null);
          setRole(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, token) => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setRole(data.user.role);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await fetchUserProfile(data.user.id, data.session.access_token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email, password, role, fullName) => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      // Auto-login after registration
      await login(email, password);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setSession(null);
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      session,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Step 4: Update Login Component
Update the login component to use the new authentication:

```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  if (!email || !password) {
    setError('Email and password are required');
    setLoading(false);
    return;
  }

  if (!email.includes('@')) {
    setError('Please enter a valid email');
    setLoading(false);
    return;
  }

  const success = await login(email, password);

  if (success) {
    navigate('/dashboard');
  } else {
    setError('Login failed. Please check your credentials.');
  }
  setLoading(false);
};
```

---

## Testing

### Step 1: Test Registration
1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. Go to registration page (create one if needed)
3. Register a new user with:
   - Email: test@example.com
   - Password: TestPassword123!
   - Role: admin

### Step 2: Test Login
1. Use the credentials from registration to log in
2. Check that the user is redirected to dashboard
3. Verify user data is loaded correctly

### Step 3: Test Protected Routes
1. Make a request to the protected endpoint:
   ```bash
   curl -H "Authorization: Bearer <your_access_token>" \
     http://localhost:4000/api/protected
   ```

### Step 4: Test Logout
1. Click logout button
2. Verify redirect to login page
3. Check localStorage is cleared

---

## Troubleshooting

### Issue: "Supabase credentials not found"
- **Solution**: Make sure `.env` files are in the correct locations with correct variable names

### Issue: "CORS error when logging in"
- **Solution**: Check that CORS is enabled in backend and correct URLs in frontend

### Issue: "Invalid token" error
- **Solution**: Make sure the token is being sent correctly with `Bearer` prefix

### Issue: RLS policy errors
- **Solution**: Check that row-level security policies are created correctly in Supabase

---

## Next Steps

1. Add role-based dashboards
2. Create protected API routes for different roles
3. Implement password reset functionality
4. Add multi-factor authentication
5. Set up user profile management

For more information, visit [Supabase Docs](https://supabase.com/docs)
