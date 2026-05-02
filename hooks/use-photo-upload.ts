"use client";

import { useCallback, useState } from "react";
import { resizeForUpload } from "@/lib/image-resize";

type UploadResult = { ok: boolean; error?: string };

export type PhotoUploadOptions = {
  upload: (file: File) => Promise<UploadResult>;
  concurrency?: number;
  retries?: number;
};

export type UploadState = {
  pending: boolean;
  total: number;
  done: number;
  error: string | null;
};

export function usePhotoUpload({
  upload,
  concurrency = 3,
  retries = 1,
}: PhotoUploadOptions) {
  const [state, setState] = useState<UploadState>({
    pending: false,
    total: 0,
    done: 0,
    error: null,
  });

  const start = useCallback(
    async (filesIn: FileList | File[] | null) => {
      const files = filesIn ? Array.from(filesIn) : [];
      if (files.length === 0) return;

      setState({ pending: true, total: files.length, done: 0, error: null });

      let cursor = 0;
      let firstError: string | null = null;
      let completed = 0;

      const uploadOne = async (file: File): Promise<void> => {
        let resized: File;
        try {
          resized = await resizeForUpload(file);
        } catch {
          resized = file;
        }
        let lastErr: string | undefined;
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const r = await upload(resized);
            if (r.ok) return;
            lastErr = r.error ?? "yüklenmedi";
          } catch (e) {
            lastErr = (e as Error).message;
          }
        }
        if (lastErr && !firstError) firstError = lastErr;
      };

      const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
        while (cursor < files.length) {
          const i = cursor++;
          await uploadOne(files[i]);
          completed++;
          setState((s) => ({ ...s, done: completed }));
        }
      });
      await Promise.all(workers);

      setState({
        pending: false,
        total: files.length,
        done: completed,
        error: firstError,
      });
    },
    [upload, concurrency, retries]
  );

  const reset = useCallback(() => {
    setState({ pending: false, total: 0, done: 0, error: null });
  }, []);

  return { state, start, reset };
}
