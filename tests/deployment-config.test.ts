import { describe, expect, it } from 'vitest';
import config from '../wrangler.jsonc?raw';

describe('Cloudflare email configuration', () => {
  it('keeps production enquiries on the routed sender and verified destination', () => {
    expect(config).toContain('"EMAIL_FROM": "enquiries@forms.madhatterstudio.co.uk"');
    expect(config).toContain('"EMAIL_TO": "contact@madhatterstudio.co.uk"');
    expect(config).toContain('"destination_address": "contact@madhatterstudio.co.uk"');
  });
});
