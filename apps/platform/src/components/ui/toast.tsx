import { Toast } from "@base-ui/react/toast"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

// Manager global: permite disparar toasts desde cualquier parte de la app.
export const toastManager = Toast.createToastManager()

type ToastTone = "success" | "error" | "info" | "warning"

/** API simple para disparar notificaciones. */
export const notify = {
  success: (title: string, description?: string) =>
    toastManager.add({ title, description, data: { tone: "success" } }),
  error: (title: string, description?: string) =>
    toastManager.add({ title, description, data: { tone: "error" } }),
  info: (title: string, description?: string) =>
    toastManager.add({ title, description, data: { tone: "info" } }),
  warning: (title: string, description?: string) =>
    toastManager.add({ title, description, data: { tone: "warning" } }),
}

const toneMeta: Record<
  ToastTone,
  { icon: typeof CheckmarkCircle02Icon; className: string }
> = {
  success: {
    icon: CheckmarkCircle02Icon,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  error: { icon: Cancel01Icon, className: "text-destructive" },
  info: { icon: InformationCircleIcon, className: "text-sky-600 dark:text-sky-400" },
  warning: { icon: Alert02Icon, className: "text-amber-600 dark:text-amber-400" },
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => {
    const tone = (toast.data as { tone?: ToastTone } | undefined)?.tone ?? "info"
    const meta = toneMeta[tone]
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "absolute right-0 bottom-0 left-auto z-50 w-80 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5",
          "transition-all [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-index)*-0.75rem))_scale(calc(1-(var(--toast-index)*0.05)))]",
          "data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0"
        )}
        style={{ zIndex: "calc(50 - var(--toast-index))" } as React.CSSProperties}
      >
        <div className="flex items-start gap-2.5">
          <HugeiconsIcon
            icon={meta.icon}
            className={cn("mt-0.5 size-4 shrink-0", meta.className)}
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <Toast.Title className="text-sm font-medium" />
            <Toast.Description className="mt-0.5 text-xs text-muted-foreground" />
          </div>
          <Toast.Close
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
          </Toast.Close>
        </div>
      </Toast.Root>
    )
  })
}

/** Monta el sistema de toasts. Colocar una vez cerca de la raíz. */
export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 flex-col">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
