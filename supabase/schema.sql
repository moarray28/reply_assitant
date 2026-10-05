BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, category, title)
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'agent', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_message TEXT NOT NULL,
  retrieved_context TEXT NOT NULL,
  ai_response TEXT,
  agent_edited_response TEXT,
  final_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_brand_id ON knowledge_entries (brand_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_brand_category ON knowledge_entries (brand_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_entries_unique_title ON knowledge_entries (brand_id, category, title);
CREATE INDEX IF NOT EXISTS idx_conversations_brand_id ON conversations (brand_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_conversation_id ON ai_logs (conversation_id, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS knowledge_entries_set_updated_at ON knowledge_entries;
CREATE TRIGGER knowledge_entries_set_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands: allow authenticated read write" ON brands;
CREATE POLICY "Brands: allow authenticated read write" ON brands
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Knowledge entries: allow authenticated read write" ON knowledge_entries;
CREATE POLICY "Knowledge entries: allow authenticated read write" ON knowledge_entries
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers: allow authenticated read write" ON customers;
CREATE POLICY "Customers: allow authenticated read write" ON customers
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Conversations: allow authenticated read write" ON conversations;
CREATE POLICY "Conversations: allow authenticated read write" ON conversations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Messages: allow authenticated read write" ON messages;
CREATE POLICY "Messages: allow authenticated read write" ON messages
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AI logs: allow authenticated read write" ON ai_logs;
CREATE POLICY "AI logs: allow authenticated read write" ON ai_logs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON brands, knowledge_entries, customers, conversations, messages, ai_logs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON knowledge_entries, messages, ai_logs TO authenticated;

COMMIT;
