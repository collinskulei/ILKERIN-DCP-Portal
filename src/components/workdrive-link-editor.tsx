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
            className="text-zinc-700 underline hover:text-zinc-900"
          >
            Open WorkDrive folder
          </a>
        ) : (
          <span className="text-zinc-400">No WorkDrive folder linked yet</span>
        )}
        <button onClick={() => setEditing(true)} className="text-xs text-zinc-500 hover:text-zinc-700">
          {initialUrl ? "Edit" : "Link folder"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://workdrive.zoho.com/..."
        className="w-72 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
      />
      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-zinc-700">
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
