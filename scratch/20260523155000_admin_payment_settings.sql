-- Create public.payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, to avoid duplicate errors
DROP POLICY IF EXISTS "Allow select payment_settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Allow admins ALL on payment_settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Allow admins ALL on city_pricing_config" ON public.city_pricing_config;
DROP POLICY IF EXISTS "Allow admins ALL on cities" ON public.cities;

-- Create Policies
CREATE POLICY "Allow select payment_settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Allow admins ALL on payment_settings" ON public.payment_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow admins ALL on city_pricing_config" ON public.city_pricing_config FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow admins ALL on cities" ON public.cities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Insert defaults
INSERT INTO public.payment_settings (key, value) VALUES
('default_unlock_duration_hours', '5'),
('default_unlock_price_tier_1', '99'),
('default_unlock_price_tier_2', '49'),
('default_unlock_price_tier_3', '49'),
('default_provider_basic_fee_tier_1', '2999'),
('default_provider_basic_fee_tier_2', '1999'),
('default_provider_basic_fee_tier_3', '499'),
('default_provider_premium_fee_tier_1', '20000'),
('default_provider_premium_fee_tier_2', '15000'),
('default_provider_premium_fee_tier_3', '5000'),
('active_gateway', 'razorpay'),
('gateway_key_razorpay', 'rzp_test_SpC8XTKEi3eJGe'),
('gateway_key_stripe', 'pk_test_stripe'),
('gateway_key_paytm', 'paytm_test_key')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
