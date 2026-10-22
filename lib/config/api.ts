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
    await fetch(`${origin}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    console.warn(
      `[API] Configured API origin ${origin} is not reachable. ` +
        `The app is running in mock/offline mode until NEXT_PUBLIC_API_URL points to the live backend.`,
    );
  } finally {
    clearTimeout(timer);
  }
}
