
-- Add is_featured column to products table for monetization
alter table products
add column is_featured boolean default false;
