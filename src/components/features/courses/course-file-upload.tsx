"use client";

import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteCourseDoc, uploadCourseDoc, type CourseDocField } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";

export function CourseFileUpload({
  courseId,
  field,
  label,
  currentUrl,
}: {
  courseId: string;
  field: CourseDocField;
  label: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startUpload(async () => {
      const result = await uploadCourseDoc(courseId, field, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setUrl(result.url);
        toast.success(`${label} subido correctamente`);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteCourseDoc(courseId, field);
      if (result.error) {
        toast.error(result.error);
      } else {
        setUrl(null);
        toast.success(`${label} eliminado`);
      }
    });
  }

  const isPending = isUploading || isDeleting;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {url ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <FileText className="h-4 w-4 text-red-500 shrink-0" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-sm text-primary hover:underline"
          >
            Ver {label.toLowerCase()}
          </a>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Reemplazar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isUploading
            ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            : <Upload className="h-4 w-4 shrink-0" />
          }
          {isUploading ? "Subiendo…" : `Subir ${label.toLowerCase()} (PDF)`}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
