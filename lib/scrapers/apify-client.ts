/**
 * Generic Apify REST API client for calling Apify Actors without requiring personal cookies.
 */

export interface ApifyRunOptions {
  actorId: string; // e.g. "curious_coder~linkedin-profile-scraper" or "apify~instagram-profile-scraper"
  input: Record<string, any>;
  timeoutSecs?: number;
  memoryMbytes?: number;
  maxRetries?: number;
}

export class ApifyClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: any
  ) {
    super(message);
    this.name = "ApifyClientError";
  }
}

/**
 * Runs an Apify actor and fetches the dataset output items with retries and exponential backoff.
 */
export async function runApifyActor<T = any>(
  options: ApifyRunOptions
): Promise<T[]> {
  const token = process.env.APIFY_TOKEN?.trim();

  if (!token) {
    throw new ApifyClientError(
      "APIFY_TOKEN is missing in environment variables. Please add your token in .env.",
      401
    );
  }

  const {
    actorId,
    input,
    timeoutSecs = 120,
    memoryMbytes = 1024,
    maxRetries = 3,
  } = options;

  // Endpoint for synchronous actor run that directly waits and returns dataset items
  // Format actor ID for API: replace "/" with "~" if needed
  const formattedActorId = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(
    formattedActorId
  )}/run-sync-get-dataset-items?token=${encodeURIComponent(
    token
  )}&timeout=${timeoutSecs}&memory=${memoryMbytes}`;

  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const datasetItems = (await response.json()) as T[];
        return datasetItems;
      }

      const status = response.status;
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }

      // If rate limited or server overloaded, retry with exponential backoff
      if (status === 429 || status === 503 || status === 504) {
        lastError = new ApifyClientError(
          `Apify actor ${actorId} returned status ${status}: ${
            typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody
          }`,
          status,
          errorBody
        );
        const delay = Math.min(1500 * Math.pow(2, attempt), 20000);
        console.warn(
          `[ApifyClient] Actor ${actorId} returned ${status}. Retrying (attempt ${attempt}/${maxRetries}) in ${delay}ms...`
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      // Non-retryable error
      throw new ApifyClientError(
        `Apify actor error (${status}): ${
          errorBody?.error?.message || errorBody?.message || JSON.stringify(errorBody)
        }`,
        status,
        errorBody
      );
    } catch (err: any) {
      if (err instanceof ApifyClientError && err.statusCode && err.statusCode < 500 && err.statusCode !== 429) {
        throw err;
      }
      lastError = err;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(
        `[ApifyClient] Network error calling ${actorId}. Retrying (${attempt}/${maxRetries}) in ${delay}ms...`,
        err?.message
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw (
    lastError ||
    new ApifyClientError(
      `Failed to run Apify actor ${actorId} after ${maxRetries} attempts.`
    )
  );
}
