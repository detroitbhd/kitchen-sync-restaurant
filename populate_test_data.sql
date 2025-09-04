-- KitchenSync Test Data Population Script
-- Run this in your Supabase SQL Editor to add sample data

-- Insert sample products (menu items)
INSERT INTO products (id, name, description, price, category, available, preparation_time) VALUES
('prod-1', 'Classic Burger', 'Beef patty with lettuce, tomato, and cheese', 12.99, 'Burgers', true, 8),
('prod-2', 'Chicken Caesar Salad', 'Fresh romaine with grilled chicken and caesar dressing', 10.99, 'Salads', true, 5),
('prod-3', 'Margherita Pizza', 'Fresh mozzarella, basil, and tomato sauce', 14.99, 'Pizza', true, 12),
('prod-4', 'Fish & Chips', 'Beer-battered cod with golden fries', 15.99, 'Seafood', true, 10),
('prod-5', 'Chocolate Brownie', 'Warm brownie with vanilla ice cream', 6.99, 'Desserts', true, 3),
('prod-6', 'Cappuccino', 'Freshly brewed espresso with steamed milk', 4.50, 'Beverages', true, 2),
('prod-7', 'Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 18.99, 'Seafood', true, 15),
('prod-8', 'Vegetarian Wrap', 'Mixed vegetables with hummus in a spinach wrap', 9.99, 'Wraps', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (id, customer_name, customer_phone, order_type, status, items, total_amount, created_at, estimated_completion) VALUES
('ord-1', 'John Smith', '+1234567890', 'DELIVERY', 'PENDING', '[{"productId": "prod-1", "name": "Classic Burger", "quantity": 2, "price": 12.99}, {"productId": "prod-6", "name": "Cappuccino", "quantity": 1, "price": 4.50}]'::jsonb, 30.48, NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '10 minutes'),
('ord-2', 'Sarah Johnson', '+1234567891', 'TAKEAWAY', 'ACCEPTED', '[{"productId": "prod-3", "name": "Margherita Pizza", "quantity": 1, "price": 14.99}, {"productId": "prod-5", "name": "Chocolate Brownie", "quantity": 1, "price": 6.99}]'::jsonb, 21.98, NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '7 minutes'),
('ord-3', 'Mike Davis', '+1234567892', 'DINE_IN', 'PENDING', '[{"productId": "prod-7", "name": "Grilled Salmon", "quantity": 1, "price": 18.99}, {"productId": "prod-2", "name": "Chicken Caesar Salad", "quantity": 1, "price": 10.99}]'::jsonb, 29.98, NOW() - INTERVAL '3 minutes', NOW() + INTERVAL '12 minutes'),
('ord-4', 'Emma Wilson', '+1234567893', 'DELIVERY', 'READY', '[{"productId": "prod-4", "name": "Fish & Chips", "quantity": 1, "price": 15.99}, {"productId": "prod-6", "name": "Cappuccino", "quantity": 2, "price": 4.50}]'::jsonb, 24.99, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '2 minutes'),
('ord-5', 'Alex Brown', '+1234567894', 'TAKEAWAY', 'PENDING', '[{"productId": "prod-8", "name": "Vegetarian Wrap", "quantity": 1, "price": 9.99}]'::jsonb, 9.99, NOW() - INTERVAL '1 minute', NOW() + INTERVAL '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Products inserted:' as info, COUNT(*) as count FROM products;
SELECT 'Orders inserted:' as info, COUNT(*) as count FROM orders;
