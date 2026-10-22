/**
 * The one API-origin helper for the whole app (issue #488).
 *
 * `useLogin`, `useActivityFeed`, and every other hook must call
 * `getApiBaseUrl()` — never hardcode `http://localhost:3000` / `:3001`. It
 * delegates to the axios client's resolver so there is a single precedence
 * chain (explicit override → runtime global → `NEXT_PUBLIC_API_URL` →
 * `http://localhost:3001`) and changing `NEXT_PUBLIC_API_URL` is reflected
 * everywhere with no code edits.
 */
export {
  resolveApiBaseUrl as getApiBaseUrl,
  DEFAULT_API_BASE_URL,
  setApiBaseUrl,
  resetApiBaseUrl,
} from "@/lib/api/axios";

import { resolveApiBaseUrl } from "@/lib/api/axios";

let hasCheckedReachability = false;

/**
 * Best-effort startup check: pings `<origin>/health` and logs a warning if
 * the configured API origin is unreachable (issue #488). No-ops after the
 * first call and never throws. Call once from a client provider on mount.
 */
export async function warnIfApiUnreachable(timeoutMs = 3000): Promise<void> {
  if (hasCheckedReachability || typeof window === "undefined") return;
  hasCheckedReachability = true;

  const origin = resolveApiBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${origin}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(
        `[API Client] Backend health check failed (HTTP ${response.status}). ` +
          `Check NEXT_PUBLIC_API_URL and the backend /health endpoint.`,
      );
    }
  } catch {
    console.warn(
      `[API Client] Backend unreachable at ${origin}.\n` +
        `Check that the backend is running and NEXT_PUBLIC_API_URL points to it.\n` +
        `[Mock Mode] Development and preview flows may fall back to mock data. ` +
        `Authenticated API operations require a reachable backend.`,
    );
  } finally {
    clearTimeout(timer);
  }
}
