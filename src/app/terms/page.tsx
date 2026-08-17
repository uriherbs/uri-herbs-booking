import type { Metadata } from 'next';
import LegalPageLayout, { ContactCard, type LegalSection } from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Uri Herbs Workshop',
  description: 'Booking, payment, cancellation, and refund terms for Uri Herbs Workshop, Chiang Mai.',
};

const SHOP_EMAIL = 'uherbhouse@gmail.com';
const SHOP_PHONE = '+66 64 334 9890';
const SHOP_ADDRESS = '44, 3 Si Phum Soi 9, Old City, Tambon Si Phum, Mueang, Chiang Mai 50200, Thailand';

const sections: LegalSection[] = [
  {
    id: 'about', number: 1, heading: 'About These Terms',
    body: (
      <p>
        These Terms &amp; Conditions ("Terms") govern all bookings made through uriherbs.com for workshops
        operated by ZIGI Co. ("Uri Herbs Workshop," "we," "us," "our"), located in the Old City, Chiang Mai,
        Thailand. By completing a booking, you ("customer," "you") agree to these Terms.
      </p>
    ),
  },
  {
    id: 'bookings', number: 2, heading: 'Bookings',
    body: (
      <ul>
        <li>All bookings are subject to availability and confirmation.</li>
        <li>A booking is only confirmed once payment has been verified (for online payments) or once your reservation is accepted for "Pay on Arrival" bookings.</li>
        <li>You are responsible for providing accurate contact information, participant count, and any allergy/health information at the time of booking.</li>
      </ul>
    ),
  },
  {
    id: 'pricing', number: 3, heading: 'Pricing & Payment',
    body: (
      <ul>
        <li>Prices are listed in THB (Thai Baht) and include workshop materials unless stated otherwise.</li>
        <li>Payment can be made online at the time of booking (via Stripe or PayPal) or in person at the workshop location ("Pay on Arrival").</li>
        <li>Private and group bookings follow minimum-charge pricing as displayed at checkout, based on number of participants.</li>
      </ul>
    ),
  },
  {
    id: 'cancellation', number: 4, heading: 'Cancellation & Refund Policy',
    body: (
      <ul>
        <li>Cancellations made 48 hours or more before your scheduled workshop time are eligible for a full refund.</li>
        <li>Cancellations made less than 48 hours before your scheduled workshop time are not eligible for a refund.</li>
        <li>No-shows (failure to attend without prior cancellation) are not eligible for a refund.</li>
        <li>To cancel a booking, please contact us at <a href={`tel:${SHOP_PHONE.replace(/\s/g, '')}`}>{SHOP_PHONE}</a> (WhatsApp/phone) or <a href={`mailto:${SHOP_EMAIL}`}>{SHOP_EMAIL}</a> as early as possible.</li>
        <li>Refunds for eligible cancellations are processed manually and may take 5–10 business days (to be confirmed based on actual Stripe/PayPal processing times) to appear on your original payment method.</li>
        <li>If Uri Herbs Workshop cancels or reschedules a session (e.g., due to insufficient participants, instructor unavailability, or unforeseen circumstances), you will receive a full refund or the option to reschedule, at your choice.</li>
      </ul>
    ),
  },
  {
    id: 'age-policy', number: 5, heading: 'Age Policy',
    body: (
      <p>
        Our workshops are a hands-on, family-friendly experience designed for participants of all ages who
        can safely engage in the activity. This is not a childcare service — children must be accompanied
        and supervised by a participating adult at all times.
      </p>
    ),
  },
  {
    id: 'health', number: 6, heading: 'Health & Allergies',
    body: (
      <ul>
        <li>You are responsible for informing us of any allergies, sensitivities, or medical conditions relevant to handling herbs, essential oils, or skincare ingredients, prior to the workshop.</li>
        <li>Uri Herbs Workshop is not liable for allergic reactions or health issues arising from undisclosed conditions.</li>
        <li>Participation in hands-on activities (e.g., herbal massage ball making, aromatherapy blending) is at your own discretion and risk.</li>
      </ul>
    ),
  },
  {
    id: 'conduct', number: 7, heading: 'Conduct & Right to Refuse Service',
    body: (
      <p>
        We reserve the right to refuse or end participation for any customer whose behavior is disruptive,
        unsafe, or disrespectful toward staff or other participants, without refund in such cases.
      </p>
    ),
  },
  {
    id: 'ip', number: 8, heading: 'Intellectual Property',
    body: (
      <p>
        Recipes, techniques, and instructional content shared during the workshop are for personal use only
        and may not be reproduced or used for commercial purposes without written permission.
      </p>
    ),
  },
  {
    id: 'media', number: 9, heading: 'Photography & Media',
    body: (
      <p>
        Uri Herbs Workshop may take photographs or videos during sessions for marketing purposes (e.g.,
        social media, website). If you do not wish to be photographed, please inform your instructor at
        the start of the session.
      </p>
    ),
  },
  {
    id: 'liability', number: 10, heading: 'Limitation of Liability',
    body: (
      <p>
        To the extent permitted by Thai law, Uri Herbs Workshop / ZIGI Co. is not liable for indirect,
        incidental, or consequential damages arising from participation in a workshop, except where such
        liability cannot be excluded by law.
      </p>
    ),
  },
  {
    id: 'governing-law', number: 11, heading: 'Governing Law',
    body: <p>These Terms are governed by the laws of the Kingdom of Thailand.</p>,
  },
  {
    id: 'contact', number: 12, heading: 'Contact',
    body: (
      <>
        <p>For questions about these Terms, contact us at:</p>
        <ContactCard email={SHOP_EMAIL} phone={SHOP_PHONE} address={SHOP_ADDRESS} />
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      effectiveDate="August 17, 2026"
      sections={sections}
      otherPageHref="/privacy"
      otherPageLabel="Privacy Policy"
    />
  );
}
