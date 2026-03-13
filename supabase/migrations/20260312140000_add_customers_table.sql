CREATE TABLE IF NOT EXISTS public.customers (
  customer_id    uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id        uuid NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
  first_name     varchar,
  last_name      varchar,
  phone_number   varchar,
  tax_id         varchar,
  country        varchar DEFAULT 'USA',
  kyc_status     public.kyc_status DEFAULT 'pending',
  address_line_1 varchar,
  address_line_2 varchar,
  city           varchar,
  state          varchar,
  zip_code       varchar,
  created_at     timestamp DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own row"
  ON public.customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Customers can update own row"
  ON public.customers FOR UPDATE
  USING (user_id = auth.uid());

GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO service_role;
