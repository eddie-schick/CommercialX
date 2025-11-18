# Authentication Testing Checklist

After running migrations, test the following:

## ✅ Step 1: Verify Migrations Applied Successfully

1. **Check Foreign Key**: In Supabase Dashboard → Table Editor → `organization_users` table
   - The `user_id` column should show a link icon (🔗) indicating it's a foreign key
   - Click on it to verify it points to `auth.users.id`

2. **Check Functions**: In Supabase Dashboard → Database → Functions
   - Verify these functions exist:
     - `create_dealer_organization`
     - `get_current_user_profile`
     - `get_user_dealer_id`
     - `user_has_organization`
     - `get_current_user_org_user` (in "01. Organization" schema)

## ✅ Step 2: Test Sign-In Flow

1. **Start Dev Server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open Browser** to `http://localhost:3000`

3. **Sign In**:
   - Go to `/login`
   - Enter your credentials
   - Should sign in without timeout errors
   - Should redirect to `/dealer` or `/setup-organization`

4. **Check Browser Console**:
   - Look for logs like:
     - `[useCurrentUser] Found user from session: [user-id]`
     - `[ProtectedRoute] ✅ Found session with user: [user-id]`
   - Should NOT see timeout errors

## ✅ Step 3: Test Protected Routes

1. **Click "List Your Inventory"** (or navigate to `/dealer`)
   - Should NOT show "Authentication Required" screen
   - Should load the dealer dashboard or inventory list

2. **If you see "Authentication Required"**:
   - Click "Refresh Session" button
   - Should detect your session and reload
   - Should then allow access

## ✅ Step 4: Test Organization Setup (if needed)

1. **If you don't have an organization yet**:
   - Navigate to `/setup-organization`
   - Should NOT show "Not Authenticated"
   - Should show the onboarding wizard
   - Complete the setup
   - Should create organization_user record linked to your auth.users.id

2. **After setup**:
   - Should redirect to `/dealer`
   - Should be able to access all dealer routes

## ✅ Step 5: Verify Database Records

1. **In Supabase Dashboard → Table Editor**:
   - Check `organization_users` table
   - Your `user_id` should match your `auth.users.id`
   - Should have a valid `organization_id`
   - Should have `role` = 'owner'

2. **Check `organizations` table**:
   - Should have your organization record
   - `id` should match `organization_users.organization_id`

3. **Check `dealers` table**:
   - Should have your dealer record
   - `organization_id` should match your organization

## 🐛 Troubleshooting

### If sign-in still times out:
- Check browser console for specific error messages
- Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Network tab to see if requests are being blocked
- Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### If "Not Authenticated" appears:
- Click "Refresh Session" button
- Check browser console for session detection logs
- Verify you're actually signed in (check `auth.users` table in Supabase)
- Try signing out and signing back in

### If organization setup fails:
- Check browser console for error messages
- Verify the `create_dealer_organization` function exists
- Check Supabase logs for function execution errors
- Make sure your user exists in `auth.users` table

### If RPC functions fail:
- Verify functions exist in Supabase Dashboard → Database → Functions
- Check function permissions (should be granted to `authenticated` and `anon`)
- Check Supabase logs for execution errors

