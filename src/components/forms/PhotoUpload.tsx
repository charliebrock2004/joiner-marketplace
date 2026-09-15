"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ACCEPTED_EXTENSIONS, MAX_FILES, MAX_FILE_BYTES } from "@/lib/security/uploads";

/**
 * Photo picker with local previews.
 *
 * Client-side checks here are a convenience only — the server re-validates
 * every file by inspecting its magic bytes.
 */
export function PhotoUpload({
  files,
  onChange,
  error,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Previews are derived from the selected files, then revoked once the
  // selection changes or the component unmounts so blobs are not leaked.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setLocalError(null);

    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        setLocalError(`You can add up to ${MAX_FILES} photos`);
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setLocalError(`"${file.name}" is over ${MAX_FILE_BYTES / (1024 * 1024)}MB`);
        continue;
      }
      next.push(file);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  const message = error ?? localError;

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-ink">
        Photos <span className="ml-1 font-normal text-muted">(optional)</span>
      </span>
      <p className="text-sm text-muted">
        A photo of the door, the wall or the flat-pack box saves a lot of back and forth.
      </p>

      {previews.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 pt-1">
          {previews.map((src, index) => (
            <li key={src} className="relative aspect-square">
              {/* Local blob preview — next/image adds no value for object URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Photo ${index + 1}`}
                className="size-full rounded-xl border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-white"
                aria-label={`Remove photo ${index + 1}`}
              >
                <Icon name="close" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length < MAX_FILES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white px-4 py-4 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
        >
          <Icon name="plus" className="size-4" />
          {files.length === 0 ? "Add photos" : "Add another photo"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        name="photos"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        multiple
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />

      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
