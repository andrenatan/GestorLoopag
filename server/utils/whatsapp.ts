import type { WhatsappConnection } from "@shared/schema";

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

export function toWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 11 ? `55${digits}` : digits;
}

export async function sendWhatsappText(
  connection: Pick<WhatsappConnection, "phoneNumberId" | "accessToken">,
  toPhone: string,
  content: string
): Promise<{ ok: true; waMessageId: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${connection.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsappPhone(toPhone),
        type: "text",
        text: { body: content },
      }),
    });

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }

    const data = await res.json();
    return { ok: true, waMessageId: data.messages?.[0]?.id ?? null };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function sendWhatsappTemplate(
  connection: Pick<WhatsappConnection, "phoneNumberId" | "accessToken">,
  toPhone: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<{ ok: true; waMessageId: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${connection.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsappPhone(toPhone),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: parameters.length > 0
            ? [{ type: "body", parameters: parameters.map((text) => ({ type: "text", text })) }]
            : [],
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    const data = await res.json();
    return { ok: true, waMessageId: data.messages?.[0]?.id ?? null };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export function renderTemplateBody(bodyText: string, parameters: string[]): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_, num) => {
    const idx = parseInt(num, 10) - 1;
    return parameters[idx] ?? `{{${num}}}`;
  });
}

export interface TemplateButtonInput {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phoneNumber?: string;
}

export function countTemplateVariables(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  return new Set(matches).size;
}

export async function createMetaMessageTemplate(
  connection: Pick<WhatsappConnection, "accessToken">,
  wabaId: string,
  params: { name: string; category: string; language: string; headerText?: string; bodyText: string; footerText?: string; buttons?: TemplateButtonInput[] }
): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string }> {
  try {
    const components: Record<string, unknown>[] = [];
    if (params.headerText) {
      components.push({ type: "HEADER", format: "TEXT", text: params.headerText });
    }
    components.push({ type: "BODY", text: params.bodyText });
    if (params.footerText) {
      components.push({ type: "FOOTER", text: params.footerText });
    }
    if (params.buttons && params.buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: params.buttons.map((b) => {
          if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
          if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phoneNumber };
          return { type: "QUICK_REPLY", text: b.text };
        }),
      });
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        category: params.category.toUpperCase(),
        language: params.language,
        components,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || JSON.stringify(data) };
    }
    return { ok: true, id: data.id, status: (data.status || "PENDING").toLowerCase() };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function fetchMetaMessageTemplateStatus(
  connection: Pick<WhatsappConnection, "accessToken">,
  wabaId: string,
  name: string
): Promise<
  | { ok: true; status: string; rejectionReason: string | null; metaTemplateId: string | null }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
      { headers: { Authorization: `Bearer ${connection.accessToken}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || JSON.stringify(data) };
    }
    const template = data.data?.[0];
    if (!template) {
      return { ok: false, error: "Template não encontrado na Meta" };
    }
    return {
      ok: true,
      status: (template.status || "pending").toLowerCase(),
      rejectionReason: template.rejected_reason || null,
      metaTemplateId: template.id || null,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function deleteMetaMessageTemplate(
  connection: Pick<WhatsappConnection, "accessToken">,
  wabaId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string; notFound?: boolean }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${connection.accessToken}` } }
    );
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    const message = data?.error?.message || "";
    const notFound = res.status === 404 || /does not exist|not found/i.test(message);
    return { ok: false, error: message || `HTTP ${res.status}`, notFound };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}
