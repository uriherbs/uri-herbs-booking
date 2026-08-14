'use client';

// Embedded Stripe Payment Element — mounted inline under the "Pay
// with Card" selector card in /book's Payment step (not a redirect to
// a hosted Checkout page, so the flow's single-page feel is
// preserved). STRIPE_SECRET_KEY is never here — this only ever talks
// to our own /api/payments/stripe/* routes and Stripe.js.

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createStripePaymentIntent } from '@/lib/payment-service';
import { PaymentErrorBox, PaymentLoadingBox } from './PaymentStatusBoxes';

// loadStripe() should only run once per publishable key — Stripe.js
// itself gets fetched each call, so caching this at module scope (not
// recreating it every render) is the standard pattern.
let stripePromiseCache: { key: string; promise: Promise<StripeJs | null> } | null = null;
function getStripePromise(publishableKey: string) {
  if (stripePromiseCache?.key !== publishableKey) {
    stripePromiseCache = { key: publishableKey, promise: loadStripe(publishableKey) };
  }
  return stripePromiseCache.promise;
}

interface StripeCardFormProps {
  bookingId: string;
  amountLabel: string; // e.g. "฿1,840" — for the submit button text only
  onSuccess: () => void;
}

export function StripeCardForm({ bookingId, amountLabel, onSuccess }: StripeCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setClientSecret(null);
    setPublishableKey(null);
    setLoadError(null);
    createStripePaymentIntent(bookingId)
      .then(({ clientSecret, publishableKey }) => {
        if (cancelled) return;
        setClientSecret(clientSecret);
        setPublishableKey(publishableKey);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || "Couldn't load card payment.");
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loadError) return <PaymentErrorBox message={loadError} style={{ marginTop: 12 }} />;
  if (!clientSecret || !publishableKey) {
    return <PaymentLoadingBox label="Loading card payment…" style={{ marginTop: 12 }} />;
  }

  return (
    <Elements stripe={getStripePromise(publishableKey)} options={{ clientSecret }}>
      <StripeCardFormInner amountLabel={amountLabel} onSuccess={onSuccess} />
    </Elements>
  );
}

function StripeCardFormInner({ amountLabel, onSuccess }: { amountLabel: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Stay in-page for cards that don't need a 3D Secure redirect —
      // Stripe still redirects automatically when a card DOES require
      // it, this just skips the round-trip for the common case.
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Payment is still processing — please wait a moment, or try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <PaymentElement />
      {error && <PaymentErrorBox message={error} style={{ marginTop: 10 }} />}
      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{
          width: '100%',
          marginTop: 14,
          padding: '14px 24px',
          borderRadius: 14,
          border: 'none',
          background: submitting ? '#C8C0B4' : '#6B8F71',
          color: '#fff',
          fontFamily: "'DM Sans'",
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting ? 'default' : 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        {submitting ? 'Processing…' : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}
