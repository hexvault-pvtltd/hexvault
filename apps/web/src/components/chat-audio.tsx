"use client";

import { useEffect, useState } from "react";

export function ChatAudio({ fileId, filename }: { fileId: string; filename: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/files/${fileId}/download`, { cache: "no-store" })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message ?? "Voice message is unavailable.");
        if (active) setUrl(body.data.url as string);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [fileId]);

  if (error) return <span className="mt-2 block rounded-lg bg-black/10 px-3 py-2 text-[10px]">Voice message unavailable</span>;
  if (!url) return <span className="mt-2 block h-10 w-56 max-w-full animate-pulse rounded-lg bg-black/10" aria-label="Loading voice message"/>;
  return <audio className="mt-2 block h-10 w-64 max-w-full" controls preload="metadata" src={url} aria-label={`Voice message: ${filename}`}/>;
}
