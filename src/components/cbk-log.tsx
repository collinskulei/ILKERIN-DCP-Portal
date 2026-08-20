"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCbkQuery, markCbkResponded } from "@/app/actions/cbk";

export type CbkEntry = {
  id: string;
  query_text: string;
  received_date: string;
  response_deadline: string | null;
  response_status: string;
  response_text: string | null;
};

function CbkRow({ entry, applicationId, locked }: { entry: CbkEntry; applicationId: string; locked: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond() {
    const responseText = window.prompt("Response summary:");
    if (responseText === null) return;

    startTransition(async () => {
      await markCbkResponded(entry.id, applicationId, responseText);
      router.refresh();
    });
  }

  return (
    <li className="text-zinc-700">
      <p>{entry.query_text}</p>
      <p className="text-xs text-zinc-500">
        Received {entry.received_date} · due {entry.response_deadline ?? "—"} · {entry.response_status}
      </p>
      {entry.response_text && <p className="text-xs text-zinc-600">Response: {entry.response_text}</p>}
      {!locked && entry.response_status !== "responded" && (
        <button
          disabled={pending}
          onClick={respond}
          className="mt-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        >
          Mark responded
        </button>
      )}
    </li>
  );
}

export function CbkLog({
  applicationId,
  entries,
  locked,
}: {
  applicationId: string;
  entries: CbkEntry[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await logCbkQuery(applicationId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      {entries.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <CbkRow key={entry.id} entry={entry} applicationId={applicationId} locked={locked} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No CBK correspondence logged.</p>
      )}

      {!locked && (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
          <textarea
            name="queryText"
            placeholder="What did CBK ask?"
            required
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
          />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-zinc-500">
              Received
              <input
                name="receivedDate"
                type="date"
                className="mt-0.5 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
              />
            </label>
            <label className="flex-1 text-xs text-zinc-500">
              Response due
              <input
                name="responseDeadline"
                type="date"
                className="mt-0.5 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Log query
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
