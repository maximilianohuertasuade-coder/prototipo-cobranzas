import { Menu } from "@base-ui/react/menu"
import {
  Building02Icon,
  City02Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ALL_BUILDINGS, useAppStore } from "@/data/store"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function BuildingSwitcher() {
  const {
    buildings,
    selectedBuilding,
    isAllBuildings,
    setSelectedBuildingId,
    labels,
  } = useAppStore()
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu.Root>
          <Menu.Trigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={selectedBuilding.name}
                className="data-[popup-open]:bg-sidebar-accent"
              />
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon
                icon={isAllBuildings ? City02Icon : Building02Icon}
                strokeWidth={2}
              />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-semibold">
                {selectedBuilding.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {isAllBuildings
                  ? `${buildings.length} ${labels.entityPlural} · consolidado`
                  : `${selectedBuilding.units} ${labels.unitShort} · mora ${selectedBuilding.metrics.delinquencyRate.toLocaleString(
                      "es-AR",
                      { maximumFractionDigits: 1 }
                    )}%`}
              </span>
            </span>
            {!collapsed && (
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                className="ml-auto size-4 text-muted-foreground"
                strokeWidth={2}
              />
            )}
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner
              side="bottom"
              align="start"
              sideOffset={6}
              className="z-50"
            >
              <Menu.Popup className="max-h-[70vh] w-(--anchor-width) min-w-64 overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Vista
                </div>
                <Menu.Item
                  onClick={() => setSelectedBuildingId(ALL_BUILDINGS)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm outline-none select-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    isAllBuildings && "bg-accent/60"
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <HugeiconsIcon
                      icon={City02Icon}
                      className="size-4"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-medium">
                      {labels.allEntities}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Vista consolidada · {buildings.length} {labels.entityPlural}
                    </span>
                  </span>
                  {isAllBuildings && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      className="size-4 shrink-0 text-primary"
                      strokeWidth={2}
                    />
                  )}
                </Menu.Item>

                <div className="mt-1 border-t px-2 pt-2 pb-1.5 text-xs font-medium text-muted-foreground">
                  {labels.entityPluralCapital} administrad
                  {labels.entity === "institución" || labels.entity === "sucursal"
                    ? "as"
                    : "os"}
                </div>
                {buildings.map((building) => {
                  const isActive = building.id === selectedBuilding.id
                  return (
                    <Menu.Item
                      key={building.id}
                      onClick={() => setSelectedBuildingId(building.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm outline-none select-none",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                        isActive && "bg-accent/60"
                      )}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <HugeiconsIcon
                          icon={Building02Icon}
                          className="size-4"
                          strokeWidth={2}
                        />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate font-medium">
                          {building.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          mora{" "}
                          {building.metrics.delinquencyRate.toLocaleString(
                            "es-AR",
                            { maximumFractionDigits: 1 }
                          )}
                          % · {building.units} {labels.unitShort}
                        </span>
                      </span>
                      {isActive && (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          className="size-4 shrink-0 text-primary"
                          strokeWidth={2}
                        />
                      )}
                    </Menu.Item>
                  )
                })}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
