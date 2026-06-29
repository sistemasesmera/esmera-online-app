/** Puerto para firma electrónica de contratos. Sin adapter implementado todavía. */
export interface ESignatureProviderPort {
  sendForSignature(input: {
    documentUrl: string;
    signerEmail: string;
    signerName: string;
  }): Promise<{ envelopeId: string }>;
  getSignatureStatus(input: { envelopeId: string }): Promise<{ status: "sent" | "signed" | "declined" }>;
}
