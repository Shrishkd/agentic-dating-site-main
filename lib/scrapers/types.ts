export interface LinkedInScrapedData {
  name: string;
  headline?: string;
  about?: string;
  currentRole?: string;
  pastRoles?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    years?: string;
  }>;
  skills?: string[];
  location?: string;
  certifications?: string[];
  profilePhotoUrl?: string;
  recentPosts?: string[];
  raw?: any;
}

export interface InstagramPost {
  caption?: string;
  hashtags?: string[];
  location?: string;
  taggedAccounts?: string[];
  postType?: "image" | "video" | "carousel" | "reel";
  imageUrl?: string;
  timestamp?: string;
}

export interface InstagramScrapedData {
  username: string;
  fullName?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  isPrivate: boolean;
  profilePhotoUrl?: string;
  posts: InstagramPost[];
  raw?: any;
}

export interface ScrapeResult {
  success: boolean;
  source: "linkedin" | "instagram";
  data?: LinkedInScrapedData | InstagramScrapedData;
  error?: string;
  isPrivate?: boolean;
}
