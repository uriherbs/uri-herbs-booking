'use client';

// Embedded PayPal Buttons — mounted inline under the "PayPal" selector
// card in /book's Payment step. PAYPAL_SECRET is never here — this
// only ever talks to our own /api/payments/paypal/* routes and
// PayPal's JS SDK.

import { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { getPayPalClientId, createPayPalOrder, capturePayPalOrder } from '@/lib/payment-service';
import { PaymentErrorBox, PaymentLoadingBox } from './PaymentStatusBoxes';

interface PayPalCheckoutButtonsProps {
  bookingId: string;
  onSuccess: () => void;
}

export function PayPalCheckoutButtons({ bookingId, onSuccess }: PayPalCheckoutButtonsProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPayPalClientId()
      .then((id) => {
        if (!cancelled) setClientId(id);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Couldn't load PayPal.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <PaymentErrorBox message={loadError} style={{ marginTop: 12 }} />;
  if (!clientId) return <PaymentLoadingBox label="Loading PayPal…" style={{ marginTop: 12 }} />;

  return (
    <div style={{ marginTop: 12 }}>
      <PayPalScriptProvider options={{ clientId, currency: 'THB', intent: 'capture' }}>
        <PayPalButtons
          style={{ layout: 'vertical', shape: 'pill' }}
          createOrder={async () => {
            setActionError(null);
            try {
              return await createPayPalOrder(bookingId);
            } catch (err: any) {
              setActionError(err.message || "Couldn't start PayPal payment.");
              throw err;
            }
          }}
          onApprove={async (data) => {
            try {
              const { status } = await capturePayPalOrder(bookingId, data.orderID);
              if (status === 'confirmed') {
                onSuccess();
              } else {
                setActionError('Payment could not be confirmed. Please try again or contact us.');
              }
            } catch (err: any) {
              setActionError(err.message || "Payment couldn't be completed.");
            }
          }}
          onError={() => {
            setActionError('PayPal ran into a problem. Please try again.');
          }}
        />
      </PayPalScriptProvider>
      {actionError && <PaymentErrorBox message={actionError} style={{ marginTop: 10 }} />}
    </div>
  );
}
