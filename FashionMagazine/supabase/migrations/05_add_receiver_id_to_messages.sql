
-- Add receiver_id to messages table for optimization
alter table messages
add column receiver_id uuid references profiles(id);
