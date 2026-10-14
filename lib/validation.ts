/**
 * Utility functions for strict URL validation and sanitization for LinkedIn and Instagram.
 */

export interface ValidationResult {
  valid: boolean;
  cleanUrl?: string;
  error?: string;
}

/**
 * Strips tracking parameters and normalizes URL.
 */
export function sanitizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    // Remove query params like utm_*, igsh, ref, etc.
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return url;
  }
}

/**
 * Strictly validates a LinkedIn personal profile URL.
 * Accepts:
 *   - https://www.linkedin.com/in/username
 *   - https://linkedin.com/in/username/
 * Rejects:
 *   - company pages, feed, pulse, showcase, jobs, invalid schemes
 */
export function validateLinkedInUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, error: "LinkedIn URL is required." };
  }

  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname !== "linkedin.com" &&
    hostname !== "www.linkedin.com" &&
    !hostname.endsWith(".linkedin.com")
  ) {
    return {
      valid: false,
      error: "Must be a LinkedIn domain (e.g. https://www.linkedin.com/in/username).",
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  // Must match /in/{identifier}
  const match = path.match(/^\/in\/([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF%-]+)$/);
  if (!match || !match[1]) {
    if (path.startsWith("/company/")) {
      return {
        valid: false,
        error: "Company pages are not allowed. Please provide a personal profile (e.g. /in/username).",
      };
    }
    if (path.startsWith("/school/")) {
      return {
        valid: false,
        error: "School pages are not allowed. Please provide a personal profile (e.g. /in/username).",
      };
    }
    return {
      valid: false,
      error: "LinkedIn URL must be in the format 'https://linkedin.com/in/username'.",
    };
  }

  const cleanUrl = `https://www.linkedin.com/in/${match[1]}`;
  return { valid: true, cleanUrl };
}

/**
 * Strictly validates an Instagram personal profile URL.
 * Accepts:
 *   - https://www.instagram.com/username
 *   - https://instagram.com/username/
 *   - https://instagr.am/username
 * Rejects:
 *   - /p/ (posts), /reel/ (reels), /stories/, /explore/, /accounts/, /direct/
 */
export function validateInstagramUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, error: "Instagram URL is required." };
  }

  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname !== "instagram.com" &&
    hostname !== "www.instagram.com" &&
    hostname !== "instagr.am" &&
    !hostname.endsWith(".instagram.com")
  ) {
    return {
      valid: false,
      error: "Must be an Instagram domain (e.g. https://instagram.com/username).",
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);

  if (segments.length !== 1) {
    if (segments[0] === "p" || segments[0] === "reel" || segments[0] === "reels") {
      return {
        valid: false,
        error: "Individual post or reel links are not allowed. Please provide the profile URL (e.g. instagram.com/username).",
      };
    }
    if (segments[0] === "stories") {
      return {
        valid: false,
        error: "Stories links are temporary. Please provide the profile URL (e.g. instagram.com/username).",
      };
    }
    return {
      valid: false,
      error: "Instagram URL must be in the format 'https://instagram.com/username'.",
    };
  }

  const username = segments[0];
  // Instagram usernames: alphanumeric, underscore, dot, max 30 chars
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  if (!usernameRegex.test(username) || ["explore", "direct", "accounts", "legal", "about", "developer"].includes(username.toLowerCase())) {
    return {
      valid: false,
      error: `"${username}" is not a valid Instagram profile username.`,
    };
  }

  const cleanUrl = `https://www.instagram.com/${username}`;
  return { valid: true, cleanUrl };
}

export interface ParsedBulkLine {
  lineNumber: number;
  rawText: string;
  name?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Parses multi-line bulk input.
 * Supports comma, tab, or pipe-separated lines:
 * e.g. "Alex River, https://linkedin.com/in/alex-river, https://instagram.com/alexriver"
 */
export function parseBulkInput(bulkText: string): ParsedBulkLine[] {
  if (!bulkText || !bulkText.trim()) return [];

  const lines = bulkText.split(/\r?\n/);
  const results: ParsedBulkLine[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return; // Skip empty lines or comments

    // Delimiter can be comma, tab, or pipe
    let parts: string[] = [];
    if (trimmed.includes("\t")) {
      parts = trimmed.split("\t").map((p) => p.trim());
    } else if (trimmed.includes("|")) {
      parts = trimmed.split("|").map((p) => p.trim());
    } else {
      parts = trimmed.split(",").map((p) => p.trim());
    }

    const errors: string[] = [];
    if (parts.length < 3) {
      results.push({
        lineNumber: index + 1,
        rawText: trimmed,
        isValid: false,
        errors: ["Expected 3 parts separated by commas or tabs: Name, LinkedIn URL, Instagram URL."],
      });
      return;
    }

    const name = parts[0];
    const rawLinkedin = parts[1];
    const rawInstagram = parts[2];

    if (!name || name.length < 2) {
      errors.push("Name must be at least 2 characters.");
    }

    const linkedinVal = validateLinkedInUrl(rawLinkedin);
    if (!linkedinVal.valid) {
      errors.push(linkedinVal.error || "Invalid LinkedIn URL.");
    }

    const instagramVal = validateInstagramUrl(rawInstagram);
    if (!instagramVal.valid) {
      errors.push(instagramVal.error || "Invalid Instagram URL.");
    }

    results.push({
      lineNumber: index + 1,
      rawText: trimmed,
      name,
      linkedinUrl: linkedinVal.cleanUrl || rawLinkedin,
      instagramUrl: instagramVal.cleanUrl || rawInstagram,
      isValid: errors.length === 0,
      errors,
    });
  });

  return results;
}
