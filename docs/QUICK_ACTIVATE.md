# ⚡ Audit Logs - Quick Start (5 Minutes)

## 🚀 3 Simple Steps

### Step 1️⃣: Create Database Table (2 min)

```bash
1. Open: https://app.supabase.com
2. Select your project
3. Go to: SQL Editor → New Query
4. Copy-paste the SQL from below
5. Click: RUN
```

**SQL to Copy-Paste:**

```sql
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role can insert logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);
```

### Step 2️⃣: Restart Backend (1 min)

```bash
cd backend
npm run dev
```

Wait for: **`Server running on port 4000`** ✅

### Step 3️⃣: Test (2 min)

```
1. Login to your app
2. Go to: Admin Dashboard → Audit Logs
3. You should see your LOGIN entry
4. Create a user → see CREATE entry
5. Delete a user → see DELETE entry
```

---

## ✅ What You'll See

### Audit Logs Dashboard Shows:

| Timestamp | User | Action | Entity | Status |
|-----------|------|--------|--------|--------|
| Jan 26, 10:30 | admin@example.com | LOGIN | AUTHENTICATION | ✅ SUCCESS |
| Jan 26, 10:31 | admin@example.com | CREATE | USER (john@ex.com) | ✅ SUCCESS |
| Jan 26, 10:32 | admin@example.com | DELETE | USER (john@ex.com) | ✅ SUCCESS |

### Expandable Details Show:

```json
{
  "fullName": "John Doe",
  "role": "mechanic",
  "createdBy": "admin"
}
```

---

## 🎯 What's Being Logged

✅ **LOGIN** - When users login (with success/failure tracking)
✅ **CREATE** - When admin creates a new user
✅ **DELETE** - When admin deletes a user (with admin name)

---

## 🔍 Filter Options

- **Action**: LOGIN, CREATE, DELETE, UPDATE, etc.
- **Entity Type**: USER, BRANCH, JOB_ORDER, etc.
- **Status**: SUCCESS, FAILED
- **Search**: By email or user name
- **Date Range**: From date to date

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Still seeing "No audit logs found" | Refresh page, restart browser |
| Backend won't start | Check `npm run dev` in `/backend` folder |
| Delete user fails | Make sure backend is running on port 4000 |
| Can't see CREATE/DELETE logs | Make sure you're logged in as admin |

---

## 📚 Need More Details?

- **Setup Guide**: See `AUDIT_LOG_COMPLETE_FIX.md`
- **Full Documentation**: See `AUDIT_LOG_SETUP.md`
- **Code Integration**: See `AUDIT_LOG_INTEGRATION.md`

---

## 🎉 You're Done!

After these 3 steps, your audit logging system is **fully operational**! 

The system will automatically log:
- Every user login
- Every user creation
- Every user deletion

Visit **Admin Dashboard → Audit Logs** to see everything!

---

**Need to add logging to other modules?** Check `AUDIT_LOG_INTEGRATION.md` for code examples!
