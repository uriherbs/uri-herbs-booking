// ============================================================
// src/lib/legal-content.ts
// ============================================================
// SINGLE SOURCE OF TRUTH for the Terms & Conditions and Privacy
// Policy text. Deliberately plain data (no JSX, no React import) so
// it's safe to import from anywhere that needs it:
//   - /terms, /privacy (the standalone pages)
//   - the in-page modal opened from /book's checkout
//   - the PDF-generation API route (runs server-side, renders with
//     @react-pdf/renderer's own primitives, not HTML)
//
// This is the whole point of the block/run structure below rather
// than writing the content as JSX once and duplicating it: every
// surface renders THIS data, so there is exactly one place to edit
// the actual legal text, and the PDF can never drift out of sync
// with the page (or vice versa) — it's generated from this same
// object on every request, not a separately maintained file.
// ============================================================

// A "run" is a span of text, optionally a link. Kept intentionally
// tiny (just enough for this content — mailto:/tel:/https: links
// inside otherwise-plain sentences) rather than a full rich-text
// schema, since that's all either document actually needs.
export type LegalRun = string | { text: string; href: string };

export type LegalBlock =
  | { type: 'paragraph'; runs: LegalRun[] }
  | { type: 'list'; items: LegalRun[][] }
  | { type: 'contact'; email: string; phone: string; address?: string };

export interface LegalSection {
  id: string;
  number: number;
  heading: string;
  blocks: LegalBlock[];
}

export type LegalDocSlug = 'terms' | 'privacy';

export interface LegalDoc {
  slug: LegalDocSlug;
  title: string;
  effectiveDate: string;
  pdfFilename: string;
  sections: LegalSection[];
}

export const SHOP_NAME = 'Uri Herbs Workshop';
export const SHOP_EMAIL = 'uherbhouse@gmail.com';
export const SHOP_PHONE = '+66 64 334 9890';
export const SHOP_ADDRESS = '44, 3 Si Phum Soi 9, Old City, Tambon Si Phum, Mueang, Chiang Mai 50200, Thailand';

const EFFECTIVE_DATE = 'August 17, 2026';

