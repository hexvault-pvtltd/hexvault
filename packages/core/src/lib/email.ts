import nodemailer from "nodemailer";

export type MailInput = { to: string; subject: string; text: string; html: string; attachments?: { filename: string; content: Buffer; contentType: string }[] };

export async function sendGmail(input: MailInput) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass }, connectionTimeout: 15000, socketTimeout: 30000 });
  await transport.sendMail({ from: user, ...input });
}

export async function sendMail(input: MailInput) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.RESEND_FROM;
    if (!from) throw new Error("RESEND_FROM is not configured.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments?.map(item => ({ filename: item.filename, content: item.content.toString("base64") })),
      }),
    });

    if (!response.ok) {
      const error = new Error("Resend rejected the email request.") as Error & {
        code: string;
        responseCode: number;
        command: string;
      };
      error.code = "RESEND_API_ERROR";
      error.responseCode = response.status;
      error.command = "HTTPS";
      throw error;
    }

    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.SMTP_FROM;

  if (apiKey) {
    if (!from) throw new Error("SMTP_FROM is not configured.");

    const match = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    const sender = match
      ? { name: match[1].replace(/^"|"$/g, ""), email: match[2].trim() }
      : { email: from.trim() };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
        htmlContent: input.html,
        attachment: input.attachments?.map(item => ({ name: item.filename, content: item.content.toString("base64") })),
      }),
    });

    if (!response.ok) {
      const error = new Error("Brevo rejected the transactional email request.") as Error & {
        code: string;
        responseCode: number;
        command: string;
      };
      error.code = "BREVO_API_ERROR";
      error.responseCode = response.status;
      error.command = "HTTPS";
      throw error;
    }

    return;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !from) throw new Error("Email is not configured. Set RESEND_API_KEY, BREVO_API_KEY, or SMTP_HOST and SMTP_FROM.");
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, connectionTimeout: 15000, socketTimeout: 30000, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from, ...input });
}
