import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/dates/[id] - Fetch full date session details with transcripts and scorecards
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const session = await prisma.dateSession.findUnique({
      where: { id },
      include: {
        person_a: {
          include: {
            profile: true,
            rawData: true,
          },
        },
        person_b: {
          include: {
            profile: true,
            rawData: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Date session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch date details" },
      { status: 500 }
    );
  }
}
