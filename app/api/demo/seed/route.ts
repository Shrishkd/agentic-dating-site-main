import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEMO_POOL = [
  {
    name: "Maya Lin",
    linkedin_url: "https://www.linkedin.com/in/mayalin-design",
    instagram_url: "https://www.instagram.com/maya_creates",
    summary: "Maya is a thoughtful Brand Designer and ceramic artist living in Brooklyn who values mindful design, quiet morning pour-overs, and weekend museum walks.",
    needs: ["Creative autonomy", "Intellectual depth", "Emotional calm"],
    hobbies: ["Ceramic Pottery", "Art Galleries", "Pour-over Coffee"],
    interests: ["Typography", "Minimalist Architecture", "Indie Cinema"],
    values: ["Authenticity", "Creativity", "Mindfulness"],
    personality_traits: [
      { trait: "Creativity", score: 92, description: "Passionate visual artist and designer" },
      { trait: "Openness", score: 88, description: "Curious and receptive to new ideas" },
      { trait: "Introversion", score: 60, description: "Recharges in quiet spaces" },
    ],
    communication_style: "Thoughtful, poetic, and articulate",
    lifestyle: "Slow mornings, focused creative work, cozy evenings",
    looking_for: "A creative and grounded partner who respects personal space and has their own passions",
    deal_breakers: ["High drama", "Superficiality", "Lack of ambition"],
    evidence: [
      { claim: "Brand Designer", source: "linkedin", detail: "Senior Visual Designer profile" },
      { claim: "Ceramics artist", source: "instagram", detail: "Studio pottery photos and posts" },
    ],
  },
  {
    name: "Alex Thorne",
    linkedin: "https://www.linkedin.com/in/alex-thorne-ai",
    instagram: "https://www.instagram.com/alex_thorne_outdoors",
    summary: "Alex is an AI Systems Engineer and rock climber who thrives on solving tough engineering problems, summiting alpine peaks, and outdoor campfire cooking.",
    needs: ["Shared adventure", "Intellectual stimulation", "Humor"],
    hobbies: ["Bouldering & Climbing", "Alpine Hiking", "Trail Running"],
    interests: ["Machine Learning", "Philosophy of Mind", "Specialty Coffee"],
    values: ["Grit", "Curiosity", "Outdoor Conservation"],
    personality_traits: [
      { trait: "Adventurousness", score: 95, description: "Constant weekend backcountry explorer" },
      { trait: "Analytical", score: 90, description: "Senior AI engineer background" },
      { trait: "Extroversion", score: 70, description: "Enjoys energetic social hikes" },
    ],
    communication_style: "Direct, witty, and enthusiastic",
    lifestyle: "Early morning workouts, high energy, weekend road trips",
    looking_for: "An active, curious partner who loves the outdoors and engaging banter",
    deal_breakers: ["Smoking", "Indoor-only lifestyle", "Pessimism"],
    evidence: [
      { claim: "AI Engineer", source: "linkedin", detail: "Lead Systems Engineer at DeepLab" },
      { claim: "Alpine Climber", source: "instagram", detail: "Summit photos and climbing captions" },
    ],
  },
  {
    name: "Chloe Dupont",
    linkedin: "https://www.linkedin.com/in/chloedupont-product",
    instagram: "https://www.instagram.com/chloe_in_motion",
    summary: "Chloe is a Fintech Product Lead and marathon runner based in San Francisco who balances high-impact product roadmaps with yoga, sourdough baking, and global travel.",
    needs: ["Mutual ambition", "Warm affection", "Reliability"],
    hobbies: ["Marathon Training", "Sourdough Baking", "Vinyasa Yoga"],
    interests: ["Economics", "French Literature", "Urban Cycling"],
    values: ["Discipline", "Warmth", "Continuous Growth"],
    personality_traits: [
      { trait: "Ambition", score: 92, description: "Fintech product leader" },
      { trait: "Warmth", score: 85, description: "Empathetic and engaging collaborator" },
      { trait: "Spontaneity", score: 65, description: "Loves impromptu weekend getaways" },
    ],
    communication_style: "Warm, organized, and encouraging",
    lifestyle: "Structured weekdays, energetic fitness routines, relaxing weekend brunches",
    looking_for: "An ambitious, supportive partner with a positive outlook and active lifestyle",
    deal_breakers: ["Inconsistency", "Lack of communication", "Arrogance"],
    evidence: [
      { claim: "Product Lead", source: "linkedin", detail: "Group Product Manager role" },
      { claim: "Marathon Runner", source: "instagram", detail: "Race medals and training posts" },
    ],
  },
  {
    name: "David Kim",
    linkedin: "https://www.linkedin.com/in/davidkim-founder",
    instagram: "https://www.instagram.com/davidkim_eats",
    summary: "David is a Climate Tech Founder and culinary enthusiast who loves farm-to-table cooking, fermentation experiments, jazz vinyl, and community building.",
    needs: ["Deep conversational chemistry", "Kindness", "Shared values"],
    hobbies: ["Culinary Experimentation", "Jazz Vinyl", "Community Gardening"],
    interests: ["Sustainability", "Food Science", "Jazz History"],
    values: ["Sustainability", "Generosity", "Hospitality"],
    personality_traits: [
      { trait: "Empathy", score: 90, description: "Community-driven mission and founder" },
      { trait: "Creativity", score: 85, description: "Culinary and musical explorer" },
      { trait: "Groundedness", score: 88, description: "Calm and steady demeanor" },
    ],
    communication_style: "Attentive, humorous, and deeply sincere",
    lifestyle: "Founder schedule balanced with weekend dinner parties and jazz sessions",
    looking_for: "A kind-hearted, passionate partner who appreciates good food and deep talks",
    deal_breakers: ["Wastefulness", "Cynicism", "Dishonesty"],
    evidence: [
      { claim: "Climate Tech Founder", source: "linkedin", detail: "Founder & CEO credentials" },
      { claim: "Culinary Hobbyist", source: "instagram", detail: "Sourdough, fermentation, and food posts" },
    ],
  },
];

