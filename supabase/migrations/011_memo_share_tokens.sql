-- =============================
-- MEMO SHARE TOKENS WITH TRACKING
-- =============================
-- Enables WhatsApp/Email sharing with open and engagement tracking

CREATE TABLE IF NOT EXISTS public.memo_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  memo_id uuid NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  share_method text NOT NULL CHECK (share_method IN ('whatsapp', 'email', 'link')),
  recipient_contact text, -- WhatsApp number or email address
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  opened_at timestamptz,
  opened_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  clicked_at timestamptz, -- When investor clicked through to view memo
  metadata jsonb DEFAULT '{}'::jsonb -- Store additional tracking data
);

CREATE INDEX IF NOT EXISTS memo_share_tokens_token_idx ON public.memo_share_tokens(token);
CREATE INDEX IF NOT EXISTS memo_share_tokens_memo_idx ON public.memo_share_tokens(memo_id);
CREATE INDEX IF NOT EXISTS memo_share_tokens_investor_idx ON public.memo_share_tokens(investor_id);
CREATE INDEX IF NOT EXISTS memo_share_tokens_tenant_idx ON public.memo_share_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS memo_share_tokens_created_at_idx ON public.memo_share_tokens(created_at DESC);

-- Enable RLS
ALTER TABLE public.memo_share_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view share tokens for memos in their tenant
CREATE POLICY "Users can view tenant share tokens"
  ON public.memo_share_tokens FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Agents can create share tokens
CREATE POLICY "Agents can create share tokens"
  ON public.memo_share_tokens FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- System can update share tokens (for tracking opens/clicks)
CREATE POLICY "System can update share tokens"
  ON public.memo_share_tokens FOR UPDATE
  USING (true) -- Allow updates for tracking
  WITH CHECK (true);

COMMENT ON TABLE public.memo_share_tokens IS 'Share tokens for memos with WhatsApp/Email tracking and engagement metrics';
