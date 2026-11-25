import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers";
import { runSearch } from "@/lib/search";
import type { SearchEvent } from "@/lib/types";
import { lookupCount, parseSearchParams } from "@/lib/validation";

export const maxDuration = 60;

/**
 * GET /api/search?origins=FRA,STR&destinations=TUN&tripType=oneway&depart=2026-05-10&flex=3
 *
 * Streams newline-delimited JSON (`application/x-ndjson`) SearchEvents:
 * start → progress* / route* → done. Add `demo=1` to force demo data.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = parseSearchParams(params);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const provider = getProvider(params.get("demo") === "1");
  const lookups = lookupCount(parsed.value);
  if (lookups > provider.maxLookups) {
    return Response.json(
      {
        error: `This search needs ${lookups} lookups; the limit is ${provider.maxLookups}. Select fewer airports or flexible days.`,
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: SearchEvent) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      try {
        await runSearch(parsed.value, provider, emit, signal);
      } catch (err) {
        if (!signal.aborted) {
          console.error("[search] failed", err);
          emit({ type: "error", message: "The search failed unexpectedly. Please try again." });
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* stream already closed by client disconnect */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
