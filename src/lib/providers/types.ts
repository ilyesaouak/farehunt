import type { DataSource, DateQuote } from "../types";

export interface LookupQuery {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
}

export interface FlightProvider {
  source: DataSource;
  /** Upper bound of lookups per search request (protects the API quota). */
  maxLookups: number;
  /** How many lookups may run in parallel. */
  concurrency: number;
  lookup(query: LookupQuery, signal: AbortSignal): Promise<DateQuote>;
}
