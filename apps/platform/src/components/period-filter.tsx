import { periods, type PeriodKey } from "@/data/periods"
import { cn } from "@/lib/utils"

type PeriodFilterProps = {
  value: PeriodKey
  onChange: (value: PeriodKey) => void
  className?: string
}

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Rango temporal"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        className
      )}
    >
      {periods.map((p) => (
        <button
          key={p.key}
          type="button"
          role="tab"
          aria-selected={value === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === p.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="hidden sm:inline">{p.label}</span>
          <span className="sm:hidden">{p.short}</span>
        </button>
      ))}
    </div>
  )
}
