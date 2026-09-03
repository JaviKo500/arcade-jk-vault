import { Resend } from "resend";
import { isRateLimited } from "@/lib/contact-rate-limit";

type ContactRequestBody = {
  name: string;
  email: string;
  msg: string;
  company: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as Partial<ContactRequestBody> | null;

  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim() ?? "";
  const msg = body?.msg?.trim() ?? "";
  const company = body?.company ?? "";

  if (!name || !email || !msg || !EMAIL_REGEX.test(email)) {
    return Response.json({ ok: false, error: "invalid_fields" }, { status: 400 });
  }

  if (company) {
    return Response.json({ ok: false, error: "honeypot" }, { status: 400 });
  }

  if (isRateLimited(getClientIp(request))) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    console.error("contact: Resend no está configurado (faltan variables de entorno)");
    return Response.json({ ok: false, error: "send_failed" }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails
    .send({
      from: fromEmail,
      to: toEmail,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
    })
    .catch((sendError) => ({ data: null, error: sendError }));

  if (error) {
    console.error("contact: Resend no pudo enviar el correo", error);
    return Response.json({ ok: false, error: "send_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
