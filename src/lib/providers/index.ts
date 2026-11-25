import "server-only";
import { demoProvider } from "./demo";
import { createSerpApiProvider } from "./serpapi";
import type { FlightProvider } from "./types";

/** Live data when SERPAPI_KEY is set (unless demo is explicitly requested), demo otherwise. */
export function getProvider(forceDemo = false): FlightProvider {
  const key = process.env.SERPAPI_KEY?.trim();
  if (key && !forceDemo) return createSerpApiProvider(key);
  return demoProvider;
}
