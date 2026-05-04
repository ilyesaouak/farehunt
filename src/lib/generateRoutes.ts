import { originAirports, tunisiaAirports } from "./airports";

const mockFlightPrices: Record<string, number> = {
  "STR-TUN": 79,
  "DUS-TUN": 69,
  "ORY-TUN": 55,
  "MRS-TUN": 49,
  "MXP-TUN": 42,

  "STR-MIR": 88,
  "FRA-MIR": 95,
  "MRS-MIR": 58,

  "DUS-DJE": 99,
  "FRA-DJE": 105,
  "BSL-DJE": 89,
};

function getFlightPrice(from: string, to: string) {
  return mockFlightPrices[`${from}-${to}`] ?? 999;
}

function matchesOrigin(
  airport: { code: string; city: string; country?: string },
  query: string
) {
  const q = query.trim().toLowerCase();

  if (!q || q === "anywhere" || q === "all") return true;

  return (
    airport.code.toLowerCase().includes(q) ||
    airport.city.toLowerCase().includes(q) ||
    airport.country?.toLowerCase().includes(q)
  );
}

function matchesDestination(
  airport: { code: string; city: string },
  query: string
) {
  const q = query.trim().toLowerCase();

  if (!q || q === "tunisia" || q === "all" || q === "anywhere") return true;

  return (
    airport.code.toLowerCase().includes(q) ||
    airport.city.toLowerCase().includes(q)
  );
}

export function generateRoutes(
  originQuery = "Anywhere",
  destinationQuery = "Tunisia"
) {
  const origins = originAirports.filter((airport) =>
    matchesOrigin(airport, originQuery)
  );

  const destinations = tunisiaAirports.filter((airport) =>
    matchesDestination(airport, destinationQuery)
  );

  const routes = [];

  for (const origin of origins) {
    for (const destination of destinations) {
      routes.push({
        from: origin.code,
        to: destination.code,
        route: `${origin.city} → ${destination.city}`,
        flightPrice: getFlightPrice(origin.code, destination.code),
        transportPrice: origin.transportFromHeidelberg,
        duration: `${origin.groundTime} ground travel + flight`,
        baggage: "Backpack only",
        risk: origin.risk,
      });
    }
  }

  return routes;
}