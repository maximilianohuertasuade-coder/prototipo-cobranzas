import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Tabs } from "@base-ui/react/tabs"
import {
  Building02Icon,
  CheckmarkCircle02Icon,
  GlobalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppShell } from "@/components/app-shell"
import { PolicyEditor } from "@/components/policy-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAppStore } from "@/data/store"
import type { CollectionPolicy } from "@/data/types"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/configuracion")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configuración | pacta.ia" }] }),
})

const tabTriggerClass =
  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm"

function ConfigPage() {
  return (
    <AppShell title="Configuración">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Políticas de la administración
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Definí las reglas que guían al agente al negociar. Las políticas
            globales aplican a todos los edificios, salvo que un edificio tenga
            su propia política.
          </p>
        </div>

        <Tabs.Root defaultValue="global">
          <Tabs.List className="mb-5 inline-flex gap-1 rounded-xl bg-muted p-1">
            <Tabs.Tab value="global" className={tabTriggerClass}>
              <HugeiconsIcon icon={GlobalIcon} className="size-4" strokeWidth={2} />
              Globales
            </Tabs.Tab>
            <Tabs.Tab value="building" className={tabTriggerClass}>
              <HugeiconsIcon
                icon={Building02Icon}
                className="size-4"
                strokeWidth={2}
              />
              Por edificio
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="global">
            <GlobalPolicyPanel />
          </Tabs.Panel>
          <Tabs.Panel value="building">
            <BuildingPolicyPanel />
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </AppShell>
  )
}

function GlobalPolicyPanel() {
  const { globalPolicy, setGlobalPolicy } = useAppStore()
  const [draft, setDraft] = useState<CollectionPolicy>(globalPolicy)
  const [saved, setSaved] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(globalPolicy)

  function save() {
    setGlobalPolicy(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Política global</CardTitle>
        <CardDescription>
          Reglas por defecto para toda la cartera de Consorcios del Sur.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <PolicyEditor
          idPrefix="global"
          policy={draft}
          onChange={setDraft}
        />
        <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-4"
                strokeWidth={2}
              />
              Guardado
            </span>
          )}
          <Button variant="outline" disabled={!dirty} onClick={() => setDraft(globalPolicy)}>
            Descartar
          </Button>
          <Button disabled={!dirty} onClick={save}>
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BuildingPolicyPanel() {
  const {
    buildings,
    selectedBuilding,
    setSelectedBuildingId,
    globalPolicy,
    setBuildingPolicy,
    setBuildingUsesGlobal,
  } = useAppStore()

  const b = selectedBuilding
  const usesGlobal = b.usesGlobalPolicy
  const [draft, setDraft] = useState<CollectionPolicy>(
    usesGlobal ? globalPolicy : b.policy
  )
  const [saved, setSaved] = useState(false)

  // Al cambiar de edificio, resetea el borrador.
  const [lastBuildingId, setLastBuildingId] = useState(b.id)
  if (lastBuildingId !== b.id) {
    setLastBuildingId(b.id)
    setDraft(b.usesGlobalPolicy ? globalPolicy : b.policy)
  }

  function save() {
    setBuildingPolicy(b.id, draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function toggleUsesGlobal(checked: boolean) {
    setBuildingUsesGlobal(b.id, checked)
    if (checked) setDraft(globalPolicy)
    else setDraft(b.policy)
  }

  return (
    <div className="space-y-5">
      {/* Selector de edificio */}
      <Card>
        <CardHeader>
          <CardTitle>Edificio</CardTitle>
          <CardDescription>
            Elegí el edificio para configurar su política particular.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {buildings.map((building) => (
              <button
                key={building.id}
                type="button"
                onClick={() => setSelectedBuildingId(building.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  building.id === b.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <HugeiconsIcon
                  icon={Building02Icon}
                  className="size-4"
                  strokeWidth={2}
                />
                {building.name}
                {!building.usesGlobalPolicy && (
                  <Badge variant="secondary" className="ml-1 text-[0.6rem]">
                    Propia
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Política de {b.name}</CardTitle>
              <CardDescription>{b.address}</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Usar política global
              </span>
              <Switch
                checked={usesGlobal}
                onCheckedChange={toggleUsesGlobal}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {usesGlobal && (
            <div className="mb-5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Este edificio usa la{" "}
              <span className="font-medium text-foreground">política global</span>
              . Desactivá el interruptor para definir reglas propias.
            </div>
          )}
          <PolicyEditor
            idPrefix={`building-${b.id}`}
            policy={draft}
            disabled={usesGlobal}
            onChange={setDraft}
          />
          {!usesGlobal && (
            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              {saved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-4"
                    strokeWidth={2}
                  />
                  Guardado
                </span>
              )}
              <Button onClick={save}>Guardar política del edificio</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
