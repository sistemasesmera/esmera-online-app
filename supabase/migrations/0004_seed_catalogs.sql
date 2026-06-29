-- Esmera Online Manager — datos de catálogo iniciales

insert into public.roles (code, name, description) values
  ('administrador','Administrador','Permisos completos sobre el sistema'),
  ('comercial','Comercial','Gestión de leads, oportunidades y ventas'),
  ('administracion','Administración','Validación y gestión de matrículas, certificados y expedientes'),
  ('tutor','Tutor','Seguimiento de alumnos asignados'),
  ('direccion','Dirección','Acceso de solo lectura a dashboard e informes')
on conflict (code) do nothing;

insert into public.pipeline_stages (code, name, display_order, is_won, is_lost) values
  ('contactado','Contactado',1,false,false),
  ('propuesta_enviada','Propuesta enviada',2,false,false),
  ('negociacion','Negociación',3,false,false),
  ('ganada','Ganada',4,true,false),
  ('perdida','Perdida',5,false,true)
on conflict (code) do nothing;

insert into public.platforms (code, name) values
  ('moodle','Moodle'),
  ('evolcampus','EvolCampus')
on conflict (code) do nothing;
