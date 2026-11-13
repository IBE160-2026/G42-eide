"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StatusResponse } from "../lib/contracts";
import { fetchStatus } from "../lib/status";

/*
 * Owns the app's only `GET /api/status` request and its result (AR-24).
 * One request on mount and one per `retry()`; each is aborted after 10 seconds
 * (treated as a failure) and on unmount (which changes nothing). No cache.
 * Later stories read `status` and `phase` through `useAppStatus()`.
 */

export type StartupPhase = "starting" | "failed" | "retrying" | "ready";

export interface AppStatus {
  phase: StartupPhase;
  status: StatusResponse | null;
  retry: () => void;
}

export const STATUS_TIMEOUT_MS = 10_000;

const AppStatusContext = createContext<AppStatus | null>(null);

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<StartupPhase>("starting");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Mirrors `phase` synchronously so `retry()` is guarded even before a re-render.
  const phaseRef = useRef<StartupPhase>("starting");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);

    fetchStatus(controller.signal).then(
      (result) => {
        clearTimeout(timer);
        if (!active) return;
        phaseRef.current = "ready";
        setStatus(result);
        setPhase("ready");
      },
      () => {
        clearTimeout(timer);
        if (!active) return;
        phaseRef.current = "failed";
        setPhase("failed");
      },
    );

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    if (phaseRef.current !== "failed") return;
    phaseRef.current = "retrying";
    setPhase("retrying");
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<AppStatus>(() => ({ phase, status, retry }), [phase, status, retry]);

  return <AppStatusContext.Provider value={value}>{children}</AppStatusContext.Provider>;
}

export function useAppStatus(): AppStatus {
  const value = useContext(AppStatusContext);
  if (value === null) {
    throw new Error("useAppStatus must be used inside <AppStatusProvider>.");
  }
  return value;
}
