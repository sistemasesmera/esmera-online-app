"use client";

import { FileText, Image, Paperclip, Trash2, Upload, ExternalLink, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteLeadAttachment,
  saveLeadAttachmentMetadata,
} from "@/app/(app)/crm/leads/[id]/attachments-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, type AttachmentWithUrl } from "@/lib/data/attachments.shared";

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function fileIcon(mimeType: string | null) {
  if (!mimeType) return <Paperclip className="h-4 w-4 shrink-0" />;
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 shrink-0 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-red-500" />;
  return <FileText className="h-4 w-4 shrink-0 text-gray-500" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function defaultTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

export function LeadAttachmentsTab({
  leadId,
  attachments: initial,
  canUpload,
  canDelete,
  currentUserName,
}: {
  leadId: string;
  attachments: AttachmentWithUrl[];
  canUpload: boolean;
  canDelete: boolean;
  currentUserName?: string;
}) {
  const [attachments, setAttachments] = useState(initial);
  const [isUploading, startUpload] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de ${MAX_SIZE_MB} MB`);
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    setPendingTitle(defaultTitle(file.name));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleCancelPending() {
    setPendingFile(null);
    setPendingTitle("");
  }

  function handleConfirmUpload() {
    if (!pendingFile) return;
    const file = pendingFile;
    const title = pendingTitle.trim() || defaultTitle(file.name);

    setPendingFile(null);
    setPendingTitle("");

    startUpload(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "";
      const uniqueName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `leads/${leadId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Error al subir: ${uploadError.message}`);
        return;
      }

      const result = await saveLeadAttachmentMetadata(
        leadId,
        filePath,
        file.name,
        file.size,
        file.type || null,
        title
      );

      if (result.error) {
        toast.error(result.error);
        await supabase.storage.from(BUCKET).remove([filePath]);
        return;
      }

      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600);

      setAttachments((prev) => [
        {
          id: crypto.randomUUID(),
          student_id: null,
          lead_id: leadId,
          certificate_id: null,
          enrollment_id: null,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: "",
          created_at: new Date().toISOString(),
          signed_url: urlData?.signedUrl ?? null,
          users: currentUserName ? { full_name: currentUserName } : null,
          title,
        },
        ...prev,
      ]);

      toast.success(`"${title}" subido correctamente`);
    });
  }

  function handleDelete(attachment: AttachmentWithUrl) {
    setDeletingId(attachment.id);
    startUpload(async () => {
      const result = await deleteLeadAttachment(attachment.id, attachment.file_path, leadId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
        toast.success("Adjunto eliminado");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-3">
      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.txt"
          />

          {pendingFile ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
              {fileIcon(pendingFile.type)}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5 truncate">{pendingFile.name}</p>
                <Input
                  autoFocus
                  value={pendingTitle}
                  onChange={(e) => setPendingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleConfirmUpload(); }
                    if (e.key === "Escape") handleCancelPending();
                  }}
                  placeholder="Título del documento…"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" onClick={handleConfirmUpload} disabled={isUploading} className="h-8">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Subir
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelPending} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {isUploading ? "Subiendo…" : "Subir archivo"}
              </Button>
              <span className="text-xs text-muted-foreground">
                PDF, Word, Excel, imágenes — máx. {MAX_SIZE_MB} MB
              </span>
            </div>
          )}
        </>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Sin adjuntos.{canUpload && " Usa el botón para subir el primero."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              {fileIcon(a.mime_type)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.title ?? a.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.file_name !== (a.title ?? a.file_name) && (
                    <span className="mr-1">{a.file_name} ·</span>
                  )}
                  {formatBytes(a.file_size)} ·{" "}
                  {new Date(a.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {a.users?.full_name && (
                    <span className="ml-1">· {a.users.full_name}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {a.signed_url && (
                  <a
                    href={a.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400 px-2 py-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver
                  </a>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={() => handleDelete(a)}
                    disabled={deletingId === a.id || isUploading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
