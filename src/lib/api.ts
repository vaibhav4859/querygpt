/** Backend base URL from env. No fallback — must be set in .env */
export function getApiBase(): string {
  const base = import.meta.env.VITE_QUERYGPT_BACKEND_URL;
  return typeof base === "string" && base.trim() ? base.trim().replace(/\/$/, "") : "";
}
