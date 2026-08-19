"use client";

import { useRef, useState, useTransition } from "react";
import { addClient } from "@/app/actions/clients";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await addClient({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        + Add client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Add client</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-600"
              >
                Close
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="companyName" className="text-sm font-medium text-zinc-700">
                  Company name
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="stage" className="text-sm font-medium text-zinc-700">
                  Starting stage — the work to be done
                </label>
                <select
                  id="stage"
                  name="stage"
                  defaultValue="stage_1"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                >
                  <option value="stage_1">Stage 1 — Approval of Name</option>
                  <option value="stage_2">Stage 2 — Application for Licence</option>
                  <option value="stage_3">Stage 3 — Data Submission & Licensing</option>
                </select>
                <p className="text-xs text-zinc-500">
                  The full document checklist for this stage is created automatically.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add client"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
