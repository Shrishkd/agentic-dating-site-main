import { runApifyActor } from "./apify-client";
import { LinkedInScrapedData, ScrapeResult } from "./types";

/**
 * Cookie-less LinkedIn actors, tried in order. Each actor takes a different input shape.
 * Override the first choice with LINKEDIN_ACTOR (e.g. "dev_fusion/Linkedin-Profile-Scraper").
 */
const LINKEDIN_ACTORS: Array<{ id: string; input: (url: string) => Record<string, any> }> = [
  {
    id: "harvestapi/linkedin-profile-scraper",
    input: (url) => ({ profileScraperMode: "Profile details no email ($4 per 1k)", queries: [url] }),
  },
  { id: "dev_fusion/Linkedin-Profile-Scraper", input: (url) => ({ profileUrls: [url] }) },
];

function getActors() {
  const override = process.env.LINKEDIN_ACTOR?.trim();
  if (!override) return LINKEDIN_ACTORS;
  const known = LINKEDIN_ACTORS.find((a) => a.id.toLowerCase() === override.toLowerCase());
  const first = known || { id: override, input: (url: string) => ({ profileUrls: [url], urls: [url] }) };
  return [first, ...LINKEDIN_ACTORS.filter((a) => a !== known)];
}

function text(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join(" ").trim() || undefined;
  if (typeof v === "object") return text(v.text ?? v.name ?? v.title ?? v.description);
  return String(v);
}

/** Flattens nested "subComponents"/"description" blocks some actors return. */
function flattenDescription(exp: any): string | undefined {
  if (typeof exp.description === "string") return exp.description;
  const parts: string[] = [];
  for (const sc of exp.subComponents || []) {
    for (const d of sc.description || []) {
      const t = text(d);
      if (t) parts.push(t);
    }
  }
  return parts.join(" ") || undefined;
}

