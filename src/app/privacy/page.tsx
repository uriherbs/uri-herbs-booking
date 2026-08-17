import type { Metadata } from 'next';
import LegalPageLayout, { ContactCard, type LegalSection } from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Uri Herbs Workshop',
  description: 'How Uri Herbs Workshop collects, uses, and protects your personal data, in line with Thailand’s PDPA.',
};

const SHOP_EMAIL = 'uherbhouse@gmail.com';
const SHOP_PHONE = '+66 64 334 9890';

const sections: LegalSection[] = [
  {
    id: 'who-we-are', number: 1, heading: 'Who We Are',
    body: (
      <p>
        Uri Herbs Workshop is operated by ZIGI Co., based in Chiang Mai, Thailand. This policy explains how
        we collect, use, and protect your personal data in accordance with Thailand's Personal Data
        Protection Act (PDPA).
      </p>
    ),
  },
  {
    id: 'what-we-collect', number: 2, heading: 'What Information We Collect',
    body: (
      <>
        <p>When you make a booking, we collect:</p>
        <ul>
          <li>Name, email address, phone number</li>
          <li>Number of participants, workshop selection, preferred date/time</li>
          <li>Allergy or health information you choose to share (only if relevant to workshop safety)</li>
          <li>Payment information (processed securely by Stripe/PayPal — we do not store your full card details)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use', number: 3, heading: 'How We Use Your Information',
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>Confirm and manage your booking</li>
          <li>Communicate with you about your reservation (confirmations, reminders, changes)</li>
          <li>Process payments and refunds</li>
          <li>Improve our services</li>
          <li>With your separate consent, send you marketing communications (e.g., promotions, newsletters)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payment-processing', number: 4, heading: 'Payment Processing',
    body: (
      <p>
        Payments are processed by Stripe and/or PayPal. We do not store your full credit card number.
        Please refer to{' '}
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>
        {' '}and{' '}
        <a href="https://www.paypal.com/us/legalhub/privacy-full" target="_blank" rel="noopener noreferrer">PayPal's Privacy Policy</a>
        {' '}for how they handle your payment data.
      </p>
    ),
  },
  {
    id: 'data-sharing', number: 5, heading: 'Data Sharing',
    body: (
      <>
        <p>We do not sell your personal data. We may share your information with:</p>
        <ul>
          <li>Payment processors (Stripe, PayPal) to complete transactions</li>
          <li>Service providers who help us operate our booking system (e.g., hosting providers)</li>
          <li>Legal authorities, if required by law</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-retention', number: 6, heading: 'Data Retention',
    body: (
      <p>
        We retain booking information for 5 years (recommended default — please confirm with your
        accountant for Thai record-keeping requirements) to comply with accounting and legal obligations,
        after which it is deleted or anonymized.
      </p>
    ),
  },
  {
    id: 'your-rights', number: 7, heading: 'Your Rights',
    body: (
      <>
        <p>Under Thailand's PDPA, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Withdraw consent for marketing communications at any time</li>
        </ul>
        <p>To exercise these rights, contact us at <a href={`mailto:${SHOP_EMAIL}`}>{SHOP_EMAIL}</a>.</p>
      </>
    ),
  },
  {
    id: 'data-security', number: 8, heading: 'Data Security',
    body: (
      <p>
        We use industry-standard security measures (encrypted connections, secure payment processors) to
        protect your information. However, no method of transmission over the internet is 100% secure.
      </p>
    ),
  },
  {
    id: 'cookies', number: 9, heading: 'Cookies & Analytics',
    body: (
      <>
        <p>
          We use Google Analytics to understand how visitors use our website (e.g., number of visitors,
          pages viewed, general location, time spent on the site). This helps us improve our website and
          services. Google Analytics uses cookies to collect this information. You can control or delete
          cookies through your browser settings, though this may affect some site functionality.
        </p>
        <p>
          We do not currently use Facebook/Meta Pixel or other advertising tracking tools on this site. If
          this changes in the future, we will update this policy accordingly.
        </p>
        <p>
          For more on how Google handles data collected via Analytics, see{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: 'changes', number: 10, heading: 'Changes to This Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page with an
        updated effective date.
      </p>
    ),
  },
  {
    id: 'contact', number: 11, heading: 'Contact',
    body: (
      <>
        <p>For privacy-related questions or requests:</p>
        <ContactCard email={SHOP_EMAIL} phone={SHOP_PHONE} />
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      effectiveDate="August 17, 2026"
      sections={sections}
      otherPageHref="/terms"
      otherPageLabel="Terms & Conditions"
    />
  );
}
