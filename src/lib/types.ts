export type TripType = "oneway" | "return";
export type RiskLevel = "low" | "medium" | "high";
export type DataSource = "live" | "demo";
export type GroundMode = "train" | "train+bus" | "bus";
export type PriceLevel = "low" | "typical" | "high";

/** How to get from the home city to a departure airport. All figures are one-way estimates. */
export interface GroundOption {
  mode: GroundMode;
  /** Door-to-terminal travel time in minutes. */
  minutes: number;
  /** Typical advance-purchase fare in EUR, one way, one adult. */
  costEur: number;
  /** Number of changes between vehicles. */
  transfers: number;
  /** Station name understood by Deutsche Bahn's journey planner. */
  station: string;
  crossBorder: boolean;
}

export interface OriginAirport {
  code: string;
  city: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  ground: GroundOption;
}

export interface DestinationAirport {
  code: string;
  city: string;
  name: string;
  lat: number;
  lon: number;
}

export interface FlightLeg {
  from: string;
  to: string;
  departTime: string; // "YYYY-MM-DD HH:mm" local airport time
  arriveTime: string;
  airline: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface FlightOffer {
  id: string;
  /** Total price in EUR for one adult (round-trip total for return searches). */
  price: number;
  airline: string;
  airlineLogo?: string;
  stops: number;
  durationMinutes: number;
  departTime: string;
  arriveTime: string;
  legs: FlightLeg[];
}

export interface PriceInsight {
  level?: PriceLevel;
  typicalRange?: [number, number];
}

/** Result of one provider lookup: one route on one date. */
export interface DateQuote {
  date: string;
  returnDate?: string;
  offers: FlightOffer[];
  insight?: PriceInsight;
  /** Exact Google Flights page for this lookup (live data only). */
  googleFlightsUrl?: string;
  error?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export interface CostBreakdown {
  flight: number;
  /** Ground transport for every leg (×2 for return trips). */
  ground: number;
  groundLegs: number;
  total: number;
}

export interface RouteLinks {
  googleFlights: string;
  skyscanner: string;
  bahn: string;
  rome2rio: string;
}

export interface RouteResult {
  id: string; // e.g. "STR-TUN"
  origin: string;
  destination: string;
  tripType: TripType;
  quotes: DateQuote[];
  /** Cheapest offer across all scanned dates, or null when nothing was found. */
  best: {
    date: string;
    returnDate?: string;
    offer: FlightOffer;
    insight?: PriceInsight;
  } | null;
  costs: CostBreakdown | null;
  /** Home → arrival at destination, outbound only. */
  doorToDoorMinutes: number | null;
  risk: RiskAssessment | null;
  links: RouteLinks;
}

export interface SearchRequest {
  origins: string[];
  destinations: string[];
  tripType: TripType;
  departDate: string;
  returnDate?: string;
  /** Number of consecutive departure days to scan, starting at departDate. */
  flexDays: number;
}

/** Newline-delimited JSON events streamed by /api/search. */
export type SearchEvent =
  | { type: "start"; source: DataSource; total: number; routes: number }
  | { type: "progress"; done: number; total: number }
  | { type: "route"; result: RouteResult }
  | { type: "done"; elapsedMs: number; failed: number }
  | { type: "error"; message: string };
