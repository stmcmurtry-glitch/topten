const EMAILJS_SERVICE_ID  = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID  ?? '';
const EMAILJS_PUBLIC_KEY  = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY   ?? '';
const CONTACT_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_CONTACT_TEMPLATE ?? '';
const FEEDBACK_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_FEEDBACK_TEMPLATE ?? '';

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

async function sendTemplate(templateId: string, params: Record<string, string>): Promise<void> {
  const res = await fetch(EMAILJS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: params,
    }),
  });
  if (!res.ok) {
    throw new Error(`EmailJS error ${res.status}`);
  }
}

export async function sendContactEmail(opts: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  await sendTemplate(CONTACT_TEMPLATE_ID, {
    from_name:  opts.name || 'Anonymous',
    from_email: opts.email,
    message:    opts.message,
  });
}

export async function sendFeedbackEmail(opts: {
  rating: number;
  ratingLabel: string;
  message: string;
}): Promise<void> {
  await sendTemplate(FEEDBACK_TEMPLATE_ID, {
    rating:       String(opts.rating),
    rating_label: opts.ratingLabel,
    message:      opts.message || '(no comment)',
  });
}
