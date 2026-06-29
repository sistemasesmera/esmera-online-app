export type SendMessageParams = {
  to: string;
  body: string;
};

export type SendTemplateParams = {
  to: string;
  templateName: string;
  languageCode: string;
  components?: Array<{ type: string; parameters: unknown[] }>;
};

export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface MessagingProviderPort {
  sendMessage(params: SendMessageParams): Promise<string>;
  sendTemplate(params: SendTemplateParams): Promise<string>;
  getMessageStatus(messageId: string): Promise<MessageStatus>;
}
