"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { getFollowupColumns } from "@/components/features/tutoring/followup-columns";
import { FollowupForm } from "@/components/features/tutoring/followup-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EnrollmentForFollowup, FollowupWithJoins } from "@/lib/data/followups.repository";

export function TutoringClient({
  activeEnrollments,
  followups,
  canAdd,
  showTutor,
}: {
  activeEnrollments: EnrollmentForFollowup[];
  followups: FollowupWithJoins[];
  canAdd: boolean;
  showTutor: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetEnrollmentId, setPresetEnrollmentId] = useState("");

  const followupColumns = getFollowupColumns(showTutor);

  function openFor(enrollmentId: string) {
    setPresetEnrollmentId(enrollmentId);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Matrículas activas */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Matrículas activas a tu cargo</h2>
        {activeEnrollments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay matrículas activas asignadas.</p>
        ) : (
          <div className="grid gap-2">
            {activeEnrollments.map((e) => (
              <Card key={e.id} className="py-3">
                <CardContent className="flex items-center justify-between px-4 py-0">
                  <div>
                    <p className="font-medium text-sm">{e.students?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{e.courses?.name ?? "—"}</p>
                  </div>
                  {canAdd && (
                    <Button size="sm" variant="outline" onClick={() => openFor(e.id)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Seguimiento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Historial de seguimientos</h2>
          {canAdd && (
            <Button size="sm" onClick={() => openFor("")}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo seguimiento
            </Button>
          )}
        </div>
        <DataTable columns={followupColumns} data={followups} />
      </section>

      {canAdd && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo seguimiento</DialogTitle>
            </DialogHeader>
            <FollowupForm
              key={presetEnrollmentId || "new"}
              enrollments={activeEnrollments}
              presetEnrollmentId={presetEnrollmentId || undefined}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
