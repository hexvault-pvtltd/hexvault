export function applicationUrl(fallback?: string) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const hostname = process.env.APP_HOSTNAME?.trim();
  if (hostname) return `https://${hostname.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return (fallback ?? "http://localhost:3000").replace(/\/$/, "");
}
