
-- Add is_verified column to shops table for Blue Tick
alter table shops
add column is_verified boolean default false;
