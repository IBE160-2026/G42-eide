"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GenerationResponse } from "../lib/contracts";
import { DEMO_TIMEOUT_MS, classifyDemoReply, requestDemo } from "../lib/demo";
import { demoErrorView } from "../lib/demo-errors";
import type { DemoErrorView } from "../lib/demo-errors";
import { announce } from "./StatusRegion";

/*
 * The demo flow state (Story 1.15, D5–D10): S1 `idle` → S3 `loading` → S4 `success` or
 * S5 `error`; from S5 only a Temporary-group error allows a new request.
 *
 * Request lifecycle (D7):
 * - `start()` is the only place a request begins, and it is called only from the
 *   `Vis eksempel` click handler. A synchronous ref guard (`busy`) is set before `fetch`
 *   is called, so repeated activation in one tick or before a re-render never sends a
 *   second request.
 * - The handler creates the `AbortController` and the 120-second timer. The timer stays
 *   armed until the reply has been read and classified, and is cleared on every outcome.
 * - Each request has an id. An outcome is applied only if the provider is still mounted
 *   and the id is still current; otherwise it is cancelled and dropped without being
 *   classified (no state update, no announcement, no focus move).
 * - `mounted` is set in the effect setup and cleared in its cleanup, so React Strict
 *   Mode's mount → cleanup → mount leaves it `true`. The cleanup also aborts any request
 *   in flight, clears its timer and makes its id stale (so a cleanup followed by a new
 *   setup, as in Strict Mode or Fast Refresh, can never apply the aborted request's
 *   outcome as a network failure).
 * - `announce`, `setState` and the abort happen only in the handler, the outcome path or
 *   the effect cleanup — never during render or inside a state updater.
 *
 * Focus is the UI's job: it moves focus to the error headline in an effect keyed by
 * `errorId` (the id of the request that produced the error), so a repeated identical
 * error moves focus again (D9).
 *
 * KNOWN LIMITATION (Story 1.15, Checkpoint 93/94; recovery deferred, frozen D7 kept):
 * a cleanup during an in-flight request correctly aborts it and makes its id stale, but a
 * following effect setup keeps the retained state `loading` with no request in flight, so
 * `Vis eksempel` stays aria-disabled until a reload. It is reproducible with React
 * `<Activity>` hidden → visible (and Fast Refresh in development). `next.config.ts` enables
 * `cacheComponents`, which hides routes navigated away from with `<Activity>`; the app has
 * one route today, so it is not reachable in production yet. Recovery must be specified
 * and implemented before a second route with client-side navigation is added.
 */

export type DemoPhase = "idle" | "loading" | "success" | "error";

export type DemoState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; response: GenerationResponse }
  | { phase: "error"; error: DemoErrorView; errorId: number };

export interface DemoFlow {
  state: DemoState;
  /** Whether `Vis eksempel` is available (no `aria-disabled`): S1, or S5 after a Temporary error. */
  canStart: boolean;
  /** Starts one demo request if allowed; otherwise does nothing. Call it only from the click handler. */
  start: () => void;
}

const LOADING_TEXT = "Henter eksempel …";
const SUCCESS_TEXT = "Resultatene er klare";

function allowsStart(state: DemoState): boolean {
  return state.phase === "idle" || (state.phase === "error" && state.error.group === "temporary");
}

const DemoContext = createContext<DemoFlow | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({ phase: "idle" });
  // Mirrors `state` synchronously, so `start()` decides on the latest state, not a stale render.
  const stateRef = useRef<DemoState>(state);
  const busy = useRef(false);
  const mounted = useRef(false);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((next: DemoState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      controller.current?.abort();
      controller.current = null;
      clearTimer();
      busy.current = false;
    };
  }, [clearTimer]);

  const start = useCallback(() => {
    if (busy.current || !mounted.current || !allowsStart(stateRef.current)) return;
    busy.current = true;
    requestId.current += 1;
    const id = requestId.current;
    const abort = new AbortController();
    controller.current = abort;
    timer.current = setTimeout(() => abort.abort(), DEMO_TIMEOUT_MS);
    update({ phase: "loading" });
    announce(LOADING_TEXT);

    void requestDemo(abort.signal).then((transport) => {
      // Cancelled (unmounted, or superseded by a cleanup): drop it without classifying.
      // The cleanup has already aborted the request, cleared the timer and the guard.
      if (!mounted.current || id !== requestId.current) return;
      const outcome = classifyDemoReply(transport);
      clearTimer();
      controller.current = null;
      busy.current = false;
      if (outcome.kind === "success") {
        update({ phase: "success", response: outcome.response });
        announce(SUCCESS_TEXT);
      } else {
        update({ phase: "error", error: demoErrorView(outcome), errorId: id });
        // Clears the region (and a pending loading text); the error itself is never announced.
        announce("");
      }
    });
  }, [clearTimer, update]);

  const value = useMemo<DemoFlow>(
    () => ({ state, canStart: allowsStart(state), start }),
    [state, start],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoFlow(): DemoFlow {
  const value = useContext(DemoContext);
  if (value === null) {
    throw new Error("useDemoFlow must be used inside <DemoProvider>.");
  }
  return value;
}
