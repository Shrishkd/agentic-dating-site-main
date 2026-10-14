import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { runPairDate, buildScheduleFromDb, buildScheduleForPerson } from "@/lib/dating/engine";
import { computeAllRankings } from "@/lib/ranking/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/dates/stream - Server-Sent Events (SSE) streaming live date sessions
 * Query params:
 *   - `ids`: comma-separated candidate IDs for test group
 *   - `all`: "true" to date all analyzed candidates
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const allParam = searchParams.get("all");

  const candidateIds = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  // Each agent pre-screens the pool and books dates with its best candidates.
  const personParam = searchParams.get("person");
  const schedule = personParam
    ? await buildScheduleForPerson(personParam, parseInt(searchParams.get("count") || "3", 10))
    : await buildScheduleFromDb(candidateIds);
  const pairs: Array<[string, string]> = schedule.map((d) => [d.personAId, d.personBId]);

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send SSE message
  const sendEvent = async (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch (err) {
      // Stream closed by client
    }
  };

  // Run dating worker in the background
  (async () => {
    try {
      await sendEvent("init", {
        totalPairs: pairs.length,
        candidateCount: new Set(pairs.flat()).size,
      });

      let completedCount = 0;

      for (let i = 0; i < pairs.length; i++) {
        const [personAId, personBId] = pairs[i];

        // Fetch candidate names for the event
        const [pA, pB] = await Promise.all([
          prisma.person.findUnique({ where: { id: personAId }, select: { id: true, name: true } }),
          prisma.person.findUnique({ where: { id: personBId }, select: { id: true, name: true } }),
        ]);

        await sendEvent("date_start", {
          pairIndex: i + 1,
          totalPairs: pairs.length,
          personA: pA,
          personB: pB,
          prescreen: schedule[i].mutualPrescreen,
          shared: schedule[i].shared,
        });

        // Run the 6-turn date
        const dateResult = await runPairDate(personAId, personBId, async (event) => {
          if (event.type === "venue") {
            await sendEvent("venue_selected", {
              pairIndex: i + 1,
              personA: pA,
              personB: pB,
              venue: event.data.venue,
            });
          } else if (event.type === "turn") {
            await sendEvent("turn_generated", {
              pairIndex: i + 1,
              turn: event.data.turn,
            });
          } else if (event.type === "score") {
            await sendEvent("date_scored", {
              pairIndex: i + 1,
              scoreAToB: event.data.scoreAToB,
              scoreBToA: event.data.scoreBToA,
            });
          }
        });

        completedCount++;

        await sendEvent("date_complete", {
          pairIndex: i + 1,
          totalPairs: pairs.length,
          dateSession: dateResult,
          progress: Math.round((completedCount / pairs.length) * 100),
        });
      }

      try {
        await computeAllRankings();
      } catch (rankErr) {
        console.error("[Dates Stream] Ranking refresh failed:", rankErr);
      }

      await sendEvent("all_complete", {
        totalCompleted: completedCount,
        message: "All speed date pairings have completed!",
      });
    } catch (error: any) {
      await sendEvent("error", {
        message: error?.message || "Dating engine stream encountered an error.",
      });
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
