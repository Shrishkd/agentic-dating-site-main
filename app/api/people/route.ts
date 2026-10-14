import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateLinkedInUrl, validateInstagramUrl, parseBulkInput } from "@/lib/validation";

/**
 * GET /api/people - List all people ordered by creation time
 */
export async function GET() {
  try {
    const people = await prisma.person.findMany({
      orderBy: { created_at: "desc" },
      include: {
        rawData: true,
        _count: {
          select: {
            rawData: true,
          },
        },
        profile: {
          select: {
            id: true,
            summary: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: people,
      total: people.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch people" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/people - Create single or bulk people
 * Payload can be:
 * Single: { name: string, linkedin_url: string, instagram_url: string }
 * Bulk: { bulk: Array<{ name: string, linkedin_url: string, instagram_url: string }> }
 * Bulk raw: { raw_text: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Bulk raw text mode
    if (body.raw_text && typeof body.raw_text === "string") {
      const parsed = parseBulkInput(body.raw_text);
      const invalidLines = parsed.filter((p) => !p.isValid);
      if (invalidLines.length > 0 && parsed.every((p) => !p.isValid)) {
        return NextResponse.json(
          {
            success: false,
            error: "All provided rows failed validation.",
            details: invalidLines,
          },
          { status: 400 }
        );
      }

      const validEntries = parsed.filter((p) => p.isValid && p.name && p.linkedinUrl && p.instagramUrl);
      const createdPeople = [];

      for (const entry of validEntries) {
        // Upsert or check if URLs exist
        const existing = await prisma.person.findFirst({
          where: {
            OR: [
              { linkedin_url: entry.linkedinUrl! },
              { instagram_url: entry.instagramUrl! },
            ],
          },
        });

        if (!existing) {
          const person = await prisma.person.create({
            data: {
              name: entry.name!,
              linkedin_url: entry.linkedinUrl!,
              instagram_url: entry.instagramUrl!,
              status: "pending",
            },
          });
          createdPeople.push(person);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${validEntries.length} entries. Added ${createdPeople.length} new people.`,
        created: createdPeople,
        invalidLines: invalidLines.length > 0 ? invalidLines : undefined,
      });
    }

    // 2. Single Person mode
    const { name, linkedin_url, instagram_url } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Name is required and must be at least 2 characters." },
        { status: 400 }
      );
    }

    const linkedinVal = validateLinkedInUrl(linkedin_url);
    if (!linkedinVal.valid) {
      return NextResponse.json(
        { success: false, error: linkedinVal.error },
        { status: 400 }
      );
    }

    const instagramVal = validateInstagramUrl(instagram_url);
    if (!instagramVal.valid) {
      return NextResponse.json(
        { success: false, error: instagramVal.error },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await prisma.person.findFirst({
      where: {
        OR: [
          { linkedin_url: linkedinVal.cleanUrl! },
          { instagram_url: instagramVal.cleanUrl! },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A person with this LinkedIn or Instagram profile already exists (${existing.name}).`,
        },
        { status: 409 }
      );
    }

    const newPerson = await prisma.person.create({
      data: {
        name: name.trim(),
        linkedin_url: linkedinVal.cleanUrl!,
        instagram_url: instagramVal.cleanUrl!,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Person "${newPerson.name}" created successfully.`,
      data: newPerson,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create person" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/people - Clear all people (useful for resetting test runs)
 */
export async function DELETE() {
  try {
    await prisma.person.deleteMany();
    return NextResponse.json({
      success: true,
      message: "All people and associated data have been cleared.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to clear people" },
      { status: 500 }
    );
  }
}
