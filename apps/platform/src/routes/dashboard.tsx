import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Notification02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppShell } from "@/components/app-shell"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { PeriodFilter } from "@/components/period-filter"
import { Button } from "@/components/ui/button"
import type { PeriodKey } from "@/data/periods"

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard | pacta.ia" }] }),
})

function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("month")

  return (
    <AppShell
      title="Dashboard"
      actions={
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Notificaciones">
            <HugeiconsIcon icon={Notification02Icon} strokeWidth={2} />
          </Button>
          <Button aria-label="Nueva negociación">
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            <span className="hidden sm:inline">Nueva negociación</span>
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Resumen de la cartera
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <DashboardOverview period={period} />
    </AppShell>
  )
}
