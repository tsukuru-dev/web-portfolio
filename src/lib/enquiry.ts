import { budgets, projectTypes, timelines } from '../data/enquiry';

export type Enquiry = {
  name: string;
  business: string;
  email: string;
  phone: string;
  websiteUrl: string;
  projectTypes: string[];
  budget: string;
  timeline: string;
  message: string;
};

export function validateEnquiry(form: FormData): Enquiry {
  const field = (key: string, max: number, required = true) => {
    const raw = form.get(key);
    if (raw !== null && typeof raw !== 'string') throw new Error('Invalid form fields.');
    const value = (raw || '').trim();
    if ((required && !value) || value.length > max) throw new Error(`Please check the ${key} field.`);
    return value;
  };

  const selectedTypes = form.getAll('projectType');
  if (
    !selectedTypes.length ||
    selectedTypes.some((item) => typeof item !== 'string' || !projectTypes.includes(item as typeof projectTypes[number])) ||
    new Set(selectedTypes).size !== selectedTypes.length
  ) throw new Error('Please choose at least one valid project type.');

  const enquiry: Enquiry = {
    name: field('name', 100),
    business: field('business', 120, false),
    email: field('email', 254),
    phone: field('phone', 30, false),
    websiteUrl: field('websiteUrl', 300, false),
    projectTypes: selectedTypes as string[],
    budget: field('budget', 40),
    timeline: field('timeline', 40),
    message: field('message', 3000),
  };

  if (/\r|\n/.test(enquiry.name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) {
    throw new Error('Please enter a valid name and email address.');
  }
  if (enquiry.phone && (!/^[+\d\s().-]{7,30}$/.test(enquiry.phone) || enquiry.phone.replace(/\D/g, '').length < 7)) {
    throw new Error('Please enter a valid phone number.');
  }
  if (enquiry.websiteUrl) {
    try {
      const url = new URL(enquiry.websiteUrl.startsWith('http') ? enquiry.websiteUrl : `https://${enquiry.websiteUrl}`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error('Please enter a valid website address.');
    }
  }
  if (!budgets.includes(enquiry.budget as typeof budgets[number])) throw new Error('Please choose a valid budget range.');
  if (!timelines.includes(enquiry.timeline as typeof timelines[number])) throw new Error('Please choose a valid timeline.');

  return enquiry;
}
