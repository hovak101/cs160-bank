-- accounts table
CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "account_id"   uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "customer_id"  uuid NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
    "account_type" text NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit')),
    "status"       public.account_status DEFAULT 'active',
    "balance"      numeric(12,2) NOT NULL DEFAULT 0.00,
    "created_at"   timestamp without time zone DEFAULT now()
);

ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own accounts"
  ON "public"."accounts" FOR SELECT
  USING (customer_id IN (
    SELECT customer_id FROM public.customers WHERE user_id = auth.uid()
  ));

GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";

-- transactions table
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "transaction_id"          uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "reference_number"        text NOT NULL UNIQUE,
    "source_account_id"       uuid REFERENCES public.accounts(account_id),
    "destination_account_id"  uuid REFERENCES public.accounts(account_id),
    "amount"                  numeric(12,2) NOT NULL,
    "transaction_type"        public.transaction_type NOT NULL,
    "status"                  public.transaction_status DEFAULT 'pending',
    "description"             text,
    "executed_at"             timestamp without time zone DEFAULT now()
);

ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own transactions"
  ON "public"."transactions" FOR SELECT
  USING (
    source_account_id IN (
      SELECT a.account_id FROM public.accounts a
      JOIN public.customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = auth.uid()
    )
    OR destination_account_id IN (
      SELECT a.account_id FROM public.accounts a
      JOIN public.customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";
