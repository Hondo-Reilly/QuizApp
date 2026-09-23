import type { MouseEventHandler } from "react";
import { Button } from "./Button";

export interface DialogActionsProps {
  onCancel: () => void;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
  confirmLabel: string;
  busy?: boolean;
}

export function DialogActions({
  onCancel,
  onConfirm,
  confirmLabel,
  busy = false,
}: DialogActionsProps) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={busy}>
        {confirmLabel}
      </Button>
    </>
  );
}
