create table public.agent_config (
  id            uuid primary key default gen_random_uuid(),
  is_active     boolean   not null default false,
  model         text      not null default 'gpt-4o-mini',
  welcome_message text    not null default '¡Hola! Soy el asistente virtual de Esmera School. ¿En qué puedo ayudarte?',
  system_prompt text      not null default '',
  knowledge     text      not null default '',
  updated_at    timestamptz default now(),
  updated_by    uuid references public.users(id)
);

-- Only one config row ever
create unique index agent_config_singleton on public.agent_config ((true));

-- Seed the single row
insert into public.agent_config (system_prompt, knowledge) values ('', '');
