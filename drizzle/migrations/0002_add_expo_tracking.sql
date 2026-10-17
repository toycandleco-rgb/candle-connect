CREATE TABLE public.candle_expos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candle_expos TO authenticated;
GRANT ALL ON public.candle_expos TO service_role;
ALTER TABLE public.candle_expos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their candle expos" ON public.candle_expos FOR ALL TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

ALTER TABLE public.candle_sales
  ADD COLUMN expo_id UUID REFERENCES public.candle_expos(id) ON DELETE SET NULL;

CREATE INDEX candle_expos_owner_created_idx ON public.candle_expos(owner_id, created_at DESC);
CREATE INDEX candle_sales_expo_created_idx ON public.candle_sales(owner_id, expo_id, created_at DESC);

DROP POLICY "Owners manage their candle sales" ON public.candle_sales;
CREATE POLICY "Owners manage their candle sales" ON public.candle_sales FOR ALL TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK (
    (select auth.uid()) = owner_id
    AND (
      customer_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.candle_customers customer
        WHERE customer.id = candle_sales.customer_id
          AND customer.owner_id = (select auth.uid())
      )
    )
    AND (
      expo_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.candle_expos expo
        WHERE expo.id = candle_sales.expo_id
          AND expo.owner_id = (select auth.uid())
      )
    )
  );