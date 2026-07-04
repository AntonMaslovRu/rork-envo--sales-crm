import { config } from "./config.js";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const url = `https://login.microsoftonline.com/${config.msTenantId}/oauth2/v2.0/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.msClientId,
      client_secret: config.msClientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Graph token error HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    // обновляем за минуту до истечения
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return json.access_token;
}

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  if (config.dryRun) {
    console.log(`[DRY RUN] Письмо для ${to}: "${subject}"\n${body}\n---`);
    return;
  }

  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.mailFrom)}/sendMail`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  // 202 Accepted — успех
  if (!response.ok) {
    throw new Error(`Graph sendMail HTTP ${response.status}: ${await response.text()}`);
  }
}
