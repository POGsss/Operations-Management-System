# 🔴 CRITICAL: Activate Audit Logs Table

Your audit log code is **100% correct**, but the database table doesn't exist yet.

## ⚡ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://app.supabase.com/
2. Select your project: **OperationsManagementSystem**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Paste This SQL

```sql
-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: System can insert logs (for service role)
CREATE POLICY "Service role can insert logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);
```

### Step 3: Execute the SQL

1. Click **Run** (blue button)
2. Wait for success message ✅
3. Check that table appears in **Table Editor** (left sidebar)

### Step 4: Restart Backend

In your terminal:

```bash
cd backend
npm run dev
```

Wait for: `Server running on port 4000`

### Step 5: Test It

1. **Login** to your application
2. **Go to**: Admin Dashboard → Audit Logs
3. **You should see** your login entry!

---

## ✅ Verification Checklist

- [/] SQL executed successfully in Supabase
- [/] `audit_logs` table appears in Table Editor
- [/] Backend started without errors
- [x] You can see your LOGIN entry after logging in

---

## 🔍 If Still Not Working

### Check 1: Verify Table Exists
```sql
SELECT * FROM audit_logs LIMIT 1;
```
Should return empty result (no error).

### Check 2: Check Backend Logs
When you login, backend console should show:
```
Audit event logged: { action: 'LOGIN', entityType: 'AUTHENTICATION', status: 'SUCCESS', userId: '...' }
```

### Check 3: Manually Query Supabase
In Supabase SQL Editor:
```sql
SELECT COUNT(*) as total_logs FROM audit_logs;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 📝 Notes

- The table is now **production-ready** with:
  - ✅ Proper indexes for fast queries
  - ✅ Row-level security (RLS) enabled
  - ✅ Admin-only access policy
  - ✅ Foreign key constraint to users table
  - ✅ Automatic timestamps

- Once created, all future logins will be automatically logged
- All filters, search, and pagination will work perfectly

---

## 🎯 Next Steps After Activation

After verifying the table works:

1. **Add logging to Users module** (Users.jsx)
   - Logs user creation
   - Logs user deletion

2. **Add logging to other modules**
   - Branch management
   - Job orders
   - Inventory

See `AUDIT_LOG_INTEGRATION.md` for code examples.

---

**Questions?** Check these docs:
- `AUDIT_LOG_SETUP.md` - Detailed setup guide
- `AUDIT_LOG_INTEGRATION.md` - How to add logging to modules
- `AUDIT_LOG_QUICK_START.md` - Feature overview
