export type SignatureRequestParams = {
  documentUrl: string;
  signerEmail: string;
  signerName: string;
  subject: string;
  message?: string;
};

export type SignatureStatus = "pending" | "signed" | "declined" | "expired";

export type SignatureInfo = {
  requestId: string;
  status: SignatureStatus;
  signedAt: Date | null;
  signedDocumentUrl: string | null;
};

export interface ESignatureProviderPort {
  createSignatureRequest(params: SignatureRequestParams): Promise<string>;
  getSignatureStatus(requestId: string): Promise<SignatureInfo>;
  cancelRequest(requestId: string): Promise<void>;
}
