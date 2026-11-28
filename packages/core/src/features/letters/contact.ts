export function recipientPhone(phone: string | null | undefined) {
  const normalized = (phone ?? "").trim().replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+?[1-9]\d{6,14}$/.test(normalized) ? normalized : "";
}