export async function POST() {
  try {
    const created: string[] = [];

    for (const item of DEMO_POOL) {
      const existing = await prisma.person.findFirst({
        where: {
          OR: [
            { linkedin_url: item.linkedin_url },
            { instagram_url: item.instagram_url },
          ],
        },
      });

      let personId: string;

      if (!existing) {
        const p = await prisma.person.create({
          data: {
            name: item.name,
            linkedin_url: item.linkedin_url ?? "",
            instagram_url: item.instagram_url ?? "",
            status: "analyzed",
          },
        });
        personId = p.id;
      } else {
        personId = existing.id;
        await prisma.person.update({
          where: { id: existing.id },
          data: { status: "analyzed" },
        });
      }

      // Upsert profile
      if (personId) {
        await prisma.profile.upsert({
          where: { person_id: personId },
          update: {
            summary: item.summary,
            needs: JSON.stringify(item.needs),
            hobbies: JSON.stringify(item.hobbies),
            interests: JSON.stringify(item.interests),
            values: JSON.stringify(item.values),
            personality_traits: JSON.stringify(item.personality_traits),
            communication_style: item.communication_style,
            lifestyle: item.lifestyle,
            looking_for: item.looking_for,
            deal_breakers: JSON.stringify(item.deal_breakers),
            evidence: JSON.stringify(item.evidence),
            confidence_scores: JSON.stringify({ overall: "high" }),
          },
          create: {
            person_id: personId,
            summary: item.summary,
            needs: JSON.stringify(item.needs),
            hobbies: JSON.stringify(item.hobbies),
            interests: JSON.stringify(item.interests),
            values: JSON.stringify(item.values),
            personality_traits: JSON.stringify(item.personality_traits),
            communication_style: item.communication_style,
            lifestyle: item.lifestyle,
            looking_for: item.looking_for,
            deal_breakers: JSON.stringify(item.deal_breakers),
            evidence: JSON.stringify(item.evidence),
            confidence_scores: JSON.stringify({ overall: "high" }),
          },
        });
        created.push(item.name);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully populated and analyzed ${created.length} candidates for speed dating!`,
      candidates: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to seed demo candidates" },
      { status: 500 }
    );
  }
}
