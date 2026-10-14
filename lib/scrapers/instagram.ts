import { runApifyActor } from "./apify-client";
import { InstagramScrapedData, InstagramPost, ScrapeResult } from "./types";

/**
 * Scrapes a public Instagram profile using Apify's cookie-less actor.
 * Actor: apify/instagram-profile-scraper (or apify/instagram-scraper)
 */
export async function scrapeInstagramProfile(
  profileUrl: string
): Promise<ScrapeResult> {
  try {
    const cleanUrl = profileUrl.trim().replace(/\/+$/, "");
    const username = cleanUrl.split("/").pop() || "";

    const input = {
      usernames: [username],
      resultsLimit: 20,
    };

    const items = await runApifyActor<any>({
      actorId: "apify/instagram-profile-scraper",
      input,
      timeoutSecs: 180,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        source: "instagram",
        error: `No data returned by Instagram scraper for @${username}.`,
      };
    }

    const raw = items[0];

    // Check if account is private
    const isPrivate = Boolean(
      raw.isPrivate ||
      raw.private ||
      raw.is_private ||
      raw.isPrivateAccount
    );

    if (isPrivate) {
      return {
        success: false,
        source: "instagram",
        isPrivate: true,
        error: "This Instagram account is private. AgentMatch requires public profiles to analyze lifestyle and vibe.",
      };
    }

    // Extract posts
    const rawPosts =
      raw.latestPosts ||
      raw.posts ||
      raw.topPosts ||
      raw.edge_owner_to_timeline_media?.edges?.map((e: any) => e.node) ||
      [];

    const posts: InstagramPost[] = [];

    if (Array.isArray(rawPosts)) {
      rawPosts.slice(0, 20).forEach((post: any) => {
        // Extract hashtags
        const caption =
          post.caption ||
          post.text ||
          post.edge_media_to_caption?.edges?.[0]?.node?.text ||
          "";

        const hashtagMatches = caption.match(/#[a-zA-Z0-9_]+/g) || [];
        const hashtags = hashtagMatches.map((h: string) => h.replace("#", ""));

        // Determine post type
        let postType: InstagramPost["postType"] = "image";
        if (post.type === "Video" || post.isVideo || post.is_video) {
          postType = "video";
        } else if (post.type === "Sidecar" || (post.images && post.images.length > 1)) {
          postType = "carousel";
        }

        posts.push({
          caption,
          hashtags,
          location:
            post.locationName ||
            post.location?.name ||
            (typeof post.location === "string" ? post.location : undefined),
          taggedAccounts: Array.isArray(post.taggedUsers)
            ? post.taggedUsers.map((u: any) => (typeof u === "string" ? u : u.username || ""))
            : undefined,
          postType,
          imageUrl:
            post.displayUrl ||
            post.imageUrl ||
            post.thumbnailUrl ||
            post.url ||
            post.images?.[0] ||
            undefined,
          timestamp: post.timestamp || post.takenAtTimestamp || undefined,
        });
      });
    }

    const data: InstagramScrapedData = {
      username: raw.username || username,
      fullName: raw.fullName || raw.name || undefined,
      bio: raw.biography || raw.bio || raw.description || undefined,
      followerCount: raw.followersCount || raw.followers || raw.edge_followed_by?.count || 0,
      followingCount: raw.followsCount || raw.following || raw.edge_follow?.count || 0,
      isPrivate: false,
      profilePhotoUrl:
        raw.profilePicUrl ||
        raw.profilePicUrlHD ||
        raw.avatar ||
        raw.pictureUrl ||
        undefined,
      posts,
      raw,
    };

    return {
      success: true,
      source: "instagram",
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      source: "instagram",
      error: err.message || "Failed to scrape Instagram profile.",
    };
  }
}
