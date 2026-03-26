import { Message, ChatConfig } from '../../types';
import { createProvider } from './factory';
import { APIError } from './types';

/** HTTP status codes that are safe to retry (rate-limit / server overload). */
const RETRYABLE_STATUSES = new Set([429, 503, 529]);

/** Fallback delays (ms) for retry attempts 1 and 2 when no Retry-After header is present. */
const FALLBACK_DELAYS_MS = [5_000, 15_000];

/** Maximum number of ms we will honour from a Retry-After header. */
const MAX_RETRY_AFTER_MS = 60_000;

export async function generateResponse(
  config: ChatConfig,
  messages: Message[],
  signal?: AbortSignal
): Promise<Message> {
  const startTime = Date.now();
  const provider = createProvider(config.model);

  const apiMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Respect Retry-After header if the previous error included one; otherwise use
      // fixed fallback delays that are long enough for typical overload scenarios.
      let delayMs = FALLBACK_DELAYS_MS[attempt - 1] ?? 15_000;
      if (lastError instanceof APIError && lastError.retryAfter != null) {
        delayMs = Math.min(lastError.retryAfter * 1000, MAX_RETRY_AFTER_MS);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    try {
      const result = await provider.makeRequest({
        apiKey: config.apiKey,
        orgId: config.orgId,
        model: config.modelVersion,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      }, apiMessages, signal);

      const timeTaken = Date.now() - startTime;
      const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        model: config.model,
        content: result.content,
        timestamp: Date.now(),
        wordCount,
        timeTaken
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // For API errors with a non-retryable status (e.g. 401 auth, 400 bad request),
      // fail immediately — retrying won't help.
      if (error instanceof APIError && !RETRYABLE_STATUSES.has(error.status)) {
        throw lastError;
      }
    }
  }

  throw lastError;
}
