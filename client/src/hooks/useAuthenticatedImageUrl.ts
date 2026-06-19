import { useEffect, useState } from "react";
import { apiUrl, getStoredAuthToken } from "@/lib/api-url";

function shouldFetchWithAuth(src?: string): boolean {
  if (!src || /^(data:|blob:)/i.test(src)) return false;

  try {
    const resolved = new URL(apiUrl(src), window.location.origin);
    return resolved.pathname.startsWith("/api/");
  } catch {
    return /^\/?api(?:[/?#]|$)/.test(src);
  }
}

export function useAuthenticatedImageUrl(src?: string): string | undefined {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => (src ? apiUrl(src) : undefined));

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      return;
    }

    const resolved = apiUrl(src);
    if (!shouldFetchWithAuth(src)) {
      setResolvedSrc(resolved);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | undefined;

    const loadImage = async () => {
      const token = getStoredAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        const response = await fetch(resolved, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          setResolvedSrc(resolved);
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      } catch {
        if (!controller.signal.aborted) {
          setResolvedSrc(resolved);
        }
      }
    };

    void loadImage();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return resolvedSrc;
}
