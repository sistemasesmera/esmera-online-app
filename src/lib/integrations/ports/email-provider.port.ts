/** Puerto para envío de email transaccional. Sin adapter implementado todavía. */
export interface EmailProviderPort {
  sendEmail(input: { to: string; subject: string; html: string }): Promise<void>;
}
