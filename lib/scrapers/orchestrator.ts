import { prisma } from "../db";
import { scrapeLinkedInProfile } from "./linkedin";
import { scrapeInstagramProfile } from "./instagram";
import { LinkedInScrapedData, InstagramScrapedData } from "./types";

export interface ScrapePersonResult {
  personId: string;
  personName: string;
  status: "scraped" | "instagram_private" | "failed" | "cached";
  linkedinData?: LinkedInScrapedData;
  instagramData?: InstagramScrapedData;
  error?: string;
}

/**
 * Scrapes or loads cached profile data for a single candidate.
 */
export async function scrapePerson(
  personId: string,
  options: { force?: boolean } = {}
): Promise<ScrapePersonResult> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { rawData: true },
  });

  if (!person) {
    throw new Error(`Candidate with ID "${personId}" not found.`);
  }

  // 1. Check raw_data cache unless force is requested
  const linkedinRaw = person.rawData.find((r) => r.source === "linkedin");
  const instagramRaw = person.rawData.find((r) => r.source === "instagram");

  if (!options.force && linkedinRaw && instagramRaw) {
    let linkedinData: LinkedInScrapedData | undefined;
    let instagramData: InstagramScrapedData | undefined;

    try {
      linkedinData = JSON.parse(linkedinRaw.json_data);
      instagramData = JSON.parse(instagramRaw.json_data);
    } catch {
      // JSON parse fallback
    }

    if (linkedinData && instagramData) {
      return {
        personId: person.id,
        personName: person.name,
        status: "cached",
        linkedinData,
        instagramData,
      };
    }
  }

  // 2. Mark status as "scraping"
  await prisma.person.update({
    where: { id: personId },
    data: { status: "scraping" },
  });

  try {
    // 3. Run both scrapers in parallel
    const [linkedinRes, instagramRes] = await Promise.all([
      scrapeLinkedInProfile(person.linkedin_url),
      scrapeInstagramProfile(person.instagram_url),
    ]);

    // Handle Private Instagram
    if (instagramRes.isPrivate) {
      await prisma.person.update({
        where: { id: personId },
        data: { status: "instagram_private" },
      });
      return {
        personId: person.id,
        personName: person.name,
        status: "instagram_private",
        error: instagramRes.error || "Instagram account is private.",
      };
    }

    // Check if either failed completely
    if (!linkedinRes.success && !instagramRes.success) {
      const combinedError = `LinkedIn Error: ${linkedinRes.error || "Failed"}; Instagram Error: ${instagramRes.error || "Failed"}`;
      await prisma.person.update({
        where: { id: personId },
        data: { status: "failed" },
      });
      return {
        personId: person.id,
        personName: person.name,
        status: "failed",
        error: combinedError,
      };
    }

    // Save Raw Data to DB
    if (linkedinRes.data) {
      // Delete existing raw data for this source first if forcing
      await prisma.rawData.deleteMany({
        where: { person_id: personId, source: "linkedin" },
      });
      await prisma.rawData.create({
        data: {
          person_id: personId,
          source: "linkedin",
          json_data: JSON.stringify(linkedinRes.data),
        },
      });
    }

    if (instagramRes.data) {
      await prisma.rawData.deleteMany({
        where: { person_id: personId, source: "instagram" },
      });
      await prisma.rawData.create({
        data: {
          person_id: personId,
          source: "instagram",
          json_data: JSON.stringify(instagramRes.data),
        },
      });
    }

    // Update status to scraped
    await prisma.person.update({
      where: { id: personId },
      data: { status: "scraped" },
    });

    return {
      personId: person.id,
      personName: person.name,
      status: "scraped",
      linkedinData: linkedinRes.data as LinkedInScrapedData,
      instagramData: instagramRes.data as InstagramScrapedData,
    };
  } catch (err: any) {
    await prisma.person.update({
      where: { id: personId },
      data: { status: "failed" },
    });
    return {
      personId: person.id,
      personName: person.name,
      status: "failed",
      error: err?.message || "Scraping pipeline failed unexpectedly.",
    };
  }
}

/**
 * Batch scraper with a concurrency limit (default 3 concurrent requests).
 */
export async function scrapeAllPeople(
  concurrency = 3,
  options: { force?: boolean } = {}
): Promise<ScrapePersonResult[]> {
  const people = await prisma.person.findMany({
    where: options.force
      ? {}
      : {
          status: {
            in: ["pending", "failed"],
          },
        },
  });

  const results: ScrapePersonResult[] = [];
  const queue = [...people];

  async function worker() {
    while (queue.length > 0) {
      const person = queue.shift();
      if (!person) break;
      const res = await scrapePerson(person.id, options);
      results.push(res);
    }
  }

  // Spawn concurrency workers
  const workers = Array.from(
    { length: Math.min(concurrency, people.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
