"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateContractStatus } from "@/app/(app)/crm/contracts/actions";
import { Button } from "@/components/ui/button";
import type { ContractWithJoins } from "@/lib/data/contracts.repository";
import {
  CONTRACT_STATUS_TRANSITIONS,
  CONTRACT_STATUS_LABELS,
  getContractTransitionLabel,
} from "@/lib/domain/contracts/schema";
import type { ContractStatus } from "@/types/database.types";

export function ContractStatusActions({ contract }: { contract: ContractWithJoins }) {
  const [isPending, startTransition] = useTransition();
  const nextStatuses = CONTRACT_STATUS_TRANSITIONS[contract.status];

  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "anulado" ? "destructive" : "outline"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateContractStatus(contract.id, next as ContractStatus);
              if (result.error) toast.error(result.error);
              else toast.success(`Contrato: ${CONTRACT_STATUS_LABELS[next as ContractStatus]}`);
            })
          }
        >
          {getContractTransitionLabel(contract.status, next as ContractStatus)}
        </Button>
      ))}
    </div>
  );
}
