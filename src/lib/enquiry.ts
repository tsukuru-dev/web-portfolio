import { budgets, deliveryOptions, projectStartOptions, projectTypes } from '../data/enquiry';

export type Enquiry = {
  name: string;
  business: string;
  email: string;
  phone: string;
  websiteUrl: string;
  projectTypes: string[];
  budget: string;
  projectStart: string;
  deliveryDeadline: string;
  deliveryDate: string;
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
    projectStart: field('projectStart', 40),
    deliveryDeadline: field('deliveryDeadline', 40),
    deliveryDate: field('deliveryDate', 10, false),
    message: field('message', 3000),
  };

  if (/\r|\n/.test(enquiry.name) || /\r|\n/.test(enquiry.business) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) {
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
  if (!projectStartOptions.includes(enquiry.projectStart as typeof projectStartOptions[number])) throw new Error('Please choose a valid starting point.');
  if (!deliveryOptions.includes(enquiry.deliveryDeadline as typeof deliveryOptions[number])) throw new Error('Please choose a valid delivery timeframe.');
  if (enquiry.deliveryDeadline === 'I have a fixed date' && !enquiry.deliveryDate) throw new Error('Please choose an ideal delivery date.');
  if (enquiry.deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(enquiry.deliveryDate)) throw new Error('Please choose a valid delivery date.');

  return enquiry;
}
