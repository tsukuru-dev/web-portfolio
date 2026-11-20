import { describe, expect, it } from 'vitest';
import { budgets, deliveryOptions, projectStartOptions, projectTypes } from '../src/data/enquiry';
import { validateEnquiry } from '../src/lib/enquiry';

function validForm(overrides: Record<string, string | string[]> = {}): FormData {
  const values: Record<string, string | string[]> = {
    name: 'Jamie Example',
    business: 'Example Studio',
    email: 'jamie@example.com',
    phone: '+44 7700 900123',
    websiteUrl: 'example.com',
    projectType: [projectTypes[0]],
    budget: budgets[0],
    projectStart: projectStartOptions[0],
    deliveryDeadline: deliveryOptions[0],
    deliveryDate: '',
    message: 'We need a distinctive new website.',
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
  }
  return form;
}

describe('validateEnquiry', () => {
  it('normalises and accepts a complete valid enquiry', () => {
    const enquiry = validateEnquiry(validForm({ name: '  Jamie Example  ' }));

    expect(enquiry.name).toBe('Jamie Example');
    expect(enquiry.projectTypes).toEqual([projectTypes[0]]);
    expect(enquiry.websiteUrl).toBe('example.com');
  });

  it.each([
    ['missing name', { name: '' }],
    ['invalid email', { email: 'not-an-email' }],
    ['invalid project type', { projectType: ['Something unexpected'] }],
    ['duplicate project type', { projectType: [projectTypes[0], projectTypes[0]] }],
    ['invalid budget', { budget: 'A million pounds' }],
    ['invalid starting point', { projectStart: 'Last year' }],
    ['invalid delivery timeframe', { deliveryDeadline: 'Yesterday' }],
    ['invalid phone', { phone: 'call-me' }],
    ['invalid website protocol', { websiteUrl: 'javascript:alert(1)' }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => validateEnquiry(validForm(overrides))).toThrow();
  });

  it('rejects header injection through the sender name or subject', () => {
    expect(() => validateEnquiry(validForm({ name: 'Jamie\r\nBcc: attacker@example.com' }))).toThrow();
    expect(() => validateEnquiry(validForm({ business: 'Studio\r\nBcc: attacker@example.com' }))).toThrow();
  });

  it('rejects an oversized message', () => {
    expect(() => validateEnquiry(validForm({ message: 'x'.repeat(3001) }))).toThrow();
  });

  it('requires a date when a fixed delivery date is selected', () => {
    expect(() => validateEnquiry(validForm({ deliveryDeadline: 'I have a fixed date', deliveryDate: '' }))).toThrow();
    expect(validateEnquiry(validForm({ deliveryDeadline: 'I have a fixed date', deliveryDate: '2027-02-15' })).deliveryDate).toBe('2027-02-15');
  });
});
