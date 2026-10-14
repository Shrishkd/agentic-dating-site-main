import { RateLimiterStatus } from "./types";

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  retries: number;
}

export class GeminiRateLimiter {
  private rpmLimit: number;
  private rpdLimit: number;
  private minuteTimestamps: number[] = [];
  private dayTimestamps: number[] = [];
  private queue: QueueItem<any>[] = [];
  private isProcessing = false;
  private keys: string[] = [];
  private currentKeyIndex = 0;
  private isQuotaPaused = false;
  private pauseReason: string = "";

  constructor() {
    this.rpmLimit = parseInt(process.env.GEMINI_RPM_LIMIT || "15", 10);
    this.rpdLimit = parseInt(process.env.GEMINI_RPD_LIMIT || "1500", 10);
    this.initKeys();
  }

  public initKeys() {
    const primaryKey = process.env.GEMINI_API_KEY?.trim() || "";
    const extraKeys = (process.env.GEMINI_API_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const allKeys = [primaryKey, ...extraKeys].filter((k) => k.length > 0);
    // Remove duplicates
    this.keys = Array.from(new Set(allKeys));
    this.currentKeyIndex = 0;
  }

  public getActiveApiKey(): string {
    if (this.keys.length === 0) {
      this.initKeys();
    }
    if (this.keys.length === 0) {
      throw new Error(
        "No GEMINI_API_KEY found in environment variables. Please add one in your .env file."
      );
    }
    return this.keys[this.currentKeyIndex % this.keys.length];
  }

  public getActiveKeyIndex(): number {
    return this.currentKeyIndex % (this.keys.length || 1);
  }

  public getTotalKeys(): number {
    return Math.max(this.keys.length, 1);
  }

  public rotateKey(reason?: string): boolean {
    if (this.keys.length <= 1) {
      return false; // No alternative keys to rotate to
    }
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    console.warn(
      `[GeminiRateLimiter] Rotated API Key to index ${this.currentKeyIndex} (${reason || "Quota/Rate Limit"})`
    );
    return true;
  }

  public markQuotaExhausted(reason: string) {
    this.isQuotaPaused = true;
    this.pauseReason = reason;
  }

  public resumeQuota() {
    this.isQuotaPaused = false;
    this.pauseReason = "";
    this.processQueue();
  }

  public getStatus(): RateLimiterStatus {
    const now = Date.now();
    // Clean up timestamps
    this.minuteTimestamps = this.minuteTimestamps.filter((t) => now - t < 60000);
    this.dayTimestamps = this.dayTimestamps.filter(
      (t) => now - t < 24 * 60 * 60 * 1000
    );

    return {
      queueLength: this.queue.length,
      rpmUsed: this.minuteTimestamps.length,
      rpmLimit: this.rpmLimit,
      rpdUsed: this.dayTimestamps.length,
      rpdLimit: this.rpdLimit,
      activeKeyIndex: this.getActiveKeyIndex(),
      totalKeys: this.getTotalKeys(),
      isPaused: this.isQuotaPaused,
      pauseReason: this.pauseReason || undefined,
    };
  }

  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        retries: 0,
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (this.isQuotaPaused) {
      console.warn(
        `[GeminiRateLimiter] Queue paused: ${this.pauseReason}. Waiting for quota or new key.`
      );
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (this.isQuotaPaused) break;

      const now = Date.now();
      // Remove timestamps older than 1 minute
      this.minuteTimestamps = this.minuteTimestamps.filter((t) => now - t < 60000);
      // Remove timestamps older than 24 hours
      this.dayTimestamps = this.dayTimestamps.filter(
        (t) => now - t < 24 * 60 * 60 * 1000
      );

      // Check daily limit
      if (this.dayTimestamps.length >= this.rpdLimit) {
        // Try rotating key
        if (this.rotateKey("Daily RPD limit reached")) {
          // Reset minute timestamps for new key window
          this.minuteTimestamps = [];
          continue;
        } else {
          this.markQuotaExhausted(
            "Daily quota reached (RPD). Resume tomorrow or add more keys to GEMINI_API_KEYS."
          );
          break;
        }
      }

      // Check minute limit
      if (this.minuteTimestamps.length >= this.rpmLimit) {
        const oldest = this.minuteTimestamps[0];
        const waitTime = Math.max(0, 60000 - (now - oldest) + 500);
        console.log(
          `[GeminiRateLimiter] RPM limit reached (${this.minuteTimestamps.length}/${this.rpmLimit}). Waiting ${waitTime}ms...`
        );
        await new Promise((res) => setTimeout(res, waitTime));
        continue;
      }

      const item = this.queue.shift();
      if (!item) break;

      this.minuteTimestamps.push(Date.now());
      this.dayTimestamps.push(Date.now());

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (err: any) {
        const isRateLimitError =
          err?.status === 429 ||
          err?.message?.includes("429") ||
          err?.message?.includes("RESOURCE_EXHAUSTED") ||
          err?.message?.includes("Quota exceeded");

        const isServiceUnavailable =
          err?.status === 503 ||
          err?.message?.includes("503") ||
          err?.message?.includes("Service Unavailable") ||
          err?.message?.includes("overloaded") ||
          err?.message?.includes("UNAVAILABLE");

        // Overloaded models give up after 2 retries so the caller can fall back to another model.
        const maxRetries = isServiceUnavailable && !isRateLimitError ? 2 : 5;
        if ((isRateLimitError || isServiceUnavailable) && item.retries < maxRetries) {
          item.retries += 1;
          const rotated = this.rotateKey(err?.message || "Rate limit error");
          const backoffDelay = Math.min(1000 * Math.pow(2, item.retries), 30000);

          console.warn(
            `[GeminiRateLimiter] Call failed with ${err?.message || "Rate Limit"}. Retrying (attempt ${item.retries}/5) after ${backoffDelay}ms... (Key Rotated: ${rotated})`
          );

          // Re-queue item at front
          this.queue.unshift(item);
          await new Promise((res) => setTimeout(res, backoffDelay));
        } else if (isRateLimitError && item.retries >= 5) {
          this.markQuotaExhausted(
            "Quota exhausted across all retries. Add another key in GEMINI_API_KEYS or wait."
          );
          item.reject(
            new Error(
              `Rate limit / Quota reached and all retries exhausted. Status: ${err?.message}`
            )
          );
        } else {
          item.reject(err);
        }
      }
    }

    this.isProcessing = false;
  }
}

export const globalRateLimiter = new GeminiRateLimiter();
