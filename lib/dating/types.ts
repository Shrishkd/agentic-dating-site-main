export interface ConversationTurn {
  speakerId: string;
  speakerName: string;
  message: string;
  timestamp: string;
  turnNumber: number;
}

export interface DateScorecard {
  shared_interests: number; // 0-100
  values_alignment: number; // 0-100
  lifestyle_fit: number; // 0-100
  communication_chemistry: number; // 0-100
  needs_met: number; // 0-100
  deal_breaker_passed: boolean;
  overall_score: number; // 0-100
  reason: string;
  highlights: string[];
}

export interface DateVenueSelection {
  name: string;
  type: string;
  reason: string;
}

export interface DateSessionData {
  id: string;
  personAId: string;
  personBId: string;
  venue: DateVenueSelection;
  turns: ConversationTurn[];
  scoreAToB: DateScorecard;
  scoreBToA: DateScorecard;
  status: "pending" | "in_progress" | "completed" | "failed";
}
