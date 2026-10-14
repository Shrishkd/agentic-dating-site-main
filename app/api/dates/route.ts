import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPairDate } from "@/lib/dating/engine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/dates - List all completed date sessions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    const where: any = { status: "completed" };
    if (personId) {
      where.OR = [{ person_a_id: personId }, { person_b_id: personId }];
    }

    const dates = await prisma.dateSession.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        person_a: {
          select: {
            id: true,
            name: true,
            rawData: true,
          },
        },
        person_b: {
          select: {
            id: true,
            name: true,
            rawData: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: dates,
      total: dates.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch dates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dates - Trigger a date between two candidates directly
 * Body: { personAId: string, personBId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personAId, personBId } = body;

    if (!personAId || !personBId) {
      return NextResponse.json(
        { success: false, error: "Both personAId and personBId are required." },
        { status: 400 }
      );
    }

    const result = await runPairDate(personAId, personBId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Date session failed" },
      { status: 500 }
    );
  }
}