export const termsDoc: LegalDoc = {
  slug: 'terms',
  title: 'Terms & Conditions',
  effectiveDate: EFFECTIVE_DATE,
  pdfFilename: 'uri-herbs-terms-and-conditions.pdf',
  sections: [
    {
      id: 'about', number: 1, heading: 'About These Terms',
      blocks: [
        { type: 'paragraph', runs: [
          'These Terms & Conditions ("Terms") govern all bookings made through uriherbs.com for workshops ' +
          'operated by ZIGI Co. ("Uri Herbs Workshop," "we," "us," "our"), located in the Old City, Chiang Mai, ' +
          'Thailand. By completing a booking, you ("customer," "you") agree to these Terms.',
        ] },
      ],
    },
    {
      id: 'bookings', number: 2, heading: 'Bookings',
      blocks: [
        { type: 'list', items: [
          ['All bookings are subject to availability and confirmation.'],
          ['A booking is only confirmed once payment has been verified (for online payments) or once your reservation is accepted for "Pay on Arrival" bookings.'],
          ['You are responsible for providing accurate contact information, participant count, and any allergy/health information at the time of booking.'],
        ] },
      ],
    },
    {
      id: 'pricing', number: 3, heading: 'Pricing & Payment',
      blocks: [
        { type: 'list', items: [
          ['Prices are listed in THB (Thai Baht) and include workshop materials unless stated otherwise.'],
          ['Payment can be made online at the time of booking (via Stripe or PayPal) or in person at the workshop location ("Pay on Arrival").'],
          ['Private and group bookings follow minimum-charge pricing as displayed at checkout, based on number of participants.'],
        ] },
      ],
    },
    {
      id: 'cancellation', number: 4, heading: 'Cancellation & Refund Policy',
      blocks: [
        { type: 'list', items: [
          ['Cancellations made 48 hours or more before your scheduled workshop time are eligible for a full refund.'],
          ['Cancellations made less than 48 hours before your scheduled workshop time are not eligible for a refund.'],
          ['No-shows (failure to attend without prior cancellation) are not eligible for a refund.'],
          [
            'To cancel a booking, please contact us at ',
            { text: SHOP_PHONE, href: `tel:${SHOP_PHONE.replace(/\s/g, '')}` },
            ' (WhatsApp/phone) or ',
            { text: SHOP_EMAIL, href: `mailto:${SHOP_EMAIL}` },
            ' as early as possible.',
          ],
          ['Refunds for eligible cancellations are processed manually and may take 5–10 business days (to be confirmed based on actual Stripe/PayPal processing times) to appear on your original payment method.'],
          ['If Uri Herbs Workshop cancels or reschedules a session (e.g., due to insufficient participants, instructor unavailability, or unforeseen circumstances), you will receive a full refund or the option to reschedule, at your choice.'],
        ] },
      ],
    },
    {
      id: 'age-policy', number: 5, heading: 'Age Policy',
      blocks: [
        { type: 'paragraph', runs: [
          'Our workshops are a hands-on, family-friendly experience designed for participants of all ages who ' +
          'can safely engage in the activity. This is not a childcare service — children must be accompanied ' +
          'and supervised by a participating adult at all times.',
        ] },
      ],
    },
    {
      id: 'health', number: 6, heading: 'Health & Allergies',
      blocks: [
        { type: 'list', items: [
          ['You are responsible for informing us of any allergies, sensitivities, or medical conditions relevant to handling herbs, essential oils, or skincare ingredients, prior to the workshop.'],
          ['Uri Herbs Workshop is not liable for allergic reactions or health issues arising from undisclosed conditions.'],
          ['Participation in hands-on activities (e.g., herbal massage ball making, aromatherapy blending) is at your own discretion and risk.'],
        ] },
      ],
    },
    {
      id: 'conduct', number: 7, heading: 'Conduct & Right to Refuse Service',
      blocks: [
        { type: 'paragraph', runs: [
          'We reserve the right to refuse or end participation for any customer whose behavior is disruptive, ' +
          'unsafe, or disrespectful toward staff or other participants, without refund in such cases.',
        ] },
      ],
    },
    {
      id: 'ip', number: 8, heading: 'Intellectual Property',
      blocks: [
        { type: 'paragraph', runs: [
          'Recipes, techniques, and instructional content shared during the workshop are for personal use only ' +
          'and may not be reproduced or used for commercial purposes without written permission.',
        ] },
      ],
    },
    {
      id: 'media', number: 9, heading: 'Photography & Media',
      blocks: [
        { type: 'paragraph', runs: [
          'Uri Herbs Workshop may take photographs or videos during sessions for marketing purposes (e.g., ' +
          'social media, website). If you do not wish to be photographed, please inform your instructor at ' +
          'the start of the session.',
        ] },
      ],
    },
    {
      id: 'liability', number: 10, heading: 'Limitation of Liability',
      blocks: [
        { type: 'paragraph', runs: [
          'To the extent permitted by Thai law, Uri Herbs Workshop / ZIGI Co. is not liable for indirect, ' +
          'incidental, or consequential damages arising from participation in a workshop, except where such ' +
          'liability cannot be excluded by law.',
        ] },
      ],
    },
    {
      id: 'governing-law', number: 11, heading: 'Governing Law',
      blocks: [
        { type: 'paragraph', runs: ['These Terms are governed by the laws of the Kingdom of Thailand.'] },
      ],
    },
    {
      id: 'contact', number: 12, heading: 'Contact',
      blocks: [
        { type: 'paragraph', runs: ['For questions about these Terms, contact us at:'] },
        { type: 'contact', email: SHOP_EMAIL, phone: SHOP_PHONE, address: SHOP_ADDRESS },
      ],
    },
  ],
};

