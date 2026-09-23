import { useEffect, useRef } from "react";
import { installMobileSync, setRemoteFinishHandler } from "@/lib/mobileSync";

export function useMobileSync(onRemoteFinish: () => void): void {
  const handler = useRef(onRemoteFinish);
  handler.current = onRemoteFinish;

  useEffect(() => {
    setRemoteFinishHandler(() => handler.current());
    return installMobileSync();
  }, []);
}
