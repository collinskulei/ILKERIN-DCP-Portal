"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDocumentStatus } from "@/app/actions/documents";

export type ChecklistDocument = {
  id: string;
  status: string;
  owner_tag: string;
  expiry_date: string | null;
  item_name: string;
};

const STATUS_STYLE: Record<string, string> = {
  missing: "bg-zinc-100 text-zinc-600",
  received: "bg-amber-100 text-amber-800",
  verified: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

export function DocumentChecklist({
  applicationId,
  documents,
  locked = false,
}: {
  applicationId: string;
  documents: ChecklistDocument[];
  locked?: boolean;
}) {
  // Optimistic local copy: the checkbox/buttons update this instantly, while
  // the server write and the resulting stage/completion recalculation happen
  // in the background — no waiting on a full page refresh to see the click
  // register. Re-synced whenever the server sends fresh props (e.g. after
  // the background refresh below lands, or on a real page navigation).
  const [localDocs, setLocalDocs] = useState(documents);
  const [prevDocuments, setPrevDocuments] = useState(documents);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // Re-sync from fresh server props (e.g. once the background refresh below
  // lands) without an effect — see https://react.dev/learn/you-might-not-need-an-effect
  if (documents !== prevDocuments) {
    setPrevDocuments(documents);
    setLocalDocs(documents);
  }

  function setStatus(documentId: string, status: string) {
    const previous = localDocs.find((d) => d.id === documentId)?.status;

    setLocalDocs((docs) => docs.map((d) => (d.id === documentId ? { ...d, status } : d)));
    setErrors((e) => ({ ...e, [documentId]: "" }));

    updateDocumentStatus(documentId, applicationId, status).then((result) => {
      if (result?.error) {
        setLocalDocs((docs) =>
          docs.map((d) => (d.id === documentId ? { ...d, status: previous ?? d.status } : d)),
        );
        setErrors((e) => ({ ...e, [documentId]: result.error! }));
        return;
      }
      // Non-blocking: refreshes the page's server-derived numbers (stage
      // label, overall completion %) once the write lands, without making
      // the checkbox itself wait on it.
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-4 py-2 font-medium">Item</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Expiry</th>
            <th className="px-4 py-2 font-medium">Verified</th>
            <th className="px-4 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {localDocs.map((doc) => (
            <tr key={doc.id} className="transition-colors hover:bg-zinc-50">
              <td className="px-4 py-3 text-zinc-900">{doc.item_name}</td>
              <td className="px-4 py-3 text-zinc-600 capitalize">{doc.owner_tag}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize transition-colors ${STATUS_STYLE[doc.status] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {doc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-600">{doc.expiry_date ?? "—"}</td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={doc.status === "verified"}
                  disabled={locked}
                  onChange={() =>
                    setStatus(doc.id, doc.status === "verified" ? "received" : "verified")
                  }
                  className="h-4 w-4 accent-brand disabled:opacity-50"
                  aria-label={`Mark ${doc.item_name} as verified`}
                />
              </td>
              <td className="px-4 py-3">
                {locked ? (
                  <span className="text-xs text-zinc-400">Locked</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      {doc.status !== "received" && doc.status !== "verified" && (
                        <button
                          onClick={() => setStatus(doc.id, "received")}
                          className="text-xs font-medium text-zinc-600 transition-colors hover:text-brand-dark"
                        >
                          Mark received
                        </button>
                      )}
                      {doc.status !== "rejected" && (
                        <button
                          onClick={() => setStatus(doc.id, "rejected")}
                          className="text-xs font-medium text-red-600 transition-colors hover:text-red-800"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                    {errors[doc.id] && (
                      <span className="animate-fade-in text-xs text-red-600">{errors[doc.id]}</span>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {localDocs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500">
                No checklist items for this application.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
