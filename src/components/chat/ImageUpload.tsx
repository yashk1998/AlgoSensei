'use client';

import { useRef, useState, useCallback } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageAttachment {
  id: string;
  base64: string;      // data:image/...;base64,...
  name: string;
  size: number;
}

interface ImageUploadProps {
  attachments: ImageAttachment[];
  onAttach: (images: ImageAttachment[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ attachments, onAttach, onRemove, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    const newAttachments: ImageAttachment[] = await Promise.all(
      validFiles.map(async (file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        base64: await fileToBase64(file),
        name: file.name,
        size: file.size,
      }))
    );

    if (newAttachments.length > 0) {
      onAttach(newAttachments);
    }
  }, [onAttach]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  }, [disabled, processFiles]);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "rounded-full p-1.5 text-gray-400 transition-colors hover:text-indigo-600 hover:bg-indigo-50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title="Attach image (problem screenshot, whiteboard, diagram)"
      >
        <ImagePlus size={18} />
      </button>

      {/* Thumbnail previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-3 pb-2">
          {attachments.map((img) => (
            <div key={img.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.base64}
                alt={img.name}
                className="h-16 w-16 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Hook to handle paste-to-upload on the document level.
 * Attach to the chat container or use in ChatInterface.
 */
export function useImagePaste(
  onAttach: (images: ImageAttachment[]) => void,
  disabled?: boolean
) {
  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(f => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE);

    const newAttachments: ImageAttachment[] = await Promise.all(
      validFiles.map(async (file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        base64: await fileToBase64(file),
        name: file.name,
        size: file.size,
      }))
    );

    if (newAttachments.length > 0) {
      onAttach(newAttachments);
    }
  }, [onAttach]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  }, [disabled, processFiles]);

  return { handlePaste };
}
