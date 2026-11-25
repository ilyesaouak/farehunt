"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { DataSource, RouteResult, SearchEvent, SearchRequest } from "@/lib/types";
import { toSearchParams } from "@/lib/validation";

export type SearchStatus = "idle" | "loading" | "done" | "error" | "cancelled";

export interface SearchState {
  status: SearchStatus;
  request: SearchRequest | null;
  source: DataSource | null;
  total: number;
  done: number;
  routes: RouteResult[];
  expectedRoutes: number;
  failed: number;
  elapsedMs: number | null;
  error: string | null;
}

type Action =
  | { type: "begin"; request: SearchRequest }
  | { type: "event"; event: SearchEvent }
  | { type: "fail"; message: string }
  | { type: "cancel" };

const initial: SearchState = {
  status: "idle",
  request: null,
  source: null,
  total: 0,
  done: 0,
  routes: [],
  expectedRoutes: 0,
  failed: 0,
  elapsedMs: null,
  error: null,
};

function reducer(state: SearchState, action: Action): SearchState {
  switch (action.type) {
    case "begin":
      return { ...initial, status: "loading", request: action.request };
    case "cancel":
      return state.status === "loading" ? { ...state, status: "cancelled" } : state;
    case "fail":
      return { ...state, status: "error", error: action.message };
    case "event": {
      const e = action.event;
      switch (e.type) {
        case "start":
          return { ...state, source: e.source, total: e.total, expectedRoutes: e.routes };
        case "progress":
          return { ...state, done: e.done, total: e.total };
        case "route":
          return { ...state, routes: [...state.routes.filter((r) => r.id !== e.result.id), e.result] };
        case "done":
          return { ...state, status: "done", failed: e.failed, elapsedMs: e.elapsedMs, done: state.total };
        case "error":
          return { ...state, status: "error", error: e.message };
      }
    }
  }
}

export function useFlightSearch(options: { forceDemo?: boolean } = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const controller = useRef<AbortController | null>(null);
  const { forceDemo } = options;

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "cancel" });
  }, []);

  const search = useCallback(
    async (request: SearchRequest) => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      dispatch({ type: "begin", request });

      const params = toSearchParams(request);
      if (forceDemo) params.set("demo", "1");

      try {
        const res = await fetch(`/api/search?${params}`, { signal: ac.signal });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          dispatch({ type: "fail", message: body?.error ?? `Search failed (HTTP ${res.status}).` });
          return;
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        let finished = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const event = JSON.parse(line) as SearchEvent;
            if (event.type === "done" || event.type === "error") finished = true;
            dispatch({ type: "event", event });
          }
        }
        if (!finished && !ac.signal.aborted) {
          dispatch({ type: "fail", message: "The connection closed before the search finished." });
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        dispatch({ type: "fail", message: err instanceof Error ? err.message : "Network error." });
      } finally {
        if (controller.current === ac) controller.current = null;
      }
    },
    [forceDemo],
  );

  useEffect(() => () => controller.current?.abort(), []);

  return { state, search, cancel };
}
