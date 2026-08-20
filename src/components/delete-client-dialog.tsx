"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "@/app/actions/clients";

export function DeleteClientDialog({
  clientId,
  companyName,
}: {
  clientId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const requiredPhrase = `delete ${companyName}`;
  const canDelete = confirmText === requiredPhrase;

  function handleDelete() {
    if (!canDelete) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-red-600 transition-colors hover:text-red-800"
      >
        Delete client
      </button>

      {open && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-red-700">Delete {companyName}</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This permanently deletes the client and everything tied to their case — the
              application, checklist, documents, tasks, and CBK correspondence. This cannot be
              undone.
            </p>
            <p className="mt-3 text-sm text-zinc-700">
              Type <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">{requiredPhrase}</code>{" "}
              to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />

            {error && <p className="animate-fade-in mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
