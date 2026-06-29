-- Esmera Online Manager — auditoría
-- Trigger genérico aplicado a las tablas de negocio con relevancia legal/operativa.
-- `metadata` se enriquece opcionalmente desde la aplicación vía
-- set_config('app.audit_metadata', '<json>', true) antes de la query.

create or replace function public.audit_trigger_fn()
returns trigger language plpgsql security definer as $$
declare
  v_metadata jsonb;
begin
  begin
    v_metadata := current_setting('app.audit_metadata', true)::jsonb;
  exception when others then
    v_metadata := null;
  end;

  if (tg_op = 'DELETE') then
    insert into public.audit_logs(table_name, record_id, action, changed_by, old_values, metadata)
    values (tg_table_name, old.id, tg_op, auth.uid(), to_jsonb(old), v_metadata);
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_logs(table_name, record_id, action, changed_by, old_values, new_values, metadata)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new), v_metadata);
    return new;
  else
    insert into public.audit_logs(table_name, record_id, action, changed_by, new_values, metadata)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(new), v_metadata);
    return new;
  end if;
end;
$$;

create trigger trg_audit_leads after insert or update or delete on public.leads
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_opportunities after insert or update or delete on public.opportunities
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_students after insert or update or delete on public.students
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_enrollments after insert or update or delete on public.enrollments
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_contracts after insert or update or delete on public.contracts
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_tutor_followups after insert or update or delete on public.tutor_followups
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_certificates after insert or update or delete on public.certificates
  for each row execute function public.audit_trigger_fn();
