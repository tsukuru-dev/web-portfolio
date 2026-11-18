import { describe, expect, it } from 'vitest';
import type { Enquiry } from '../src/lib/enquiry';
import { buildEnquiryEmail } from '../src/lib/enquiry-email';

const sender = 'enquiries@forms.madhatterstudio.co.uk';
const destination = 'contact@madhatterstudio.co.uk';

const enquiry: Enquiry = {
  name: 'Jamie Example',
  business: 'Example Studio',
  email: 'jamie@example.com',
  phone: '+44 7700 900123',
  websiteUrl: 'https://example.com',
  projectTypes: ['A new website'],
  budget: '£2k–£4k',
  timeline: 'Ready to start now',
  message: 'We need a distinctive new website.',
};

describe('buildEnquiryEmail', () => {
  it('uses the routed subdomain sender and verified destination', () => {
    const raw = buildEnquiryEmail(enquiry, sender, destination);

    expect(raw).toContain(`<${sender}>`);
    expect(raw).toContain(`To: <${destination}>`);
    expect(raw).toContain('<jamie@example.com>');
    expect(raw).toContain(btoa('New project enquiry: Example Studio'));
  });

  it('includes the complete enquiry in the text body', () => {
    const raw = buildEnquiryEmail(enquiry, sender, destination);

    expect(raw).toContain('New Madhatter Studio project enquiry');
    expect(raw).toContain('Name: Jamie Example');
    expect(raw).toContain('Project: A new website');
    expect(raw).toContain('We need a distinctive new website.');
  });

  it('falls back to the sender name when no business is supplied', () => {
    const raw = buildEnquiryEmail({ ...enquiry, business: '' }, sender, destination);

    expect(raw).toContain(btoa('New project enquiry: Jamie Example'));
    expect(raw).toContain('Business: Not provided');
  });
});
