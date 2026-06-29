/** Puerto para mensajería (WhatsApp), ligado a tutor_followups.contact_type='whatsapp'. Sin adapter todavía. */
export interface MessagingProviderPort {
  sendMessage(input: { toPhone: string; message: string }): Promise<{ messageId: string }>;
}
