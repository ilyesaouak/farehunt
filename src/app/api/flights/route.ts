import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const date = searchParams.get("date");
  const tripType = searchParams.get("tripType") ?? "oneway";
const returnDate = searchParams.get("returnDate");

  if (!origin || !destination || !date) {
    return NextResponse.json(
      { error: "Missing origin, destination, or date" },
      { status: 400 }
    );
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json(
      { error: "Missing SERPAPI_KEY in .env.local" },
      { status: 500 }
    );
  }

  try {
    const params = new URLSearchParams({
  engine: "google_flights",
  api_key: process.env.SERPAPI_KEY,
  departure_id: origin,
  arrival_id: destination,
  outbound_date: date,
  type: tripType === "return" ? "1" : "2",
  currency: "EUR",
  hl: "en",
  gl: "de",
  sort_by: "2",
  deep_search: "true",
  show_hidden: "true",
});

if (tripType === "return" && returnDate) {
  params.set("return_date", returnDate);
}

    const res = await fetch(`https://serpapi.com/search?${params.toString()}`);

    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 500 }
      );
    }

    const allResults = [
      ...(data.best_flights ?? []),
      ...(data.other_flights ?? []),
    ];

    const flights = allResults
      .map((flight: any, index: number) => {
        const firstLeg = flight.flights?.[0];
        const lastLeg = flight.flights?.[flight.flights.length - 1];

        return {
          id: flight.booking_token ?? `${origin}-${destination}-${date}-${index}`,
          price: Number(flight.price),
          currency: "EUR",
          airline: firstLeg?.airline ?? "Unknown airline",
          duration: flight.total_duration
            ? `${Math.floor(flight.total_duration / 60)}h ${
                flight.total_duration % 60
              }m`
            : "Unknown duration",
          departureAirport: firstLeg?.departure_airport?.id,
          arrivalAirport: lastLeg?.arrival_airport?.id,
          bookingToken: flight.booking_token ?? null,
          flights: flight.flights ?? [],
          googleFlightsUrl: data.search_metadata?.google_flights_url ?? null,
        };
      })
      .filter((flight: any) => Number.isFinite(flight.price))
      .sort((a: any, b: any) => a.price - b.price);

    return NextResponse.json({
      success: true,
      count: flights.length,
      cheapest: flights[0] ?? null,
      flights,
      googleFlightsUrl: data.search_metadata?.google_flights_url ?? null,
    });
  } catch (err: any) {
    console.error("SerpAPI Google Flights error:", err);

    return NextResponse.json(
      { success: false, error: err.message || "SerpAPI error" },
      { status: 500 }
    );
  }
}