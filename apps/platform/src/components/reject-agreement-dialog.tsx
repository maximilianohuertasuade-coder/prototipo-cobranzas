import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { REJECTION_REASONS } from "@/data/types"
import { cn } from "@/lib/utils"

type RejectAgreementDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
}

export function RejectAgreementDialog({
  open,
  onOpenChange,
  onConfirm,
}: RejectAgreementDialogProps) {
  const [selected, setSelected] = useState<string>("")
  const [custom, setCustom] = useState("")

  const reason = selected === "__custom__" ? custom.trim() : selected
  const canConfirm = reason.length > 0

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm(reason)
    onOpenChange(false)
    setSelected("")
    setCustom("")
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none",
            "transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Rechazar acuerdo
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                Indicá el motivo del rechazo. Queda registrado para la
                trazabilidad.
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {REJECTION_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  selected === r
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/60"
                )}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  checked={selected === r}
                  onChange={() => setSelected(r)}
                  className="size-4 accent-primary"
                />
                {r}
              </label>
            ))}

            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                selected === "__custom__"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/60"
              )}
            >
              <input
                type="radio"
                name="reject-reason"
                checked={selected === "__custom__"}
                onChange={() => setSelected("__custom__")}
                className="size-4 accent-primary"
              />
              Otro motivo
            </label>

            {selected === "__custom__" && (
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Escribí el motivo…"
                rows={2}
                autoFocus
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close
              render={<Button variant="outline" size="sm" />}
            >
              Cancelar
            </Dialog.Close>
            <Button
              variant="destructive"
              size="sm"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Confirmar rechazo
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
