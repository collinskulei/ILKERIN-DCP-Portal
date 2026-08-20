"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(documentId: string, status: string) {
    startTransition(async () => {
      await updateDocumentStatus(documentId, applicationId, status);
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
            <th className="px-4 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {documents.map((doc) => (
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
                {locked ? (
                  <span className="text-xs text-zinc-400">Locked</span>
                ) : (
                  <div className="flex gap-2">
                    {doc.status !== "received" && (
                      <button
                        disabled={pending}
                        onClick={() => setStatus(doc.id, "received")}
                        className="text-xs font-medium text-zinc-600 transition-colors hover:text-brand-dark disabled:opacity-50"
                      >
                        Mark received
                      </button>
                    )}
                    {doc.status !== "verified" && (
                      <button
                        disabled={pending}
                        onClick={() => setStatus(doc.id, "verified")}
                        className="text-xs font-medium text-green-700 transition-colors hover:text-green-900 disabled:opacity-50"
                      >
                        Verify
                      </button>
                    )}
                    {doc.status !== "rejected" && (
                      <button
                        disabled={pending}
                        onClick={() => setStatus(doc.id, "rejected")}
                        className="text-xs font-medium text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                No checklist items for this application.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
