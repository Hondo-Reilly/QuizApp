import { useEffect, useRef } from "react";
import { installMobileSync } from "@/lib/mobileSync";

export function useMobileSync(onRemoteFinish: () => void): void {
  const handler = useRef(onRemoteFinish);
  handler.current = onRemoteFinish;

  useEffect(() => installMobileSync(() => handler.current()), []);
}
