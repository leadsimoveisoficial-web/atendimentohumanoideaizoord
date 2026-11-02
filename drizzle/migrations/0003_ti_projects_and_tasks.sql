CREATE TABLE public.ti_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
 url text NOT NULL DEFAULT '',
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ti_projects TO authenticated;
GRANT ALL ON public.ti_projects TO service_role;
ALTER TABLE public.ti_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI admins manage projects" ON public.ti_projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX ti_projects_name_unique ON public.ti_projects (lower(name));
CREATE TABLE public.ti_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES public.ti_projects(id) ON DELETE CASCADE,
 text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 4000),
 kind text NOT NULL DEFAULT 'melhoria' CHECK (kind IN ('melhoria', 'erro')),
 done boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ti_tasks TO authenticated;
GRANT ALL ON public.ti_tasks TO service_role;
ALTER TABLE public.ti_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI admins manage tasks" ON public.ti_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ti_tasks_project_idx ON public.ti_tasks(project_id, created_at);
