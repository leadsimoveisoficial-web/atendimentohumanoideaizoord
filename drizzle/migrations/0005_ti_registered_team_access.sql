GRANT SELECT, INSERT, UPDATE, DELETE ON public.ti_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ti_tasks TO authenticated;
GRANT ALL ON public.ti_projects, public.ti_tasks TO service_role;
CREATE POLICY "Registered team manages TI projects" ON public.ti_projects FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Registered team manages TI tasks" ON public.ti_tasks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
COMMENT ON TABLE public.ti_projects IS 'Shared TI projects: all authenticated accounts may manage; anonymous access denied. No administrative roles granted.';
COMMENT ON TABLE public.ti_tasks IS 'Shared TI tasks: all authenticated accounts may manage; kitchen and security remain admin-only.';