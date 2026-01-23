# Creating Admin User in Supabase

This guide explains how to create a pre-defined admin user in your Supabase database.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Auth User
1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Users**
3. Click **"Invite user"** button
4. Enter:
   - **Email**: `admin@operations.com`
   - **Password**: `AdminPassword123!` (change this to your secure password)
5. Click **"Send invite"** or **"Create user"**

### Step 2: Create User Profile
1. Go to **SQL Editor** in Supabase
2. Run this query to add the admin profile:

```sql
-- Insert admin user profile
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  -- Replace with the user ID from the auth user you just created
  'YOUR_USER_ID_HERE',
  'admin@operations.com',
  'System Administrator',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true;
```

### Step 3: Get Your User ID
1. Go to **Authentication → Users**
2. Find your admin user
3. Click on it and copy the **User ID** from the details panel
4. Replace `YOUR_USER_ID_HERE` in the SQL query above with this ID

---

## Method 2: Using Backend API (via Node.js Script)

Create a file `backend/scripts/create-admin.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@operations.com',
      password: 'AdminPassword123!',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'System Administrator',
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('✓ Auth user created:', authData.user.id);

    // Step 2: Create user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: 'admin@operations.com',
          full_name: 'System Administrator',
          role: 'admin',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error('Error creating user profile:', userError);
      return;
    }

    console.log('✓ User profile created:', userData);
    console.log('\n✅ Admin user created successfully!');
    console.log('Email: admin@operations.com');
    console.log('Password: AdminPassword123!');
    console.log('Role: admin');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

createAdminUser();
```

### To Run:
```bash
cd backend
node scripts/create-admin.js
```

---

## Method 3: Direct SQL (Most Control)

Run this in your Supabase **SQL Editor** (after creating the auth user):

```sql
-- This assumes you've already created the auth user
-- and have copied the user ID

-- Insert admin user with all details
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'YOUR_AUTH_USER_ID_HERE',
  'admin@operations.com',
  'System Administrator',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  full_name = 'System Administrator';
```

---

## Testing Your Admin Login

### Step 1: Start Your Application
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 2: Login with Admin Credentials
1. Open your application at `http://localhost:5173`
2. Go to login page
3. Enter:
   - **Email**: `admin@operations.com`
   - **Password**: `AdminPassword123!`
4. Select **Role**: Admin
5. Click **Sign In**

### Step 3: Verify Success
- You should be redirected to the dashboard
- User data should load showing admin role

---

## Troubleshooting

### Issue: "User not found" error
- **Solution**: Make sure the auth user was created and email is confirmed

### Issue: "Role field is null"
- **Solution**: Run the INSERT query in SQL Editor to create the user profile

### Issue: "UNIQUE constraint violation on email"
- **Solution**: Either delete the existing user first or use a different email

### Issue: Can't find User ID
- **Solution**: 
  1. Go to Authentication → Users
  2. Click on the admin user row
  3. The ID appears in the right panel

---

## Recommended Admin Credentials

For production, change to:
- **Email**: `admin@yourcompany.com`
- **Password**: Use a strong, unique password (min 12 characters with mixed case, numbers, symbols)

---

## Next Steps

1. ✅ Login with admin credentials
2. Create UI for admin to add new users/roles (dashboard feature)
3. Implement role-based access control for each dashboard
4. Set up password reset functionality

For any issues, check your Supabase logs in the **Logs** section of your dashboard.
