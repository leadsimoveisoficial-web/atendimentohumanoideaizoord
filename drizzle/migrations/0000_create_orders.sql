CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (status = 'novo');
CREATE POLICY "Kitchen screen reads orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Kitchen screen updates status" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (status IN ('novo','preparando','pronto','entregue'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;