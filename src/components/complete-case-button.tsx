"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeCase } from "@/app/actions/cases";

export function CompleteCaseButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (!window.confirm("Mark this case complete? The checklist will be locked from further edits.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await completeCase(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Completing…" : "Licence received — Complete case"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
