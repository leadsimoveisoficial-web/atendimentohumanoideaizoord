create type public.app_role as enum ('admin', 'moderator', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- First account ever created becomes the owner (admin); later accounts need an admin to promote them.
create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_bootstrap_admin after insert on auth.users
for each row execute function public.bootstrap_first_admin();

create table public.security_cameras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text not null default 'salao',
  stream_url text not null default '',
  snapshot_url text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.security_cameras to authenticated;
grant all on public.security_cameras to service_role;
alter table public.security_cameras enable row level security;
create policy "Admins manage cameras" on public.security_cameras for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid,
  camera_name text not null default '',
  level text not null default 'info',
  summary text not null,
  people_count int,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.security_events to authenticated;
grant all on public.security_events to service_role;
alter table public.security_events enable row level security;
create policy "Admins read events" on public.security_events for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins add events" on public.security_events for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete events" on public.security_events for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.security_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  interval_minutes int not null default 5,
  open_time time not null default '11:00',
  close_time time not null default '23:30',
  updated_at timestamptz not null default now()
);
grant select, update on public.security_settings to authenticated;
grant all on public.security_settings to service_role;
alter table public.security_settings enable row level security;
create policy "Admins read settings" on public.security_settings for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update settings" on public.security_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.security_settings (id) values (1);

-- Public, privacy-safe status for the discreet indicator on the stage.
create or replace function public.security_mode_active()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.security_settings where id = 1), false)
$$;
grant execute on function public.security_mode_active() to anon, authenticated;

alter publication supabase_realtime add table public.security_events;