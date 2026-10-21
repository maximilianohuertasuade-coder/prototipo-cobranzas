import { Link, useRouterState } from "@tanstack/react-router"
import {
  CheckmarkBadge01Icon,
  DashboardSquare02Icon,
  MessageMultiple02Icon,
  Settings02Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BuildingSwitcher } from "@/components/building-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const mainNav = [
  { title: "Dashboard", icon: DashboardSquare02Icon, to: "/dashboard" },
  {
    title: "Conversaciones",
    icon: MessageMultiple02Icon,
    to: "/conversaciones",
  },
  { title: "Acuerdos", icon: CheckmarkBadge01Icon, to: "/acuerdos" },
  { title: "Deudores", icon: UserMultipleIcon, to: "/deudores" },
] as const

const footerNav = [
  { title: "Configuración", icon: Settings02Icon, to: "/configuracion" },
] as const

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <BuildingSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    tooltip={item.title}
                    render={<Link to={item.to} />}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={pathname === item.to}
                tooltip={item.title}
                render={<Link to={item.to} />}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Simon">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
                S
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium">
                  Simon
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  Administradora
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
