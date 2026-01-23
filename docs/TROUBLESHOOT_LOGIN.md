# Troubleshooting: Login Credentials Not Working

If you're getting "please check your credentials" error, follow this guide to verify your user in Supabase.

---

## Step 1: Verify User Exists in Authentication

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication → Users**
3. Look for your admin user (e.g., `admin@operations.com`)

**If you see the user:**
- ✅ Auth user exists
- Check: Is email confirmed? (Look for green checkmark)
- Check: Password is set? (You should see a password in auth settings)

**If you don't see the user:**
- ❌ User not created in authentication
- **Solution**: Create the user again via Supabase Dashboard or script

---

## Step 2: Verify User Profile in Database

1. Go to **SQL Editor** in Supabase
2. Run this query:

```sql
SELECT id, email, full_name, role, is_active FROM public.users WHERE email = 'admin@operations.com';
```

**Expected result:**
```
id                  | email                | full_name          | role  | is_active
-------------------+----------------------+--------------------+-------+----------
550e8400-e29b-41d4 | admin@operations.com | System Admin...    | admin | true
```

**If query returns no rows:**
- ❌ User profile not in database
- **Solution**: Insert user profile manually (see below)

**If query returns row:**
- ✅ User profile exists
- Continue to Step 3

---

## Step 3: Check Email Confirmation Status

1. Go to **SQL Editor** in Supabase
2. Run this query:

```sql
SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE email = 'admin@operations.com';
```

**If `email_confirmed_at` is NULL:**
- ❌ Email not confirmed
- **Solution**: Click the user in Authentication → Users, then click "Confirm email"

**If `email_confirmed_at` has a timestamp:**
- ✅ Email is confirmed
- Continue to Step 4

---

## Step 4: Test Direct Login with Supabase

Test if the credentials work with Supabase directly (not through your backend).

Create a test file `backend/test-login.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  try {
    console.log('Testing login with credentials...');
    console.log('Email: admin@operations.com');
    console.log('Password: AdminPassword123!\n');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@operations.com',
      password: 'AdminPassword123!',
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.log('\nPossible causes:');
      console.log('1. Email/password incorrect');
      console.log('2. Email not confirmed');
      console.log('3. User not created');
      return;
    }

    console.log('✅ Login successful!');
    console.log('\nUser details:');
    console.log('- ID:', data.user.id);
    console.log('- Email:', data.user.email);
    console.log('- Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('\nSession token:', data.session.access_token.substring(0, 20) + '...');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
```

Run it:
```bash
cd backend
node test-login.js
```

---

## Step 5: Common Issues & Solutions

### Issue 1: "Invalid login credentials"

**Check these:**

1. **Is the password correct?**
   - If created via Dashboard, you set it during invite
   - If created via script, it's `AdminPassword123!`
   - Try both versions

2. **Is email confirmed?**
   ```sql
   UPDATE auth.users 
   SET email_confirmed_at = NOW() 
   WHERE email = 'admin@operations.com';
   ```

3. **Try resetting password:**
   - Delete the user and recreate it
   - Or use Supabase "Reset password" feature

### Issue 2: "User not found in users table"

**Run this:**
```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE((raw_user_meta_data->>'full_name'), 'Administrator'),
  'admin',
  true
FROM auth.users
WHERE email = 'admin@operations.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.users.id
);
```

This will add the missing user profile.

### Issue 3: "Role or permissions error"

Check that the role is exactly one of these:
- `admin`
- `branch_manager`
- `service_advisor`
- `mechanic`
- `inventory_officer`
- `executive`

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@operations.com';
```

---

## Step 6: Complete Fresh Setup

If nothing works, do a complete reset:

### Delete and Recreate User

**Option A: Via Dashboard**
1. Go to **Authentication → Users**
2. Find your admin user
3. Click the 3-dot menu → Delete user
4. Wait 5 seconds
5. Create new user again
6. Confirm email
7. Add to users table

**Option B: Via SQL**
```sql
-- Delete user from auth (this will cascade to users table)
DELETE FROM auth.users WHERE email = 'admin@operations.com';

-- Wait a moment, then recreate the profile
-- Use the Supabase Dashboard to create a new auth user
-- Then run:
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'NEW_USER_ID_FROM_AUTH',
  'admin@operations.com',
  'System Administrator',
  'admin',
  true
);
```

---

## Step 7: Verify Everything Works

1. Run your test script again:
   ```bash
   node test-login.js
   ```

2. If successful, try logging in from the UI:
   - Go to http://localhost:5173/login
   - Email: `admin@operations.com`
   - Password: `AdminPassword123!`
   - Should redirect to dashboard

---

## Debug Checklist

- [ ] User exists in **Authentication → Users**
- [ ] Email is confirmed (green checkmark)
- [ ] User profile exists in `public.users` table
- [ ] Role is set to `admin`
- [ ] `is_active` is `true`
- [ ] Password is correct
- [ ] Credentials work with test script
- [ ] No CORS errors in browser console

---

## Still Having Issues?

1. **Check Backend Logs:**
   ```bash
   cd backend
   npm run dev
   ```
   Look for error messages when trying to login

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Network tab
   - Try login
   - Click on `/api/auth/login` request
   - Check the Response tab for error details

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard
   - Look for **Logs** section
   - Search for your email
   - See what errors are being recorded

---

## Recommended Next Steps

Once login works:
1. ✅ Test logout
2. ✅ Test token expiration
3. ✅ Test role-based access
4. ✅ Create admin UI for adding new users

For more help, check [SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)
