import { NextRequest } from "next/server";
import { runEntirePipeline } from "@/lib/pipeline/runner";

export const maxDuration = 300;

export const dynamic = "force-dynamic";

/**
 * GET /api/pipeline/run - SSE stream running Step 1 -> Step 2 -> Step 3 -> Step 4
 */
export async function GET(req: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      // Stream closed
    }
  };

  (async () => {
    try {
      await sendEvent("pipeline_start", {
        message: "Starting full autonomous pipeline (Scrape -> Analyze -> Date -> Rank)...",
      });

      const finalResult = await runEntirePipeline(async (progress) => {
        await sendEvent("step_update", progress);
      });

      await sendEvent("pipeline_complete", {
        message: "Autonomous AgentMatch pipeline completed successfully!",
        data: finalResult,
      });
    } catch (err: any) {
      await sendEvent("pipeline_error", {
        message: err?.message || "Pipeline execution encountered an error.",
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
