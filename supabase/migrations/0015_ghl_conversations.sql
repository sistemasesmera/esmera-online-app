-- Stores inbound WhatsApp/SMS messages received from GoHighLevel via webhook.
-- Each row = one message. Group by ghl_contact_id to reconstruct a conversation thread.

create table public.ghl_conversations (
  id                   uuid primary key default gen_random_uuid(),

  -- GHL identifiers
  ghl_contact_id       text not null,
  ghl_conversation_id  text,

  -- Contact info as received from GHL payload
  contact_name         text,
  contact_phone        text,
  contact_email        text,

  -- Message content
  message_body         text not null,
  message_type         text not null default 'WhatsApp',
  direction            text not null default 'inbound',
  message_status       text,

  -- Links to our system (resolved by phone at insert time, nullable)
  lead_id              uuid references public.leads(id) on delete set null,
  student_id           uuid references public.students(id) on delete set null,

  -- Full raw payload for debugging unknown field changes
  raw_payload          jsonb,

  received_at          timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index ghl_conversations_contact_id_idx      on public.ghl_conversations(ghl_contact_id);
create index ghl_conversations_conversation_id_idx on public.ghl_conversations(ghl_conversation_id);
create index ghl_conversations_phone_idx           on public.ghl_conversations(contact_phone);
create index ghl_conversations_lead_id_idx         on public.ghl_conversations(lead_id);
create index ghl_conversations_student_id_idx      on public.ghl_conversations(student_id);
create index ghl_conversations_received_at_idx     on public.ghl_conversations(received_at desc);

-- RLS: all authenticated users can read; inserts only via service_role (webhook)
alter table public.ghl_conversations enable row level security;

create policy "authenticated users can view ghl conversations"
  on public.ghl_conversations for select
  to authenticated
  using (true);
