import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/data/format"
import type { CollectionPolicy } from "@/data/types"
import { cn } from "@/lib/utils"

function PolicySlider({
  id,
  label,
  display,
  min,
  max,
  step = 1,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  display: string
  min: number
  max: number
  step?: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-muted-foreground">
          {label}
        </label>
        <span className="font-medium tabular-nums">{display}</span>
      </div>
      <div className="relative flex h-5 items-center">
        <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
          <div
            className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm"
            style={{ left: `calc(${percent}% - 7px)` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  )
}

type PolicyEditorProps = {
  idPrefix: string
  policy: CollectionPolicy
  disabled?: boolean
  onChange: (policy: CollectionPolicy) => void
}

export function PolicyEditor({
  idPrefix,
  policy,
  disabled = false,
  onChange,
}: PolicyEditorProps) {
  function patch(partial: Partial<CollectionPolicy>) {
    onChange({ ...policy, ...partial })
  }

  return (
    <div className="space-y-6">
      <PolicySlider
        id={`${idPrefix}-max-installments`}
        label="Máximo de cuotas que puede ofrecer el agente"
        display={`${policy.maxInstallments} ${policy.maxInstallments === 1 ? "cuota" : "cuotas"}`}
        min={1}
        max={12}
        value={policy.maxInstallments}
        disabled={disabled}
        onChange={(v) => patch({ maxInstallments: v })}
      />

      <PolicySlider
        id={`${idPrefix}-interest-waiver`}
        label="Quita máxima de intereses"
        display={`${policy.interestWaiver} %`}
        min={0}
        max={50}
        value={policy.interestWaiver}
        disabled={disabled}
        onChange={(v) => patch({ interestWaiver: v })}
      />

      <div className={cn("space-y-1.5", disabled && "opacity-50")}>
        <label
          htmlFor={`${idPrefix}-min-installment`}
          className="text-sm text-muted-foreground"
        >
          Monto mínimo por cuota
        </label>
        <Input
          id={`${idPrefix}-min-installment`}
          type="number"
          min={0}
          step={1000}
          value={policy.minInstallmentAmount}
          disabled={disabled}
          onChange={(e) =>
            patch({ minInstallmentAmount: Number(e.target.value) || 0 })
          }
          className="h-9 font-medium tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          {formatCurrency(policy.minInstallmentAmount)} por cuota como mínimo.
        </p>
      </div>

      <div className={cn("grid grid-cols-2 gap-4", disabled && "opacity-50")}>
        <div className="space-y-1.5">
          <label
            htmlFor={`${idPrefix}-hour-start`}
            className="text-sm text-muted-foreground"
          >
            Contacto desde (hs)
          </label>
          <Input
            id={`${idPrefix}-hour-start`}
            type="number"
            min={0}
            max={23}
            value={policy.contactHourStart}
            disabled={disabled}
            onChange={(e) =>
              patch({ contactHourStart: Number(e.target.value) || 0 })
            }
            className="h-9 tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${idPrefix}-hour-end`}
            className="text-sm text-muted-foreground"
          >
            Contacto hasta (hs)
          </label>
          <Input
            id={`${idPrefix}-hour-end`}
            type="number"
            min={0}
            max={23}
            value={policy.contactHourEnd}
            disabled={disabled}
            onChange={(e) =>
              patch({ contactHourEnd: Number(e.target.value) || 0 })
            }
            className="h-9 tabular-nums"
          />
        </div>
      </div>

      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-lg bg-muted/50 p-3",
          disabled && "opacity-50"
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">Cierre automático de acuerdos</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            El agente cierra pre-acuerdos sin aprobación humana cuando están
            dentro de la política.
          </p>
        </div>
        <Switch
          checked={policy.autoCloseAgreements}
          disabled={disabled}
          onCheckedChange={(checked: boolean) =>
            patch({ autoCloseAgreements: checked })
          }
        />
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-1.5 rounded-lg border border-dashed p-3",
          disabled && "opacity-50"
        )}
      >
        <p className="w-full text-xs font-medium">Resumen de la política</p>
        <Badge variant="outline" className="text-[0.65rem]">
          Hasta {policy.maxInstallments}{" "}
          {policy.maxInstallments === 1 ? "cuota" : "cuotas"}
        </Badge>
        <Badge variant="outline" className="text-[0.65rem]">
          {policy.interestWaiver}% de quita
        </Badge>
        <Badge variant="outline" className="text-[0.65rem]">
          Mín. {formatCurrency(policy.minInstallmentAmount)}/cuota
        </Badge>
        <Badge variant="outline" className="text-[0.65rem]">
          {policy.contactHourStart}–{policy.contactHourEnd} hs
        </Badge>
        <Badge variant="outline" className="text-[0.65rem]">
          {policy.autoCloseAgreements ? "Cierre automático" : "Requiere aprobación"}
        </Badge>
      </div>
    </div>
  )
}
