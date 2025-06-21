-- Manual cleanup script for production database
-- This will remove all non-chat activities from the user_activity table

-- First, let's see what we have
SELECT action, COUNT(*) as count 
FROM user_activity 
GROUP BY action 
ORDER BY count DESC;

-- Delete all non-chat activities
DELETE FROM user_activity 
WHERE action NOT IN (
  'chat_message_sent',
  'chat_message_received', 
  'chat_conversation_started',
  'chat_conversation_ended',
  'chat_history_save',
  'chat_history_load',
  'user_login',
  'user_logout'
);

-- Verify the cleanup
SELECT action, COUNT(*) as count 
FROM user_activity 
GROUP BY action 
ORDER BY count DESC;

-- Show total remaining activities
SELECT COUNT(*) as total_remaining_activities FROM user_activity; 