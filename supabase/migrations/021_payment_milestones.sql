-- Create payment_milestones table
CREATE TABLE IF NOT EXISTS public.payment_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  holding_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  investor_id uuid REFERENCES public.investors(id),
  label text NOT NULL,
  milestone_type text NOT NULL DEFAULT 'installment',
  sequence_order integer,
  due_date date,
  amount numeric NOT NULL DEFAULT 0,
  percentage numeric,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'paid', 'overdue')),
  paid_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_milestones_holding ON public.payment_milestones(holding_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_investor ON public.payment_milestones(investor_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_tenant ON public.payment_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_status ON public.payment_milestones(status);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_due_date ON public.payment_milestones(due_date);

-- RLS
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view payment milestones"
  ON public.payment_milestones FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can manage payment milestones"
  ON public.payment_milestones FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());
