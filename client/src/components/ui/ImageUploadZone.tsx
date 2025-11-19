"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface ImageUploadZoneProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  label?: string;
  description?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageUploadZone({
  value = [],
  onChange,
  maxFiles = 20,
  accept = { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  label,
  description,
  error,
  className,
  disabled = false,
}: ImageUploadZoneProps) {
  const [uploading, setUploading] = React.useState<string[]>([]);

  const uploadMutation = trpc.upload.image.useMutation({
    onSuccess: (data: { url: string; key: string }, variables) => {
      const newUrls = [...value, data.url];
      onChange(newUrls);
      setUploading((prev) => prev.filter((id) => id !== variables.filename));
      toast.success("Image uploaded successfully", {
        duration: 2000, // Auto-dismiss after 2 seconds
      });
    },
    onError: (error: any, variables) => {
      toast.error(error.message || "Failed to upload image", {
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      setUploading((prev) => prev.filter((id) => id !== variables.filename));
    },
  });

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const filesToUpload = acceptedFiles.slice(0, maxFiles - value.length);
      
      if (filesToUpload.length === 0) {
        toast.error(`Maximum ${maxFiles} images allowed`);
        return;
      }

      for (const file of filesToUpload) {
        // Validate file size (5MB max)
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 5) {
          toast.error(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        setUploading((prev) => [...prev, file.name]);

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await uploadMutation.mutateAsync({
            filename: file.name,
            contentType: file.type,
            data: base64,
          });
        };
        reader.onerror = () => {
          toast.error(`Failed to read ${file.name}`);
          setUploading((prev) => prev.filter((name) => name !== file.name));
        };
        reader.readAsDataURL(file);
      }
    },
    [value.length, maxFiles, uploadMutation]
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    onDrop(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onDrop(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
          (value.length >= maxFiles || disabled) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(accept).join(",")}
          onChange={handleFileSelect}
          disabled={value.length >= maxFiles || disabled}
          className="hidden"
        />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop images here"
            : `Drag & drop images here, or click to select`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {value.length} / {maxFiles} images
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4 animate-pulse" />
          Uploading {uploading.length} image{uploading.length > 1 ? "s" : ""}...
        </div>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

