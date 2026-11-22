CREATE TABLE public.bachs_checkouts (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  customer_email text NOT NULL,
  expected_amount integer NOT NULL DEFAULT 100000 CHECK (expected_amount = 100000),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  status text NOT NULL DEFAULT 'initialized'
    CHECK (status IN ('initialized', 'verified', 'expired', 'cancelled', 'refunded')),
  provider_checkout_id text UNIQUE,
  payment_id text UNIQUE,
  checkout_url text,
  request_body jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE UNIQUE INDEX bachs_one_pending_checkout
  ON public.bachs_checkouts(user_id, environment) WHERE status = 'initialized';
ALTER TABLE public.bachs_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bachs_checkouts FROM anon, authenticated;
GRANT ALL ON public.bachs_checkouts TO service_role;

CREATE TABLE public.bachs_payment_passes (
  checkout_reference text PRIMARY KEY REFERENCES public.bachs_checkouts(reference) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  paid_from timestamptz NOT NULL,
  paid_through timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (paid_through > paid_from)
);
CREATE INDEX bachs_pass_user ON public.bachs_payment_passes(user_id, environment, paid_through DESC);
ALTER TABLE public.bachs_payment_passes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bachs_payment_passes FROM anon, authenticated;
GRANT ALL ON public.bachs_payment_passes TO service_role;

CREATE TABLE public.bachs_webhook_events (
  event_key text PRIMARY KEY,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text
);
ALTER TABLE public.bachs_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bachs_webhook_events FROM anon, authenticated;
GRANT ALL ON public.bachs_webhook_events TO service_role;

CREATE FUNCTION public.begin_bachs_checkout(
  p_reference text, p_user_id uuid, p_environment text, p_email text, p_request jsonb
) RETURNS SETOF public.bachs_checkouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 7823));
  IF EXISTS (SELECT 1 FROM public.bachs_payment_passes WHERE user_id = p_user_id
      AND environment = p_environment AND revoked_at IS NULL AND paid_through > now())
    OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_user_id
      AND status IN ('active', 'non_renewing', 'attention') AND paid_through + interval '1 day' >= now()) THEN
    RAISE EXCEPTION 'Your listening access is already active.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bachs_checkouts WHERE user_id = p_user_id
      AND environment = p_environment AND status = 'initialized') THEN
    RETURN QUERY SELECT * FROM public.bachs_checkouts WHERE user_id = p_user_id
      AND environment = p_environment AND status = 'initialized';
    RETURN;
  END IF;
  RETURN QUERY INSERT INTO public.bachs_checkouts(reference, user_id, environment, customer_email, request_body)
    VALUES (p_reference, p_user_id, p_environment, p_email, p_request) RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.begin_bachs_checkout(text, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_bachs_checkout(text, uuid, text, text, jsonb) TO service_role;

CREATE FUNCTION public.fulfill_bachs_checkout(
  p_reference text, p_checkout_id text, p_payment_id text, p_paid_at timestamptz, p_environment text
) RETURNS SETOF public.bachs_payment_passes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE checkout public.bachs_checkouts;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT checkout FROM public.bachs_checkouts WHERE reference = p_reference FOR UPDATE;
  IF checkout.environment <> p_environment OR checkout.provider_checkout_id <> p_checkout_id
    OR p_payment_id IS NULL OR p_paid_at IS NULL OR p_paid_at > now() + interval '1 minute'
    OR p_paid_at < checkout.created_at - interval '1 minute' THEN
    RAISE EXCEPTION 'Payment does not match checkout' USING ERRCODE = '22023';
  END IF;
  IF checkout.status = 'refunded' THEN
    RAISE EXCEPTION 'This payment was refunded' USING ERRCODE = '22023';
  END IF;
  IF checkout.status <> 'verified' THEN
    INSERT INTO public.bachs_payment_passes(checkout_reference, user_id, environment, paid_from, paid_through)
      VALUES (p_reference, checkout.user_id, p_environment, p_paid_at, p_paid_at + interval '1 month');
    UPDATE public.bachs_checkouts SET status = 'verified', payment_id = p_payment_id,
      verified_at = now() WHERE reference = p_reference;
  ELSIF checkout.payment_id <> p_payment_id THEN
    RAISE EXCEPTION 'Payment does not match checkout' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT * FROM public.bachs_payment_passes WHERE checkout_reference = p_reference;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_bachs_checkout(text, text, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_bachs_checkout(text, text, text, timestamptz, text) TO service_role;

CREATE FUNCTION public.revoke_bachs_payment(p_payment_id text, p_environment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.bachs_payment_passes SET revoked_at = coalesce(revoked_at, now())
    WHERE checkout_reference IN (SELECT reference FROM public.bachs_checkouts
      WHERE payment_id = p_payment_id AND environment = p_environment);
  UPDATE public.bachs_checkouts SET status = 'refunded'
    WHERE payment_id = p_payment_id AND environment = p_environment;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_bachs_payment(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_bachs_payment(text, text) TO service_role;
