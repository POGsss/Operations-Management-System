# Fix Login Audit Logs - Complete Guide

## Problem
Login actions are not showing in the Audit Logs dashboard, but CREATE and DELETE actions are showing.

## Root Cause
The `audit_logs` table likely has:
1. **NOT NULL constraint on user_id** - prevents logging failed login attempts (where user doesn't exist yet)
2. **Restrictive RLS policies** - may be preventing audit_logs INSERT with null user_id
3. **No READ policy for admins** - admin can't see all logs including failed logins

## Solution

### Step 1: Go to Supabase SQL Editor

1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste ALL the SQL below
5. Click **Run**

### Step 2: Copy and Paste This SQL

```sql
-- ============================================
-- STEP 1: Fix audit_logs Table Structure
-- ============================================

-- Allow NULL user_id for failed login attempts
ALTER TABLE audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Add cascade delete if not present
-- (already should be there, but verify)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 2: Clear Old RLS Policies
-- ============================================

-- Remove all existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert logs" ON audit_logs;
DROP POLICY IF EXISTS "authenticated_read_logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can only see their own logs" ON audit_logs;
DROP POLICY IF EXISTS "service_role_full_access" ON audit_logs;
DROP POLICY IF EXISTS "service_role_insert_logs" ON audit_logs;
DROP POLICY IF EXISTS "users_read_own_logs" ON audit_logs;
DROP POLICY IF EXISTS "admins_read_all_logs" ON audit_logs;

-- ============================================
-- STEP 3: Create New RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role (backend) can insert ANY log (even with null user_id)
CREATE POLICY "service_role_insert"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 2: Service role can read everything
CREATE POLICY "service_role_read"
  ON audit_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Policy 3: Admins can view ALL audit logs (including null user_id logs)
CREATE POLICY "admin_read_all"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy 4: Non-admin users can only see their own logs
CREATE POLICY "user_read_own"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STEP 4: Ensure Indexes Exist
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
```

### Step 3: Test the Fix

**Test 1: Failed Login (should now be logged)**
```
1. Go to frontend login page
2. Enter correct email but WRONG password
3. Try to login (should fail)
4. Go to Admin Dashboard → Audit Logs
5. You should see a new LOGIN entry with:
   - action: LOGIN
   - entity_type: AUTHENTICATION
   - status: FAILED
   - error_message: (the error message)
   - user_id: null (because login failed)
```

**Test 2: Successful Login (should be logged)**
```
1. Login successfully with correct credentials
2. Go to Admin Dashboard → Audit Logs
3. You should see a new LOGIN entry with:
   - action: LOGIN
   - entity_type: AUTHENTICATION
   - status: SUCCESS
   - user_id: (your user ID)
```

**Test 3: Admin Can See All Logs**
```
1. Login as admin user
2. Go to Admin Dashboard → Audit Logs
3. You should see:
   - All LOGIN attempts (success and failed)
   - All CREATE/DELETE user operations
   - Both with and without user_id
```

## What Changed in the Backend

The login endpoint in `backend/src/routes/auth.js` now:
- Directly inserts into `audit_logs` table using the service role client (supabaseAdmin)
- Bypasses RLS policies for backend operations
- Properly logs both successful and failed login attempts
- Allows NULL user_id for failed login attempts (before user is identified)

## If Still Not Working

**Check 1: Backend Console**
```
Look for these messages in terminal where backend is running:
- "Failed login attempt for: [email]"
- "Login successful for user: [email]"
- "Attempting to log audit event: { action: 'LOGIN', ... }"
```

**Check 2: Supabase Logs**
1. Go to Supabase → Logs → Edge Functions or Realtime
2. Look for any errors about RLS or permissions

**Check 3: Environment Variables**
1. Check `.env` file in backend folder
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
3. If missing, copy it from Supabase project settings → API

**Check 4: Verify Admin Role**
```sql
-- Run in Supabase SQL Editor
SELECT id, email, role FROM users WHERE email = 'your-admin-email@example.com';

-- Should show role = 'admin'
-- If not, update it:
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

## Verification SQL

Run this to verify everything is set up correctly:

```sql
-- Check table structure
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'audit_logs';

-- Check RLS policies
SELECT policyname, permissive, qual, with_check 
FROM pg_policies 
WHERE tablename = 'audit_logs';

-- Check for any audit logs
SELECT action, status, user_id, entity_name, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

## Expected Results After Fix

✅ **Login audit logs now appear in dashboard**
✅ **All login attempts (success and failed) are recorded**
✅ **Admins can view all logs including failed login attempts**
✅ **Non-admin users can only see their own logs**
✅ **CREATE and DELETE logs continue to work as before**
