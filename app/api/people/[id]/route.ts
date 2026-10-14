import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/people/[id] - Fetch single person with their profile and raw scraped data
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        rawData: true,
        profile: true,
        rankings: {
          include: {
            ranked_person: true,
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: "Person not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: person,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch person" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/people/[id] - Delete single person
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const existing = await prisma.person.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Person not found" },
        { status: 404 }
      );
    }

    await prisma.person.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Person "${existing.name}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete person" },
      { status: 500 }
    );
  }
}
