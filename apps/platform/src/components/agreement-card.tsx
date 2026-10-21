import { useState } from "react"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  DocumentValidationIcon,
  PrinterIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AgreementTicket } from "@/components/agreement-ticket"
import { ConfirmAcceptDialog } from "@/components/confirm-accept-dialog"
import { RejectAgreementDialog } from "@/components/reject-agreement-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ADVISORS, useAppStore } from "@/data/store"
import { formatCurrency, formatDateTime } from "@/data/format"
import type { Agreement, Owner } from "@/data/types"
import { cn } from "@/lib/utils"

type AgreementCardProps = {
  agreement: Agreement
  owner: Owner
  buildingName: string
  onAccept: () => void
  onReject: (reason: string) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function AgreementCard({
  agreement,
  owner,
  buildingName,
  onAccept,
  onReject,
}: AgreementCardProps) {
  const { currentAdvisor, setCurrentAdvisor } = useAppStore()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const resolved = agreement.status !== "propuesto"

  const statusBadge =
    agreement.status === "aceptado" ? (
      <Badge
        variant="outline"
        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        Aceptado
      </Badge>
    ) : agreement.status === "rechazado" ? (
      <Badge
        variant="outline"
        className="border-destructive/20 bg-destructive/10 text-destructive"
      >
        Rechazado
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        Pendiente de aprobación
      </Badge>
    )

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={DocumentValidationIcon} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Propuesta de acuerdo</p>
          <p className="truncate text-xs text-muted-foreground">
            Ref. {agreement.reference}
          </p>
        </div>
        {statusBadge}
      </div>

      <div className="mt-3 divide-y rounded-lg bg-muted/40 px-3">
        <Row label="Propietario" value={`${owner.firstName} ${owner.lastName}`} />
        <Row label="Unidad / Edificio" value={`${owner.unit} · ${buildingName}`} />
        <Row label="Deuda original" value={formatCurrency(agreement.originalDebt)} />
        <Row label="Quita de intereses" value={`${agreement.interestWaiver} %`} />
        <Row
          label="Plan"
          value={`${agreement.installments} ${agreement.installments === 1 ? "cuota" : "cuotas"}`}
        />
        <Row
          label="Monto por cuota"
          value={formatCurrency(agreement.installmentAmount)}
        />
        <Row label="Total a pagar" value={formatCurrency(agreement.totalToPay)} />
        <Row label="Vencimiento" value={`Día ${agreement.dueDay} de cada mes`} />
        <Row label="Propuesto" value={formatDateTime(agreement.proposedAt)} />
        {resolved && agreement.resolvedAt && (
          <Row label="Resuelto" value={formatDateTime(agreement.resolvedAt)} />
        )}
        {resolved && agreement.resolvedBy && (
          <Row label="Resuelto por" value={agreement.resolvedBy} />
        )}
        {resolved &&
          agreement.status === "rechazado" &&
          agreement.rejectionReason && (
            <Row label="Motivo" value={agreement.rejectionReason} />
          )}
      </div>

      {!resolved ? (
        <>
          {/* Selector del asesor que atiende */}
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <HugeiconsIcon
              icon={UserIcon}
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
            />
            <label
              htmlFor={`advisor-${agreement.id}`}
              className="shrink-0 text-xs text-muted-foreground"
            >
              Asesor:
            </label>
            <select
              id={`advisor-${agreement.id}`}
              value={currentAdvisor}
              onChange={(e) => setCurrentAdvisor(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
            >
              {ADVISORS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setRejectOpen(true)}
            >
              <HugeiconsIcon icon={Cancel01Icon} data-icon="inline-start" />
              Rechazar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setAcceptOpen(true)}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                data-icon="inline-start"
              />
              Aceptar acuerdo
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            className={cn(
              "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
              agreement.status === "aceptado"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}
          >
            <HugeiconsIcon
              icon={
                agreement.status === "aceptado"
                  ? CheckmarkBadge01Icon
                  : Cancel01Icon
              }
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2}
            />
            <span>
              {agreement.status === "aceptado"
                ? `Acuerdo aceptado por ${agreement.resolvedBy}. Registrado para trazabilidad.`
                : `Acuerdo rechazado por ${agreement.resolvedBy}.`}
            </span>
          </div>

          {/* Imprimir comprobante */}
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.print()}
            >
              <HugeiconsIcon icon={PrinterIcon} data-icon="inline-start" />
              Imprimir comprobante
            </Button>
          </div>

          {/* Ticket imprimible (oculto en pantalla, visible al imprimir) */}
          <AgreementTicket
            agreement={agreement}
            owner={owner}
            buildingName={buildingName}
          />
        </>
      )}

      <RejectAgreementDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={(reason) => onReject(reason)}
      />

      <ConfirmAcceptDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        advisor={currentAdvisor}
        reference={agreement.reference}
        total={formatCurrency(agreement.totalToPay)}
        installments={agreement.installments}
        onConfirm={onAccept}
      />
    </div>
  )
}
