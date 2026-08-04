"use client";

import { BookOpen, ChevronLeft, ExternalLink, FileText, FolderOpen, Hash, Mail, Paperclip, Phone, Plus, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { getEnrollmentColumns } from "@/components/features/enrollments/enrollment-columns";
import { EnrollmentForm } from "@/components/features/enrollments/enrollment-form";
import { AttachmentsTab } from "@/components/features/students/attachments-tab";
import { StudentForm } from "@/components/features/students/student-form";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { PhoneDisplay } from "@/components/shared/phone-display";
import { DataTable } from "@/components/shared/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttachmentWithUrl } from "@/lib/data/attachments.shared";
import type { CertificateWithJoins } from "@/lib/data/certificates.repository";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { EnrollmentWithCourse } from "@/lib/data/enrollments.repository";
import type { FollowupForStudent } from "@/lib/data/followups.repository";
import type { StudentWithComercial } from "@/lib/data/students.repository";
import type { UserRow } from "@/lib/data/users.repository";
import type { ActivityLogRow } from "@/lib/data/activity-logs.repository";

export function StudentDetailClient({
  student,
  enrollments,
  followups,
  certificates,
  attachments,
  enrollmentAttachments,
  activityLogs,
  leadActivityLogs,
  courses,
  users,
  canEdit,
  canManageAttachments,
  canFollowup,
  canAssignStudent = false,
  currentUserId,
  currentUserName,
}: {
  student: StudentWithComercial;
  enrollments: EnrollmentWithCourse[];
  followups: FollowupForStudent[];
  certificates: CertificateWithJoins[];
  attachments: AttachmentWithUrl[];
  enrollmentAttachments: AttachmentWithUrl[];
  activityLogs: ActivityLogRow[];
  leadActivityLogs: ActivityLogRow[];
  courses: CourseRow[];
  users: UserRow[];
  canEdit: boolean;
  canManageAttachments?: boolean;
  canFollowup: boolean;
  canAssignStudent?: boolean;
  currentUserId: string;
  currentUserName?: string;
}) {
  const [addEnrollmentOpen, setAddEnrollmentOpen] = useState(false);

  const enrollmentColumns = getEnrollmentColumns(canEdit);

  const studentAttachments = attachments.filter((a) => !a.certificate_id);

  // Group enrollment attachments by enrollment_id
  const attachmentsByEnrollment = enrollments.map((e) => ({
    enrollment: e,
    attachments: enrollmentAttachments.filter((a) => a.enrollment_id === e.id),
  })).filter((g) => g.attachments.length > 0);

  const totalAttachments = studentAttachments.length + enrollmentAttachments.length;

  return (
    <>
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Alumnos</span>
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card card-shadow p-5 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-black select-none">
            {student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-black tracking-tight">{student.full_name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">{student.dni_nie}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded px-1.5 py-0.5">
                    <Hash className="h-3 w-3" />{student.student_number}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact + KPIs */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
              {student.email && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {student.email}
                </span>
              )}
              {student.phone && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <PhoneDisplay phone={student.phone} />
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {student.assigned_user?.full_name ?? <span className="italic">Sin comercial</span>}
              </span>
              <div className="flex items-center gap-3 ml-auto">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {enrollments.length} matrícula{enrollments.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  {totalAttachments} adjunto{totalAttachments !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="datos">
        <TabsList className="mb-6 h-9">
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="matriculas">
            Matrículas ({enrollments.length})
          </TabsTrigger>
          <TabsTrigger value="adjuntos">
            Adjuntos ({totalAttachments})
          </TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        {/* ── DATOS PERSONALES ── */}
        <TabsContent value="datos">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-card card-shadow p-6">
                <h2 className="text-sm font-semibold mb-4">Editar datos personales</h2>
                <StudentForm student={student} users={users} canAssign={canAssignStudent} />
              </div>
            </div>

            {/* Read-only summary */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card card-shadow p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumen</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Nombre completo</dt>
                    <dd className="font-medium mt-0.5">{student.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">DNI / NIE</dt>
                    <dd className="font-mono mt-0.5">{student.dni_nie}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="mt-0.5 break-all">{student.email}</dd>
                  </div>
                  {student.phone && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Teléfono</dt>
                      <dd className="mt-0.5"><PhoneDisplay phone={student.phone} /></dd>
                    </div>
                  )}
                  {student.address && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Dirección</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap">{student.address}</dd>
                    </div>
                  )}
                  {student.province && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Provincia</dt>
                      <dd className="mt-0.5">{student.province}</dd>
                    </div>
                  )}
                  {student.postal_code && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Código postal</dt>
                      <dd className="mt-0.5">{student.postal_code}</dd>
                    </div>
                  )}
                  {student.birth_date && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Fecha de nacimiento</dt>
                      <dd className="mt-0.5">{new Date(student.birth_date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted-foreground">Comercial asignado</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {student.assigned_user?.full_name ?? (
                        <span className="text-muted-foreground italic">Sin asignar</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Alta en el sistema</dt>
                    <dd className="mt-0.5">
                      {new Date(student.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── MATRÍCULAS ── */}
        <TabsContent value="matriculas">
          {canEdit && (
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setAddEnrollmentOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nueva matrícula
              </Button>
            </div>
          )}
          <DataTable columns={enrollmentColumns} data={enrollments} />
        </TabsContent>

        {/* ── ADJUNTOS ── */}
        <TabsContent value="adjuntos" className="space-y-6">
          {/* Adjuntos personales del alumno */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Documentos del alumno
            </h3>
            <AttachmentsTab
              studentId={student.id}
              attachments={studentAttachments}
              canUpload={canManageAttachments ?? canEdit}
              canDelete={canManageAttachments ?? canEdit}
              currentUserName={currentUserName}
            />
          </div>

          {/* Adjuntos por matrícula */}
          {attachmentsByEnrollment.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Adjuntos por matrícula
              </h3>
              {attachmentsByEnrollment.map(({ enrollment, attachments: eAttachments }) => (
                <div key={enrollment.id} className="rounded-lg border">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">
                      #{enrollment.enrollment_number} — {enrollment.courses?.name ?? "Matrícula"}
                    </span>
                    <a
                      href={`/enrollments/${enrollment.id}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Ver matrícula
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <ul className="divide-y">
                    {eAttachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.title ?? a.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString("es-ES")}
                            {a.users?.full_name && <span className="ml-1">· {a.users.full_name}</span>}
                          </p>
                        </div>
                        {a.signed_url && (
                          <a
                            href={a.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1 shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ACTIVIDAD ── */}
        <TabsContent value="actividad">
          <ActivityFeed
            logs={activityLogs}
            priorLeadLogs={leadActivityLogs}
            emptyText="Sin actividad registrada para este alumno."
          />
        </TabsContent>
      </Tabs>

      {/* Dialog: nueva matrícula */}
      <Dialog open={addEnrollmentOpen} onOpenChange={setAddEnrollmentOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva matrícula — {student.full_name}</DialogTitle>
          </DialogHeader>
          <EnrollmentForm
            key={String(addEnrollmentOpen)}
            courses={courses}
            presetStudentId={student.id}
            onSuccess={() => setAddEnrollmentOpen(false)}
            canEdit={canEdit}
          />
        </DialogContent>
      </Dialog>

    </>
  );
}
