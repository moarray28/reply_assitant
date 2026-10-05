BEGIN;

INSERT INTO brands (id, name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'GlowCare'),
  ('22222222-2222-4222-8222-222222222222', 'PureBottle')
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_entries (brand_id, category, title, content) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Returns', 'Returns', 'Returns accepted within 30 days of delivery, subject to applicable conditions.'),
  ('11111111-1111-4111-8111-111111111111', 'Refunds', 'Refunds', 'Eligible refunds are generally processed within 7 business days after approval.'),
  ('11111111-1111-4111-8111-111111111111', 'Damaged Products', 'Damaged Products', 'Customers should report damaged products within 14 days of delivery. Eligible damaged products can be replaced according to policy.'),
  ('11111111-1111-4111-8111-111111111111', 'Shipping', 'Shipping', 'Standard shipping generally takes 3-5 business days.'),
  ('11111111-1111-4111-8111-111111111111', 'Cancellation', 'Cancellation', 'Orders can be cancelled before shipment.'),

  ('22222222-2222-4222-8222-222222222222', 'Returns', 'Returns', 'Returns accepted within 14 days of delivery, subject to applicable conditions.'),
  ('22222222-2222-4222-8222-222222222222', 'Refunds', 'Refunds', 'Eligible refunds are generally processed within 3 business days after approval.'),
  ('22222222-2222-4222-8222-222222222222', 'Damaged Products', 'Damaged Products', 'Damaged products must be reported within 48 hours of delivery.'),
  ('22222222-2222-4222-8222-222222222222', 'Shipping', 'Shipping', 'Standard shipping generally takes 5-7 business days.'),
  ('22222222-2222-4222-8222-222222222222', 'Cancellation', 'Cancellation', 'Orders can generally be cancelled within 1 hour of placing the order.')
ON CONFLICT (brand_id, category, title) DO UPDATE
SET content = EXCLUDED.content,
    updated_at = NOW();

INSERT INTO customers (id, name, email) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Sarah Miller', 'sarah.miller@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'David Chen', 'david.chen@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'Priya Shah', 'priya.shah@example.com'),
  ('66666666-6666-4666-8666-666666666666', 'Marcus Lee', 'marcus.lee@example.com'),
  ('77777777-7777-4777-8777-777777777777', 'Emma Johnson', 'emma.johnson@example.com'),
  ('88888888-8888-4888-8888-888888888888', 'Nina Patel', 'nina.patel@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversations (id, brand_id, customer_id, order_id, order_status, created_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'GC-1001', 'Delivered', NOW()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444', 'PB-2205', 'In Transit', NOW()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555', 'GC-1002', 'Delivered', NOW()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666666', 'PB-2206', 'Processing', NOW()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'GC-1003', 'Shipped', NOW()),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'PB-2207', 'Delivered', NOW()),
  ('abababab-abab-4bab-8bab-abababababab', '22222222-2222-4222-8222-222222222222', '88888888-8888-4888-8888-888888888888', 'PB-2208', 'Delivered', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender, content, created_at) VALUES
  ('123e4567-e89b-42d3-a456-426614174001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'customer', 'My order was delivered but the bottle is broken. What can I do?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'agent', 'I am checking the damaged product policy for your order.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'customer', 'Can I still cancel my order if it has not shipped yet?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'agent', 'Let me verify the order cancellation policy.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174005', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'customer', 'I received my package and want to return it. What is the return window?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174006', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'agent', 'I will check the return policy for your order.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174007', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'customer', 'How long does shipping usually take for my order?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174008', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'agent', 'I am checking the shipping details.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174009', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'customer', 'I want to cancel my order before shipment. Is that possible?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174010', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'agent', 'Let me confirm the cancellation policy.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174011', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'customer', 'I need help with a custom issue that is not covered by the policy list.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174012', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'agent', 'I will verify the available policy information first.', NOW()),
  ('123e4567-e89b-42d3-a456-426614174013', 'abababab-abab-4bab-8bab-abababababab', 'customer', 'When will my refund be processed?', NOW()),
  ('123e4567-e89b-42d3-a456-426614174014', 'abababab-abab-4bab-8bab-abababababab', 'agent', 'I will check the refund timeline for you.', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
