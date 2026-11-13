import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';
import { validateEnquiry } from '../src/lib/enquiry';

interface Env {
  ASSETS: Fetcher;
  ENQUIRY_EMAIL: SendEmail;
  SITE_ORIGIN?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const json = (body: object, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname !== '/api/enquiry') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!env.SITE_ORIGIN || !env.EMAIL_FROM || !env.EMAIL_TO || !env.TURNSTILE_SECRET_KEY) {
      return json({ error: 'Online enquiries are not configured yet. Please try again later.' }, 503);
    }
    if (request.headers.get('Origin') !== env.SITE_ORIGIN) return json({ error: 'Please submit the form from the website.' }, 403);
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.startsWith('multipart/form-data') && !contentType.startsWith('application/x-www-form-urlencoded')) {
      return json({ error: 'Unsupported form format.' }, 415);
    }

    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Missing form data.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 25000) {
        await reader.cancel();
        return json({ error: 'Your enquiry is too long.' }, 413);
      }
      chunks.push(value);
    }

    let form: FormData;
    let enquiry;
    try {
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      form = await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
      if (form.get('website')) return json({ error: 'Unable to submit this enquiry.' }, 400);
      enquiry = validateEnquiry(form);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Please check the form.' }, 400);
    }

    const token = form.get('cf-turnstile-response');
    if (typeof token !== 'string' || !token || token.length > 2048) return json({ error: 'Please complete the spam protection.' }, 400);
    try {
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') || '',
        }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await verification.json() as { success: boolean; hostname?: string; action?: string };
      if (!verification.ok || !result.success || result.hostname !== new URL(env.SITE_ORIGIN).hostname || result.action !== 'enquiry') {
        return json({ error: 'Spam protection expired or failed. Please try again.' }, 400);
      }

      const message = createMimeMessage();
      message.setSender({ name: 'Madhatter website', addr: env.EMAIL_FROM });
      message.setRecipient(env.EMAIL_TO);
      message.setHeader('Reply-To', enquiry.email);
      message.setSubject(`New project enquiry: ${enquiry.business || enquiry.name}`);
      message.addMessage({
        contentType: 'text/plain',
        data: [
          'New Madhatter Studio project enquiry',
          '',
          `Name: ${enquiry.name}`,
          `Business: ${enquiry.business || 'Not provided'}`,
          `Email: ${enquiry.email}`,
          `Phone: ${enquiry.phone || 'Not provided'}`,
          `Website: ${enquiry.websiteUrl || 'Not provided'}`,
          `Project: ${enquiry.projectTypes.join(', ')}`,
          `Budget: ${enquiry.budget}`,
          `Timeline: ${enquiry.timeline}`,
          '',
          enquiry.message,
        ].join('\n'),
      });
      await env.ENQUIRY_EMAIL.send(new EmailMessage(env.EMAIL_FROM, env.EMAIL_TO, message.asRaw()));
      return json({ ok: true });
    } catch {
      return json({ error: 'The enquiry could not be sent. Please try again shortly.' }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
