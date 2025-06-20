# Production Database Fix Guide

## Issue
The production application on `lisa-frontend-yrg6.onrender.com` is showing "Save Failed" errors because the `user_activity` table is missing from the production database.

## Root Cause
The production database was not properly initialized with all required tables, specifically:
- `user_activity` table (causing authentication middleware to fail)
- `user_settings` table (for theme preferences)
- `notifications` table (for system notifications)
- Missing indexes and triggers

## Solution

### Option 1: Run Production Database Fix Script (Recommended)

1. **Deploy the Fix Script**: The script `server/chatbot-backend/scripts/fix-production-db.js` has been created and will automatically:
   - Check if `user_activity` table exists
   - Create missing tables (`user_activity`, `user_settings`, `notifications`)
   - Add proper indexes for performance
   - Set up update triggers

2. **Run via Render Dashboard**:
   - Go to your Render dashboard
   - Open the backend service
   - Go to "Shell" tab
   - Run: `cd server/chatbot-backend && node scripts/fix-production-db.js`

3. **Or Run via GitHub Actions** (if deployed automatically):
   - The script will run automatically on next deployment
   - Or manually trigger deployment after committing these changes

### Option 2: Manual Database Commands

If you have direct database access, run these SQL commands:

```sql
-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  chat_sound_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  auto_save_conversations BOOLEAN DEFAULT true,
  conversation_retention_days INTEGER DEFAULT 365,
  default_assistant_model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
  sidebar_collapsed BOOLEAN DEFAULT false,
  show_timestamps BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read_status BOOLEAN DEFAULT false,
  action_url VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Verification

After running the fix, you should:

1. **Check Server Logs**: No more "relation 'user_activity' does not exist" errors
2. **Test User Creation**: Admin dashboard user creation should work
3. **Test Conversation Save**: No more "Save Failed" notifications in chat
4. **Check Database**: Run `\dt` in PostgreSQL to see all tables

## Expected Results

✅ **Before Fix**: 
- ❌ "Save Failed" notifications
- ❌ User creation errors  
- ❌ Database relation errors in logs

✅ **After Fix**:
- ✅ Conversations save automatically
- ✅ User creation works in admin dashboard
- ✅ No database errors in server logs
- ✅ All authentication middleware functions properly

## Files Modified

- `server/chatbot-backend/scripts/fix-production-db.js` - Production database fix script
- `client/chatbot-frontend-2/src/components/ChatInterface.jsx` - Improved conversation save with debouncing
- `server/chatbot-backend/routes/admin.js` - Fixed password column name issue

## Deployment

1. Commit all changes
2. Push to main branch
3. Render will automatically deploy
4. Database fix script should run during deployment
5. Monitor logs to confirm successful table creation

## Emergency Rollback

If issues occur:
1. The script only creates tables - it doesn't modify existing data
2. Tables are created with `IF NOT EXISTS` so script is safe to re-run
3. No data loss risk as script only adds missing schema elements 