export const privacyDoc: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE_DATE,
  pdfFilename: 'uri-herbs-privacy-policy.pdf',
  sections: [
    {
      id: 'who-we-are', number: 1, heading: 'Who We Are',
      blocks: [
        { type: 'paragraph', runs: [
          "Uri Herbs Workshop is operated by ZIGI Co., based in Chiang Mai, Thailand. This policy explains how " +
          "we collect, use, and protect your personal data in accordance with Thailand's Personal Data " +
          "Protection Act (PDPA).",
        ] },
      ],
    },
    {
      id: 'what-we-collect', number: 2, heading: 'What Information We Collect',
      blocks: [
        { type: 'paragraph', runs: ['When you make a booking, we collect:'] },
        { type: 'list', items: [
          ['Name, email address, phone number'],
          ['Number of participants, workshop selection, preferred date/time'],
          ['Allergy or health information you choose to share (only if relevant to workshop safety)'],
          ['Payment information (processed securely by Stripe/PayPal — we do not store your full card details)'],
        ] },
      ],
    },
    {
      id: 'how-we-use', number: 3, heading: 'How We Use Your Information',
      blocks: [
        { type: 'paragraph', runs: ['We use your information to:'] },
        { type: 'list', items: [
          ['Confirm and manage your booking'],
          ['Communicate with you about your reservation (confirmations, reminders, changes)'],
          ['Process payments and refunds'],
          ['Improve our services'],
          ['With your separate consent, send you marketing communications (e.g., promotions, newsletters)'],
        ] },
      ],
    },
    {
      id: 'payment-processing', number: 4, heading: 'Payment Processing',
      blocks: [
        { type: 'paragraph', runs: [
          'Payments are processed by Stripe and/or PayPal. We do not store your full credit card number. ' +
          'Please refer to ',
          { text: "Stripe's Privacy Policy", href: 'https://stripe.com/privacy' },
          ' and ',
          { text: "PayPal's Privacy Policy", href: 'https://www.paypal.com/us/legalhub/privacy-full' },
          ' for how they handle your payment data.',
        ] },
      ],
    },
    {
      id: 'data-sharing', number: 5, heading: 'Data Sharing',
      blocks: [
        { type: 'paragraph', runs: ['We do not sell your personal data. We may share your information with:'] },
        { type: 'list', items: [
          ['Payment processors (Stripe, PayPal) to complete transactions'],
          ['Service providers who help us operate our booking system (e.g., hosting providers)'],
          ['Legal authorities, if required by law'],
        ] },
      ],
    },
    {
      id: 'data-retention', number: 6, heading: 'Data Retention',
      blocks: [
        { type: 'paragraph', runs: [
          'We retain booking information for 5 years (recommended default — please confirm with your ' +
          'accountant for Thai record-keeping requirements) to comply with accounting and legal obligations, ' +
          'after which it is deleted or anonymized.',
        ] },
      ],
    },
    {
      id: 'your-rights', number: 7, heading: 'Your Rights',
      blocks: [
        { type: 'paragraph', runs: ["Under Thailand's PDPA, you have the right to:"] },
        { type: 'list', items: [
          ['Access the personal data we hold about you'],
          ['Request correction of inaccurate data'],
          ['Request deletion of your data (subject to legal retention requirements)'],
          ['Withdraw consent for marketing communications at any time'],
        ] },
        { type: 'paragraph', runs: [
          'To exercise these rights, contact us at ',
          { text: SHOP_EMAIL, href: `mailto:${SHOP_EMAIL}` },
          '.',
        ] },
      ],
    },
    {
      id: 'data-security', number: 8, heading: 'Data Security',
      blocks: [
        { type: 'paragraph', runs: [
          'We use industry-standard security measures (encrypted connections, secure payment processors) to ' +
          'protect your information. However, no method of transmission over the internet is 100% secure.',
        ] },
      ],
    },
    {
      id: 'cookies', number: 9, heading: 'Cookies & Analytics',
      blocks: [
        { type: 'paragraph', runs: [
          'We use Google Analytics to understand how visitors use our website (e.g., number of visitors, ' +
          'pages viewed, general location, time spent on the site). This helps us improve our website and ' +
          'services. Google Analytics uses cookies to collect this information. You can control or delete ' +
          'cookies through your browser settings, though this may affect some site functionality.',
        ] },
        { type: 'paragraph', runs: [
          'We do not currently use Facebook/Meta Pixel or other advertising tracking tools on this site. If ' +
          'this changes in the future, we will update this policy accordingly.',
        ] },
        { type: 'paragraph', runs: [
          'For more on how Google handles data collected via Analytics, see ',
          { text: "Google's Privacy Policy", href: 'https://policies.google.com/privacy' },
          '.',
        ] },
      ],
    },
    {
      id: 'changes', number: 10, heading: 'Changes to This Policy',
      blocks: [
        { type: 'paragraph', runs: [
          'We may update this Privacy Policy from time to time. Changes will be posted on this page with an ' +
          'updated effective date.',
        ] },
      ],
    },
    {
      id: 'contact', number: 11, heading: 'Contact',
      blocks: [
        { type: 'paragraph', runs: ['For privacy-related questions or requests:'] },
        { type: 'contact', email: SHOP_EMAIL, phone: SHOP_PHONE },
      ],
    },
  ],
};

export const legalDocs: Record<LegalDocSlug, LegalDoc> = {
  terms: termsDoc,
  privacy: privacyDoc,
};

export function otherDoc(slug: LegalDocSlug): LegalDoc {
  return slug === 'terms' ? privacyDoc : termsDoc;
}
