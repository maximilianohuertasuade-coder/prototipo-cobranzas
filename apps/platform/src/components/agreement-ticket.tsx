import { formatCurrency, formatDateTime } from "@/data/format"
import type { Agreement, Owner } from "@/data/types"

type AgreementTicketProps = {
  agreement: Agreement
  owner: Owner
  buildingName: string
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-1 text-[13px]">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-900">{value}</span>
    </div>
  )
}

/**
 * Comprobante imprimible de un acuerdo. Se monta oculto y solo se muestra al
 * imprimir (ver estilos @media print en styles.css con la clase .ticket-print).
 */
export function AgreementTicket({
  agreement,
  owner,
  buildingName,
}: AgreementTicketProps) {
  const accepted = agreement.status === "aceptado"

  return (
    <div className="ticket-print hidden">
      <div className="mx-auto max-w-[420px] bg-white p-6 text-neutral-900">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div>
            <p className="text-lg font-semibold lowercase">pacta.ia</p>
            <p className="text-xs text-neutral-500">
              Comprobante de acuerdo de pago
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Referencia</p>
            <p className="font-mono text-sm font-semibold">
              {agreement.reference}
            </p>
          </div>
        </div>

        {/* Estado */}
        <div className="mt-3">
          <span
            className={
              accepted
                ? "inline-block rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                : "inline-block rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
            }
          >
            {accepted ? "ACUERDO CONFIRMADO" : "ACUERDO RECHAZADO"}
          </span>
        </div>

        {/* Datos del propietario */}
        <div className="mt-4 border-b border-neutral-200 pb-2">
          <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Propietario
          </p>
          <Line label="Nombre" value={`${owner.firstName} ${owner.lastName}`} />
          <Line label="Unidad" value={owner.unit} />
          <Line label="Edificio" value={buildingName} />
          <Line label="Teléfono" value={owner.phone} />
        </div>

        {/* Detalle del acuerdo */}
        <div className="mt-3 border-b border-neutral-200 pb-2">
          <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Detalle del acuerdo
          </p>
          <Line label="Deuda original" value={formatCurrency(agreement.originalDebt)} />
          <Line label="Quita de intereses" value={`${agreement.interestWaiver} %`} />
          <Line
            label="Plan"
            value={`${agreement.installments} ${agreement.installments === 1 ? "cuota" : "cuotas"}`}
          />
          <Line
            label="Monto por cuota"
            value={formatCurrency(agreement.installmentAmount)}
          />
          <Line label="Vencimiento" value={`Día ${agreement.dueDay} de cada mes`} />
          <div className="mt-1 flex items-center justify-between border-t border-dashed border-neutral-300 pt-2">
            <span className="text-sm font-semibold">Total a pagar</span>
            <span className="text-base font-bold">
              {formatCurrency(agreement.totalToPay)}
            </span>
          </div>
        </div>

        {/* Motivo de rechazo */}
        {!accepted && agreement.rejectionReason && (
          <div className="mt-3 border-b border-neutral-200 pb-2">
            <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Motivo del rechazo
            </p>
            <p className="text-[13px]">{agreement.rejectionReason}</p>
          </div>
        )}

        {/* Trazabilidad */}
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Trazabilidad
          </p>
          <Line
            label={accepted ? "Aceptado por" : "Rechazado por"}
            value={agreement.resolvedBy ?? "—"}
          />
          <Line
            label="Fecha y hora"
            value={
              agreement.resolvedAt ? formatDateTime(agreement.resolvedAt) : "—"
            }
          />
          <Line label="Propuesto por" value="Agente de IA · pacta.ia" />
          <Line label="Propuesto el" value={formatDateTime(agreement.proposedAt)} />
        </div>

        {/* Firma */}
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="border-t border-neutral-400 pt-1 text-center text-[11px] text-neutral-500">
            Firma del asesor
          </div>
          <div className="border-t border-neutral-400 pt-1 text-center text-[11px] text-neutral-500">
            Firma del propietario
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-neutral-400">
          Documento generado por pacta.ia · {formatDateTime(new Date().toISOString())}
          <br />
          Comprobante no válido como factura. Uso interno para trazabilidad.
        </p>
      </div>
    </div>
  )
}
