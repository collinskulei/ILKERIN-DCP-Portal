"use client";

import { useState } from "react";

export function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{label}:</span>
      <code className="max-w-xs truncate rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">{url}</code>
      <button
        onClick={handleCopy}
        className={`text-xs font-medium transition-colors ${copied ? "text-brand" : "text-zinc-600 hover:text-brand-dark"}`}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
