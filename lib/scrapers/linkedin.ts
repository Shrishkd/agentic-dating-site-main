import { runApifyActor } from "./apify-client";
import { LinkedInScrapedData, ScrapeResult } from "./types";

/**
 * Scrapes a public LinkedIn profile using Apify's cookie-less actor.
 * Actor: curious_coder/linkedin-profile-scraper (or fallback dev_coder/linkedin-scraper)
 */
export async function scrapeLinkedInProfile(
  profileUrl: string
): Promise<ScrapeResult> {
  try {
    const cleanUrl = profileUrl.trim().replace(/\/+$/, "");

    // Input structure for cookie-less LinkedIn profile scrapers
    const input = {
      urls: [cleanUrl],
      includeSkills: true,
      includeCertifications: true,
      includeExperience: true,
      includeEducation: true,
      includePosts: true,
    };

    const items = await runApifyActor<any>({
      actorId: "curious_coder/linkedin-profile-scraper",
      input,
      timeoutSecs: 180,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        source: "linkedin",
        error: "No data returned by LinkedIn scraper for this profile.",
      };
    }

    const raw = items[0];

    // Normalize experiences / past roles
    const pastRoles: Array<{
      title: string;
      company: string;
      duration?: string;
      description?: string;
    }> = [];

    const rawExp = raw.experiences || raw.experience || raw.positions || [];
    if (Array.isArray(rawExp)) {
      rawExp.forEach((exp: any) => {
        pastRoles.push({
          title: exp.title || exp.position || exp.role || "Role",
          company: exp.companyName || exp.company || exp.organization || "Company",
          duration: exp.timePeriod || exp.duration || exp.dateRange || undefined,
          description: exp.description || exp.summary || undefined,
        });
      });
    }

    // Normalize education
    const education: Array<{
      school: string;
      degree?: string;
      fieldOfStudy?: string;
      years?: string;
    }> = [];

    const rawEdu = raw.education || raw.schools || [];
    if (Array.isArray(rawEdu)) {
      rawEdu.forEach((edu: any) => {
        education.push({
          school: edu.schoolName || edu.school || edu.institution || "Institution",
          degree: edu.degreeName || edu.degree || undefined,
          fieldOfStudy: edu.fieldOfStudy || edu.major || undefined,
          years: edu.timePeriod || edu.dateRange || edu.years || undefined,
        });
      });
    }

    // Normalize skills
    let skills: string[] = [];
    if (Array.isArray(raw.skills)) {
      skills = raw.skills.map((s: any) => (typeof s === "string" ? s : s.name || s.title || "")).filter(Boolean);
    }

    // Normalize certifications
    let certifications: string[] = [];
    if (Array.isArray(raw.certifications || raw.licenses)) {
      certifications = (raw.certifications || raw.licenses)
        .map((c: any) => (typeof c === "string" ? c : c.name || c.title || ""))
        .filter(Boolean);
    }

    // Normalize posts
    let recentPosts: string[] = [];
    if (Array.isArray(raw.posts || raw.recentPosts || raw.activities)) {
      recentPosts = (raw.posts || raw.recentPosts || raw.activities)
        .map((p: any) => (typeof p === "string" ? p : p.text || p.content || p.summary || ""))
        .filter((t: string) => t.length > 5)
        .slice(0, 10);
    }

    const currentRole =
      pastRoles.length > 0
        ? `${pastRoles[0].title} at ${pastRoles[0].company}`
        : raw.headline || raw.currentJobTitle || undefined;

    const data: LinkedInScrapedData = {
      name:
        raw.fullName ||
        raw.name ||
        `${raw.firstName || ""} ${raw.lastName || ""}`.trim() ||
        "Unknown",
      headline: raw.headline || raw.subTitle || raw.occupation || undefined,
      about: raw.about || raw.summary || raw.description || undefined,
      currentRole,
      pastRoles,
      education,
      skills,
      location:
        raw.location ||
        raw.geoLocation ||
        raw.city ||
        (typeof raw.address === "string" ? raw.address : undefined),
      certifications,
      profilePhotoUrl:
        raw.profilePicUrl ||
        raw.profilePicture ||
        raw.pictureUrl ||
        raw.avatar ||
        raw.photoUrl ||
        undefined,
      recentPosts,
      raw,
    };

    return {
      success: true,
      source: "linkedin",
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      source: "linkedin",
      error: err.message || "Failed to scrape LinkedIn profile.",
    };
  }
}
