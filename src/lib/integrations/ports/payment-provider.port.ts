/** Puerto para pasarelas de pago (Stripe). Sin adapter implementado todavía. */
export interface PaymentProviderPort {
  createCheckoutSession(input: {
    amount: number;
    currency: string;
    customerEmail: string;
    description: string;
  }): Promise<{ checkoutUrl: string }>;
  getPaymentStatus(input: { paymentId: string }): Promise<{ status: "pending" | "paid" | "failed" }>;
}
