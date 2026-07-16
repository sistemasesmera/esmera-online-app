-- Normalize existing phone numbers (strip spaces and +34/0034 prefix)
update public.leads
set phone = regexp_replace(regexp_replace(phone, '\s+', '', 'g'), '^(\+34|0034)', '', 'g')
where phone is not null;

update public.students
set phone = regexp_replace(regexp_replace(phone, '\s+', '', 'g'), '^(\+34|0034)', '', 'g')
where phone is not null;

-- Unique phone per active lead (soft-delete aware)
create unique index idx_leads_phone
  on public.leads(phone)
  where deleted_at is null and phone is not null;

-- Unique phone per active student (soft-delete aware)
create unique index idx_students_phone
  on public.students(phone)
  where deleted_at is null and phone is not null;
