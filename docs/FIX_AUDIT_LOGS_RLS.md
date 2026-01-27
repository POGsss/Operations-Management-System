# Fix Audit Logs RLS Policies

Run these SQL commands in your Supabase SQL Editor to ensure login logs are properly recorded and viewable.

## Step 1: Verify/Update audit_logs Table

```sql
-- Make sure user_id can be NULL (for failed login attempts)
ALTER TABLE audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Verify the table structure
\d audit_logs
```

## Step 2: Drop Existing RLS Policies (if they exist)

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert logs" ON audit_logs;
DROP POLICY IF EXISTS "authenticated_read_logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can only see their own logs" ON audit_logs;
```

## Step 3: Create New RLS Policies

```sql
-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role can do anything (backend operations)
CREATE POLICY "service_role_full_access"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Service role can insert logs
CREATE POLICY "service_role_insert_logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 3: Authenticated users can read their own logs
CREATE POLICY "users_read_own_logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 4: Admins can view all audit logs (including those with null user_id)
CREATE POLICY "admins_read_all_logs"
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
```

## Step 4: Verify Indexes Exist

```sql
-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Verify indexes were created
\di audit_logs_*
```

## Step 5: Test the Setup

After running the above SQL:

1. **Test Failed Login** (should appear in audit logs with null user_id):
   - Try logging in with wrong password
   - Check Audit Logs dashboard - should show LOGIN action with status FAILED

2. **Test Successful Login** (should appear with user_id):
   - Login successfully
   - Check Audit Logs dashboard - should show LOGIN action with status SUCCESS

3. **Test Admin Visibility**:
   - Login as admin
   - Go to Audit Logs
   - Should see all login attempts (success and failed) including those with null user_id

## Troubleshooting

**Issue: Still not seeing login logs**
- Solution: Check backend console for error messages
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Verify the service role is correctly configured in Supabase

**Issue: Permission denied error**
- Solution: Make sure you're logged in as a Supabase admin user
- Check that RLS is enabled on the table
- Verify policies were created correctly

**Issue: Still seeing "Only admins can see logs"**
- Solution: Check that the admin user has role = 'admin' in the users table
- Verify the policy is using `auth.uid()` correctly
- Make sure the users relationship is working