function normalize(raw: any): LinkedInScrapedData {
  const pastRoles: NonNullable<LinkedInScrapedData["pastRoles"]> = [];
  const rawExp = raw.experiences || raw.experience || raw.positions || [];
  if (Array.isArray(rawExp)) {
    rawExp.forEach((exp: any) => {
      pastRoles.push({
        title: exp.position || exp.title || exp.role || "Role",
        company:
          exp.companyName ||
          exp.company?.name ||
          (typeof exp.company === "string" ? exp.company : undefined) ||
          (typeof exp.subtitle === "string" ? exp.subtitle.split("·")[0].trim() : undefined) ||
          exp.organization ||
          "Company",
        duration: exp.timePeriod || exp.duration || exp.dateRange || exp.caption || undefined,
        description: flattenDescription(exp),
      });
    });
  }

  const education: NonNullable<LinkedInScrapedData["education"]> = [];
  const rawEdu = raw.educations || raw.education || raw.schools || [];
  if (Array.isArray(rawEdu)) {
    rawEdu.forEach((edu: any) => {
      education.push({
        school: edu.schoolName || edu.school || edu.institution || edu.title || "Institution",
        degree: edu.degreeName || edu.degree || edu.subtitle || undefined,
        fieldOfStudy: edu.fieldOfStudy || edu.major || undefined,
        years: edu.timePeriod || edu.dateRange || edu.years || edu.caption || undefined,
      });
    });
  }

  const skills: string[] = Array.isArray(raw.skills)
    ? raw.skills.map((s: any) => (typeof s === "string" ? s : s.name || s.title || "")).filter(Boolean)
    : [];

  const certSrc = raw.certifications || raw.licenses || raw.licenseAndCertificates || [];
  const certifications: string[] = Array.isArray(certSrc)
    ? certSrc.map((c: any) => (typeof c === "string" ? c : c.name || c.title || "")).filter(Boolean)
    : [];

  const postSrc = raw.posts || raw.recentPosts || raw.activities || raw.updates || [];
  const recentPosts: string[] = Array.isArray(postSrc)
    ? postSrc
        .map((p: any) => (typeof p === "string" ? p : p.text || p.postText || p.content || p.summary || ""))
        .filter((t: string) => t && t.length > 5)
        .slice(0, 10)
    : [];

  // Extra "personal" sections are the richest dating signal on LinkedIn.
  const extraSections: string[] = [];
  const label = (x: any): string => {
    if (typeof x === "string") return x;
    if (x.role || x.organizationName) {
      return [x.role, x.organizationName].filter(Boolean).join(" @ ") + (x.description ? ` (${String(x.description).slice(0, 160)})` : "");
    }
    if (x.interestName && Array.isArray(x.elements)) {
      return `${x.interestName}: ${x.elements.slice(0, 5).map((e: any) => e.title).filter(Boolean).join(", ")}`;
    }
    if (x.name && x.proficiency) return `${x.name} (${x.proficiency})`;
    return text(x.title ?? x.name ?? x) || "";
  };
  for (const key of ["volunteering", "volunteerAndAwards", "causes", "interests", "honorsAndAwards", "languages", "projects", "publications", "organizations", "courses"]) {
    const v = raw[key];
    if (Array.isArray(v) && v.length) {
      const items = v.map(label).filter(Boolean).slice(0, 8);
      if (items.length) extraSections.push(`${key}: ${items.join("; ")}`);
    }
  }
  const activities = (Array.isArray(rawEdu) ? rawEdu : []).map((e: any) => e.insights).filter(Boolean);
  if (activities.length) extraSections.push(`education activities: ${activities.join("; ")}`);
  if (Array.isArray(raw.receivedRecommendations) && raw.receivedRecommendations.length) {
    const recs = raw.receivedRecommendations
      .slice(0, 3)
      .map((r: any) => text(r.description ?? r.text ?? r) || "")
      .filter(Boolean)
      .map((t: string) => t.slice(0, 300));
    if (recs.length) extraSections.push(`recommendations from others: ${recs.join(" || ")}`);
  }

  const currentRole =
    raw.currentPosition?.[0]?.position
      ? `${raw.currentPosition[0].position} at ${raw.currentPosition[0].companyName || "?"}`
      : raw.jobTitle && raw.companyName
      ? `${raw.jobTitle} at ${raw.companyName}`
      : pastRoles.length > 0
      ? `${pastRoles[0].title} at ${pastRoles[0].company}`
      : raw.headline || raw.currentJobTitle || undefined;

  return {
    name: raw.fullName || raw.name || `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Unknown",
    headline: raw.headline || raw.subTitle || raw.occupation || undefined,
    about: raw.about || raw.summary || raw.description || undefined,
    currentRole,
    pastRoles: pastRoles.slice(0, 8),
    education,
    skills: skills.slice(0, 25),
    location:
      raw.addressWithCountry ||
      (typeof raw.location === "string" ? raw.location : raw.location?.linkedinText) ||
      raw.geoLocation ||
      raw.city ||
      (typeof raw.address === "string" ? raw.address : undefined),
    certifications,
    profilePhotoUrl:
      (typeof raw.photo === "string" ? raw.photo : undefined) ||
      raw.profilePicture?.url ||
      raw.profilePicHighQuality ||
      raw.profilePic ||
      raw.profilePicUrl ||
      (typeof raw.profilePicture === "string" ? raw.profilePicture : undefined) ||
      raw.pictureUrl ||
      raw.avatar ||
      raw.photoUrl ||
      undefined,
    recentPosts,
    extraSections,
  };
}

/**
 * Scrapes a public LinkedIn profile through a cookie-less Apify actor (no LinkedIn login, no cookies).
 */
export async function scrapeLinkedInProfile(profileUrl: string): Promise<ScrapeResult> {
  const cleanUrl = profileUrl.trim().split("?")[0].replace(/\/+$/, "");
  const errors: string[] = [];

  for (const actor of getActors()) {
    try {
      const items = await runApifyActor<any>({
        actorId: actor.id,
        input: actor.input(cleanUrl),
        timeoutSecs: 150,
        maxRetries: 1,
      });
      const raw = items?.find((i) => i && !i.error && (i.fullName || i.firstName || i.headline || i.name));
      if (!raw) {
        errors.push(`${actor.id}: empty result`);
        continue;
      }
      return { success: true, source: "linkedin", data: normalize(raw) };
    } catch (err: any) {
      errors.push(`${actor.id}: ${err?.message || "failed"}`);
    }
  }

  return { success: false, source: "linkedin", error: `LinkedIn scrape failed. ${errors.join(" | ")}` };
}
