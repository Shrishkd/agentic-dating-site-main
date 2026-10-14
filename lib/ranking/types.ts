export interface MutualRankItem {
  rankedPersonId: string;
  rankedPersonName: string;
  rankedPersonPhoto?: string;
  rank: number;
  scoreGiven: number;
  scoreReceived: number;
  finalScore: number; // 0.6 * scoreGiven + 0.4 * scoreReceived
  explanation: string;
  dateSessionId?: string;
}

export interface MutualPairMatch {
  personAId: string;
  personAName: string;
  personBId: string;
  personBName: string;
  scoreAToB: number;
  scoreBToA: number;
  mutualScore: number;
  dateSessionId: string;
}
