import { connection } from "next/server";
import { FareHunt } from "@/components/FareHunt";
import { addDays, today } from "@/lib/dates";

export default async function Page() {
  // Render per request so default dates are always relative to today.
  await connection();

  const now = today();
  const source = process.env.SERPAPI_KEY?.trim() ? "live" : "demo";

  return (
    <FareHunt
      today={now}
      defaultDepart={addDays(now, 21)}
      defaultReturn={addDays(now, 31)}
      source={source}
    />
  );
}
