"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorkdriveFolderUrl } from "@/app/actions/clients";

export function WorkdriveLinkEditor({
  clientId,
  applicationId,
  initialUrl,
}: {
  clientId: string;
  applicationId: string;
  initialUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateWorkdriveFolderUrl(clientId, applicationId, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {initialUrl ? (
          <a
            href={initialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-dark underline transition-colors hover:text-brand"
          >
            Open WorkDrive folder
          </a>
        ) : (
          <span className="text-zinc-400">No WorkDrive folder linked yet</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-700"
        >
          {initialUrl ? "Edit" : "Link folder"}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex items-center gap-2 text-sm">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://workdrive.zoho.com/..."
        className="w-72 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-brand-dark px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-zinc-500 transition-colors hover:text-zinc-700"
      >
        Cancel
      </button>
      {error && <span className="animate-fade-in text-xs text-red-600">{error}</span>}
    </div>
  );
}
