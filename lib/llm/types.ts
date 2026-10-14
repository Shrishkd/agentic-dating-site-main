export interface LlmCallOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  responseSchema?: Record<string, any>;
  responseMimeType?: "application/json" | "text/plain";
  images?: Array<{
    inlineData: {
      data: string; // base64
      mimeType: string;
    };
  }>;
  skipCache?: boolean;
}

export interface LlmResponse<T = any> {
  text: string;
  data?: T;
  cached: boolean;
  model: string;
  keyIndex: number;
}

export interface RateLimiterStatus {
  queueLength: number;
  rpmUsed: number;
  rpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  activeKeyIndex: number;
  totalKeys: number;
  isPaused: boolean;
  pauseReason?: string;
}
