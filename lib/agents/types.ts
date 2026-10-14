export interface EvidenceItem {
  claim: string;
  source: "linkedin" | "instagram";
  detail: string;
}

export interface AgentProfileAnalysis {
  summary: string;
  needs: string[];
  hobbies: string[];
  interests: string[];
  values: string[];
  personality_traits: Array<{
    trait: string;
    score: number; // 0 - 100
    description?: string;
  }>;
  communication_style: string;
  lifestyle: string;
  looking_for: string;
  deal_breakers: string[];
  evidence: EvidenceItem[];
  confidence_scores: Record<string, "high" | "medium" | "low">;
}

export interface AgentPersona {
  personId: string;
  name: string;
  profile: AgentProfileAnalysis;
  systemPrompt: string;
}
