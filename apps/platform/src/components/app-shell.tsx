import type { ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { GlobalSearch } from "@/components/global-search"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type AppShellProps = {
  title: string
  /** Acciones opcionales a la derecha del header. */
  actions?: ReactNode
  children: ReactNode
  /** Si el contenido maneja su propio scroll/altura (p. ej. chat). */
  fullHeight?: boolean
}

export function AppShell({
  title,
  actions,
  children,
  fullHeight = false,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-2 backdrop-blur md:px-4">
          <SidebarTrigger aria-label="Abrir o cerrar navegación" />
          <div className="h-4 w-px bg-border" />
          <p className="text-sm font-medium">{title}</p>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </header>

        {fullHeight ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <div className="flex flex-1 flex-col p-2 md:p-4 lg:p-6">
            {children}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
