export function getGoogleFlightsLink(
  origin: string,
  destination: string,
  date: string
) {
  return `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${date}`;
}