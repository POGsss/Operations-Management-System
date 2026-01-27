import express from 'express';
import { supabase, supabaseAdmin } from '../db/index.js';
import { logAuditEvent } from '../utils/auditLog.js';
import { verifyToken, authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Register route - ADMIN ONLY
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const adminId = req.user.id; // From auth middleware

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is admin (using admin client to bypass RLS)
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminCheckError || !adminUser) {
      console.error('Admin check failed:', adminCheckError?.message);
      await logAuditEvent({
        userId: adminId,
        action: 'CREATE',
        entityType: 'USER',
        entityName: email,
        details: { role },
        status: 'FAILED',
        errorMessage: 'Admin profile not found',
      });
      return res.status(403).json({ error: 'Admin profile not found' });
    }

    if (adminUser.role !== 'admin') {
      console.error('Only admins can create users. User role:', adminUser.role);
      await logAuditEvent({
        userId: adminId,
        action: 'CREATE',
        entityType: 'USER',
        entityName: email,
        details: { role, attemptedBy: adminUser.role },
        status: 'FAILED',
        errorMessage: `Only admins can create users. User role: ${adminUser.role}`,
      });
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    console.log('Admin', adminId, 'creating user:', email);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth creation error:', authError.message);
      await logAuditEvent({
        userId: adminId,
        action: 'CREATE',
        entityType: 'USER',
        entityName: email,
        details: { role },
        status: 'FAILED',
        errorMessage: authError.message,
      });
      return res.status(400).json({ error: authError.message });
    }

    console.log('Auth user created:', authData.user.id);

    // Create user profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error('User profile creation error:', userError.message);
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await logAuditEvent({
        userId: adminId,
        action: 'CREATE',
        entityType: 'USER',
        entityName: email,
        details: { role },
        status: 'FAILED',
        errorMessage: userError.message,
      });
      return res.status(400).json({ error: 'Failed to create user profile: ' + userError.message });
    }

    console.log('User profile created:', userData.id);

    // Log the user creation event - SUCCESS
    await logAuditEvent({
      userId: adminId,
      action: 'CREATE',
      entityType: 'USER',
      entityId: authData.user.id,
      entityName: email,
      details: {
        email,
        fullName,
        role,
        createdBy: adminId,
        createdAt: new Date().toISOString(),
      },
      status: 'SUCCESS',
    });

    console.log('User created successfully and logged');

    res.status(201).json({
      message: 'User created successfully',
      user: userData,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Log failed login attempt - use service role to bypass RLS
      // For failed logins, we still need to log them but can't reference a user yet
      console.log('Failed login attempt for:', email);
      
      const { data: auditData, error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert([{
          user_id: null, // For failed logins before user exists
          action: 'LOGIN',
          entity_type: 'AUTHENTICATION',
          entity_name: email,
          details: {
            email,
            role,
            attemptedAt: new Date().toISOString(),
          },
          status: 'FAILED',
          error_message: authError.message,
          created_at: new Date().toISOString(),
        }])
        .select();

      if (auditError) {
        console.error('Failed to log failed login attempt:', auditError.message);
      }

      return res.status(401).json({ error: authError.message });
    }

    const userId = data.user.id;

    // Fetch user profile (using admin client to bypass RLS)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      // Log failed login due to missing profile
      console.log('User profile not found for ID:', userId);
      
      await supabaseAdmin
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action: 'LOGIN',
          entity_type: 'AUTHENTICATION',
          entity_name: email,
          details: {
            email,
            role,
            attemptedAt: new Date().toISOString(),
          },
          status: 'FAILED',
          error_message: 'User profile not found',
          created_at: new Date().toISOString(),
        }])
        .select();

      return res.status(401).json({ error: 'User profile not found' });
    }

    // Log successful login
    await supabaseAdmin
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'LOGIN',
        entity_type: 'AUTHENTICATION',
        entity_name: email,
        details: {
          email,
          role: userProfile.role,
          loginAt: new Date().toISOString(),
        },
        status: 'SUCCESS',
        created_at: new Date().toISOString(),
      }])
      .select();

    console.log('Login successful for user:', email);

    res.json({
      message: 'Login successful',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.role,
        avatar_url: userProfile.avatar_url,
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
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

// Delete user route - ADMIN ONLY
router.delete('/delete-user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id; // From auth middleware

    console.log('Delete request from user:', adminId, 'for user:', userId);

    // Check if requester is admin (using admin client to bypass RLS)
    const { data: requesterUser, error: requesterCheckError } = await supabaseAdmin
      .from('users')
      .select('role, full_name, email')
      .eq('id', adminId)
      .single();

    if (requesterCheckError || !requesterUser) {
      console.error('Requester check failed:', requesterCheckError?.message);
      await logAuditEvent({
        userId: adminId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: userId,
        status: 'FAILED',
        errorMessage: 'Requester profile not found',
      });
      return res.status(403).json({ error: 'Requester profile not found' });
    }

    if (requesterUser.role !== 'admin') {
      console.error('Only admins can delete users. Requester role:', requesterUser.role);
      await logAuditEvent({
        userId: adminId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: userId,
        status: 'FAILED',
        errorMessage: `Only admins can delete users. Requester role: ${requesterUser.role}`,
      });
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    console.log('Requester is admin:', requesterUser.email);

    // Fetch user to delete (using admin client to bypass RLS)
    const { data: userToDelete, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !userToDelete) {
      console.error('User not found:', fetchError?.message);
      await logAuditEvent({
        userId: adminId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: userId,
        status: 'FAILED',
        errorMessage: 'User not found',
      });
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Found user to delete:', userToDelete.email);

    // Delete from users table using service role
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete error:', deleteError.message);
      // Log failed deletion
      await logAuditEvent({
        userId: adminId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: userId,
        entityName: userToDelete.full_name,
        details: {
          email: userToDelete.email,
          role: userToDelete.role,
          deletedBy: adminId,
          deletedByEmail: requesterUser.email,
        },
        status: 'FAILED',
        errorMessage: deleteError.message,
      });

      return res.status(400).json({ error: deleteError.message });
    }

    console.log('User deleted from database:', userId);

    // Delete from Supabase Auth using service role
    await supabaseAdmin.auth.admin.deleteUser(userId);

    console.log('User deleted from auth:', userId);

    // Log successful deletion
    await logAuditEvent({
      userId: adminId,
      action: 'DELETE',
      entityType: 'USER',
      entityId: userId,
      entityName: userToDelete.full_name,
      details: {
        email: userToDelete.email,
        role: userToDelete.role,
        deletedBy: adminId,
        deletedByEmail: requesterUser.email,
        deletedAt: new Date().toISOString(),
      },
      status: 'SUCCESS',
    });

    console.log('Deletion logged successfully');

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: userId,
        email: userToDelete.email,
        fullName: userToDelete.full_name,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;