import nodemailer from "nodemailer";

export async function sendMail(input: { to: string; subject: string; text: string; html: string }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !process.env.SMTP_FROM) throw new Error("SMTP is not configured.");
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from: process.env.SMTP_FROM, ...input });
}
