import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { quizApi } from "@/api/quizApi";
import { startMobileSession, stopMobileSession } from "@/lib/mobileSync";
import { useMobileStore } from "@/state/mobileStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextField";

export function MobileModeButton() {
  const active = useMobileStore((state) => state.active);
  const url = useMobileStore((state) => state.url);
  const open = useMobileStore((state) => state.dialogOpen);
  const [qr, setQr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return quizApi.onMobileConnected(() => {
      useMobileStore.getState().closeDialog();
    });
  }, []);

  useEffect(() => {
    if (!url) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, { margin: 1, width: 240 }).then((data) => {
      if (!cancelled) setQr(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const close = () => useMobileStore.getState().closeDialog();
  const end = () => {
    void stopMobileSession();
  };

  const start = () => {
    setStarting(true);
    setError(null);
    void startMobileSession()
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not start mobile mode.",
        );
      })
      .finally(() => setStarting(false));
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => useMobileStore.getState().openDialog()}
      >
        {active && (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-green-500"
          />
        )}
        Mobile mode
      </Button>
      <Modal
        open={open}
        title={active ? "Mobile mode" : "Start mobile mode?"}
        onClose={close}
        footer={
          active ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="secondary"
                className="w-full !border-red-600 !text-red-600 hover:!bg-red-50 dark:!border-red-500 dark:!text-red-400 dark:hover:!bg-red-950/40"
                onClick={end}
              >
                End mobile mode
              </Button>
              <Button variant="secondary" className="w-full" onClick={close}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={starting}>
                Cancel
              </Button>
              <Button onClick={start} disabled={starting}>
                {starting ? "Starting…" : "Start"}
              </Button>
            </>
          )
        }
      >
        {active && url ? (
          <div className="flex flex-col items-center gap-3">
            {qr && (
              <img
                src={qr}
                width={240}
                height={240}
                alt="QR code to open the quiz on a phone"
              />
            )}
            <p className="text-center text-sm text-slate-600 dark:text-neutral-300">
              Scan this code with a phone on the same Wi-Fi.
            </p>
            <TextInput readOnly value={url} aria-label="Mobile quiz address" />
            <p className="text-center text-sm text-slate-500 dark:text-neutral-400">
              Closing this window keeps mobile mode running. It stops when you
              leave or finish the quiz.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600 dark:text-neutral-300">
              Start mobile mode so a phone on the same Wi-Fi can take this quiz
              with you. Answers stay in sync on both screens.
            </p>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
