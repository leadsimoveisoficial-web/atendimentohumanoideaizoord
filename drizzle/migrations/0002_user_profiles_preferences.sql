CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  music_genre text NOT NULL DEFAULT 'br-rock',
  music_volume numeric NOT NULL DEFAULT 0.35,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_name_length CHECK (char_length(display_name) <= 80),
  CONSTRAINT profile_volume_range CHECK (music_volume >= 0 AND music_volume <= 1),
  CONSTRAINT profile_genre_valid CHECK (music_genre IN ('br-rock','jazz','electronic','hits','rock','forro','pagode','sertanejo','hip-hop'))
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE OR REPLACE FUNCTION public.create_customer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', ''), 80)) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.create_customer_profile() FROM PUBLIC;
CREATE TRIGGER on_auth_user_created_customer_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();
INSERT INTO public.profiles (id, display_name) SELECT id, left(coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', ''), 80) FROM auth.users ON CONFLICT (id) DO NOTHING;