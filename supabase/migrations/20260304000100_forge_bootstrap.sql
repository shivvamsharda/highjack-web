CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.token_hijacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  token_name text NOT NULL,
  ticker_symbol text NOT NULL,
  image_file_name text,
  image_file_size integer,
  image_file_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transaction_signature text,
  explorer_url text,
  image_uri text,
  metadata_uri text,
  new_metadata jsonb,
  block_time bigint,
  error_message text,
  description text,
  fee_paid_sol numeric(10, 4),
  x_link text,
  telegram_link text,
  website_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_hijacks_wallet_address ON public.token_hijacks(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_hijacks_status ON public.token_hijacks(status);
CREATE INDEX IF NOT EXISTS idx_token_hijacks_created_at ON public.token_hijacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_hijacks_transaction_signature ON public.token_hijacks(transaction_signature) WHERE transaction_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_hijacks_social_links ON public.token_hijacks(x_link, telegram_link, website_link) WHERE x_link IS NOT NULL OR telegram_link IS NOT NULL OR website_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_hijacks_description ON public.token_hijacks(description) WHERE description IS NOT NULL;

ALTER TABLE public.token_hijacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view token hijacks" ON public.token_hijacks;
CREATE POLICY "Anyone can view token hijacks"
  ON public.token_hijacks
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_token_hijacks_updated_at ON public.token_hijacks;
CREATE TRIGGER update_token_hijacks_updated_at
  BEFORE UPDATE ON public.token_hijacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.token_hijacks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_hijacks;

CREATE TABLE IF NOT EXISTS public.wallet_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  wallet_type text NOT NULL CHECK (wallet_type IN ('phantom', 'solflare', 'backpack')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_wallet_connections_address ON public.wallet_connections(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_active ON public.wallet_connections(is_active, last_active_at);

ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create wallet connections" ON public.wallet_connections;
CREATE POLICY "Anyone can create wallet connections"
  ON public.wallet_connections
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view wallet connections" ON public.wallet_connections;
CREATE POLICY "Anyone can view wallet connections"
  ON public.wallet_connections
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update wallet connections" ON public.wallet_connections;
CREATE POLICY "Anyone can update wallet connections"
  ON public.wallet_connections
  FOR UPDATE
  USING (true);

CREATE TABLE IF NOT EXISTS public.hijack_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_fee_sol numeric(10, 4) NOT NULL DEFAULT 0.1,
  last_hijack_at timestamptz,
  last_fee_update_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hijack_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hijack pricing" ON public.hijack_pricing;
CREATE POLICY "Anyone can view hijack pricing"
  ON public.hijack_pricing
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_hijack_pricing_updated_at ON public.hijack_pricing;
CREATE TRIGGER update_hijack_pricing_updated_at
  BEFORE UPDATE ON public.hijack_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hijack_pricing (current_fee_sol, last_fee_update_at)
SELECT 0.1, now()
WHERE NOT EXISTS (SELECT 1 FROM public.hijack_pricing);

ALTER TABLE public.hijack_pricing REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hijack_pricing;

CREATE TABLE IF NOT EXISTS public.twitter_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijack_id uuid NOT NULL REFERENCES public.token_hijacks(id) ON DELETE CASCADE,
  tweet_id text,
  tweet_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  error_message text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_twitter_posts_hijack_id ON public.twitter_posts(hijack_id);
CREATE INDEX IF NOT EXISTS idx_twitter_posts_status ON public.twitter_posts(status);
CREATE INDEX IF NOT EXISTS idx_twitter_posts_created_at ON public.twitter_posts(created_at DESC);

ALTER TABLE public.twitter_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view twitter posts" ON public.twitter_posts;
CREATE POLICY "Anyone can view twitter posts"
  ON public.twitter_posts
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_twitter_posts_updated_at ON public.twitter_posts;
CREATE TRIGGER update_twitter_posts_updated_at
  BEFORE UPDATE ON public.twitter_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.twitter_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.twitter_posts;

CREATE TABLE IF NOT EXISTS public.telegram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijack_id uuid NOT NULL REFERENCES public.token_hijacks(id) ON DELETE CASCADE,
  telegram_message_id text,
  message_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  error_message text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_posts_hijack_id ON public.telegram_posts(hijack_id);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_status ON public.telegram_posts(status);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_created_at ON public.telegram_posts(created_at DESC);

ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view telegram posts" ON public.telegram_posts;
CREATE POLICY "Anyone can view telegram posts"
  ON public.telegram_posts
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_telegram_posts_updated_at ON public.telegram_posts;
CREATE TRIGGER update_telegram_posts_updated_at
  BEFORE UPDATE ON public.telegram_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.telegram_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_posts;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'token-assets',
  'token-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public access to token-assets bucket" ON storage.objects;
CREATE POLICY "Allow public access to token-assets bucket"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'token-assets');

CREATE OR REPLACE FUNCTION public.decay_fee_direct()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_pricing RECORD;
  new_fee numeric;
BEGIN
  SELECT *
  INTO current_pricing
  FROM public.hijack_pricing
  ORDER BY created_at DESC
  LIMIT 1;

  IF current_pricing.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No pricing row found');
  END IF;

  IF current_pricing.last_hijack_at IS NULL
     OR (EXTRACT(EPOCH FROM (now() - current_pricing.last_hijack_at)) / 60) >= 20 THEN
    new_fee := GREATEST(0.1, current_pricing.current_fee_sol - 0.1);

    IF new_fee <> current_pricing.current_fee_sol THEN
      UPDATE public.hijack_pricing
      SET current_fee_sol = new_fee,
          last_fee_update_at = now()
      WHERE id = current_pricing.id;

      RETURN jsonb_build_object(
        'success', true,
        'decayed', true,
        'old_fee', current_pricing.current_fee_sol,
        'new_fee', new_fee
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'decayed', false,
    'current_fee', current_pricing.current_fee_sol
  );
END;
$$;

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.decay_fee_direct() SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE(jobname text, schedule text, active boolean, jobid bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::text,
    j.schedule::text,
    j.active,
    j.jobid::bigint
  FROM cron.job j
  WHERE j.jobname LIKE '%fee%' OR j.jobname LIKE '%decay%';
END;
$$;

ALTER FUNCTION public.get_cron_job_status() SET search_path = public;

DO $$
BEGIN
  PERFORM cron.unschedule('fee-decay-working');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'fee-decay-working',
  '*/20 * * * *',
  $$
  SELECT public.decay_fee_direct();
  $$
);
