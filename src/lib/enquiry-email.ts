import { createMimeMessage, Mailbox } from 'mimetext';
import type { Enquiry } from './enquiry';

export function buildEnquiryEmail(enquiry: Enquiry, from: string, to: string): string {
  const message = createMimeMessage();
  message.setSender({ name: 'Madhatter website', addr: from });
  message.setRecipient(to);
  message.setHeader(
    'Reply-To',
    new Mailbox({ name: enquiry.name, addr: enquiry.email }),
  );
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
      `Preferred start: ${enquiry.projectStart}`,
      `Ideal delivery: ${enquiry.deliveryDeadline}`,
      `Ideal delivery date: ${enquiry.deliveryDate || 'Not specified'}`,
      '',
      enquiry.message,
    ].join('\n'),
  });

  return message.asRaw();
}
