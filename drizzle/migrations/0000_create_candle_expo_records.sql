CREATE TABLE public.candle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  cost_price NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
  sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_products TO authenticated;
GRANT ALL ON public.candle_products TO service_role;
ALTER TABLE public.candle_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle products" ON public.candle_products FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

CREATE TABLE public.candle_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  phone TEXT NOT NULL CHECK (phone ~ '^\+?[0-9]{8,15}$'),
  offers_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_customers TO authenticated;
GRANT ALL ON public.candle_customers TO service_role;
ALTER TABLE public.candle_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle customers" ON public.candle_customers FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

CREATE TABLE public.candle_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  customer_id UUID REFERENCES public.candle_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL CHECK (customer_phone ~ '^\+?[0-9]{8,15}$'),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_sales TO authenticated;
GRANT ALL ON public.candle_sales TO service_role;
ALTER TABLE public.candle_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle sales" ON public.candle_sales FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

CREATE TABLE public.candle_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  sale_id UUID NOT NULL REFERENCES public.candle_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.candle_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  cost_price NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
  sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_sale_items TO authenticated;
GRANT ALL ON public.candle_sale_items TO service_role;
ALTER TABLE public.candle_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle sale items" ON public.candle_sale_items FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

CREATE TABLE public.candle_sale_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  sale_id UUID NOT NULL REFERENCES public.candle_sales(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 120),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_sale_expenses TO authenticated;
GRANT ALL ON public.candle_sale_expenses TO service_role;
ALTER TABLE public.candle_sale_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle sale expenses" ON public.candle_sale_expenses FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

CREATE INDEX candle_products_owner_active_idx ON public.candle_products(owner_id, active, name);
CREATE INDEX candle_customers_owner_name_idx ON public.candle_customers(owner_id, name);
CREATE INDEX candle_sales_owner_created_idx ON public.candle_sales(owner_id, created_at DESC);
CREATE INDEX candle_sale_items_sale_idx ON public.candle_sale_items(sale_id);
CREATE INDEX candle_sale_expenses_sale_idx ON public.candle_sale_expenses(sale_id);