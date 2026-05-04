export function formatDuration(duration?: string) {
  if (!duration) return "Unknown duration";

  if (!duration.startsWith("PT")) return duration;

  const hours = duration.match(/(\d+)H/)?.[1];
  const minutes = duration.match(/(\d+)M/)?.[1];

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;

  return duration;
}