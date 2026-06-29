export type CreatePaymentLinkParams = {
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentInfo = {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  paidAt: Date | null;
};

export interface PaymentProviderPort {
  createPaymentLink(params: CreatePaymentLinkParams): Promise<string>;
  getPaymentStatus(paymentId: string): Promise<PaymentInfo>;
  refundPayment(paymentId: string): Promise<void>;
}
