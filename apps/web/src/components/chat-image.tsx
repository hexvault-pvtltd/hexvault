"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ChatImage({ fileId, filename }: { fileId: string; filename: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/v1/files/${fileId}/download`, { cache: "no-store" }).then(async response => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Image is unavailable.");
      if (active) setUrl(body.data.url as string);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [fileId]);
  if (error) return <span className="mt-2 block rounded-lg bg-black/10 px-3 py-2 text-[10px]">Image unavailable</span>;
  if (!url) return <span className="mt-2 block h-24 w-48 animate-pulse rounded-lg bg-black/10" aria-label="Loading image"/>;
  return <a href={url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg"><Image src={url} alt={filename} width={720} height={540} unoptimized className="max-h-72 max-w-full object-contain"/></a>;
}
