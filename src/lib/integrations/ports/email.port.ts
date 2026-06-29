export type SendEmailParams = {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
};

export type BulkEmailParams = {
  recipients: Array<{ to: string; variables?: Record<string, string> }>;
  subject: string;
  templateId: string;
};

export interface EmailProviderPort {
  sendEmail(params: SendEmailParams): Promise<void>;
  sendBulk(params: BulkEmailParams): Promise<void>;
}
