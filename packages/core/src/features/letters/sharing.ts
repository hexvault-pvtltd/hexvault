export type ShareChannel = "GMAIL" | "EMAIL" | "WHATSAPP" | "DEVICE";
export function composeLinks(input: { recipientEmail: string; recipientPhone?: string; subject: string; emailText: string; whatsappText: string }) {
  const gmail = new URL("https://mail.google.com/mail/");
  gmail.search = new URLSearchParams({ view: "cm", fs: "1", to: input.recipientEmail, su: input.subject, body: input.emailText }).toString();
  const mailto = `mailto:${encodeURIComponent(input.recipientEmail)}?${new URLSearchParams({ subject: input.subject, body: input.emailText }).toString().replaceAll("+", "%20")}`;
  const phone = (input.recipientPhone ?? "").replace(/\D/g, "");
  const whatsapp = `https://wa.me/${phone}?${new URLSearchParams({ text: input.whatsappText }).toString()}`;
  return { gmail: gmail.toString(), email: mailto, whatsapp };
}
