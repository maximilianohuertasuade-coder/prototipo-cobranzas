import { Dialog } from "@base-ui/react/dialog"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ConfirmAcceptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  advisor: string
  reference: string
  total: string
  installments: number
  onConfirm: () => void
}

export function ConfirmAcceptDialog({
  open,
  onOpenChange,
  advisor,
  reference,
  total,
  installments,
  onConfirm,
}: ConfirmAcceptDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none",
            "transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Confirmar acuerdo
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                Vas a aceptar el acuerdo{" "}
                <span className="font-medium text-foreground">{reference}</span> en{" "}
                {installments} {installments === 1 ? "cuota" : "cuotas"} por un
                total de{" "}
                <span className="font-medium text-foreground">{total}</span>.
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Quedará registrado a nombre de{" "}
            <span className="font-medium text-foreground">{advisor}</span> con
            fecha y hora para su trazabilidad.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close render={<Button variant="outline" size="sm" />}>
              Cancelar
            </Dialog.Close>
            <Button
              size="sm"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                data-icon="inline-start"
              />
              Confirmar acuerdo
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
