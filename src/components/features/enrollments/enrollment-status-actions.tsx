"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateEnrollmentStatus } from "@/app/(app)/enrollments/actions";
import { Button } from "@/components/ui/button";
import type { EnrollmentWithCourse } from "@/lib/data/enrollments.repository";
import {
  ENROLLMENT_STATUS_TRANSITIONS,
  ENROLLMENT_STATUS_LABELS,
  getTransitionLabel,
} from "@/lib/domain/enrollments/schema";
import type { EnrollmentStatus } from "@/types/database.types";

export function EnrollmentStatusActions({
  enrollment,
}: {
  enrollment: EnrollmentWithCourse;
}) {
  const [isPending, startTransition] = useTransition();
  const nextStatuses = ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];

  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "cancelada" ? "destructive" : "outline"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateEnrollmentStatus(enrollment.id, next as EnrollmentStatus);
              if (result.error) toast.error(result.error);
              else toast.success(`Matrícula marcada como ${ENROLLMENT_STATUS_LABELS[next as EnrollmentStatus]}`);
            })
          }
        >
          {getTransitionLabel(enrollment.status, next as EnrollmentStatus)}
        </Button>
      ))}
    </div>
  );
}
