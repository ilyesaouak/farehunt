import type { DataSource } from "./types";

/** Per-request lookup budget and parallelism for each data source. */
export const LIMITS: Record<DataSource, { maxLookups: number; concurrency: number }> = {
  live: { maxLookups: 60, concurrency: 4 },
  demo: { maxLookups: 400, concurrency: 8 },
};
