import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentChecklist, type ChecklistDocument } from "@/components/document-checklist";
import { WorkdriveLinkEditor } from "@/components/workdrive-link-editor";
import { CopyLink } from "@/components/copy-link";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1 — Approval of Name",
  stage_2: "Stage 2 — Application for Licence",
  stage_3: "Stage 3 — Data Submission & Licensing",
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select(
      "id, stage, status, completion_pct, client:clients(id, company_name, workdrive_folder_url, workdrive_share_link)",
    )
    .eq("id", id)
    .single();

  if (appError || !application) {
    notFound();
  }

  const client = Array.isArray(application.client) ? application.client[0] : application.client;

  const { data: documentsRaw } = await supabase
    .from("documents")
    .select("id, status, owner_tag, expiry_date, checklist_template:checklist_templates(item_name)")
    .eq("application_id", id);

  const documents: ChecklistDocument[] = (documentsRaw ?? []).map((doc) => {
    const template = Array.isArray(doc.checklist_template)
      ? doc.checklist_template[0]
      : doc.checklist_template;

    return {
      id: doc.id,
      status: doc.status,
      owner_tag: doc.owner_tag,
      expiry_date: doc.expiry_date,
      item_name: template?.item_name ?? "Unknown item",
    };
  });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, status")
    .eq("application_id", id)
    .order("due_date", { ascending: true });

  const { data: cbkCorrespondence } = await supabase
    .from("cbk_correspondence")
    .select("id, query_text, received_date, response_deadline, response_status")
    .eq("application_id", id)
    .order("received_date", { ascending: false });

  return (
    <div className="flex-1 bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to whiteboard
          </Link>
          <div className="mt-2 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold text-zinc-900">{client?.company_name}</h1>
            <span className="text-sm text-zinc-500">{application.completion_pct}% complete</span>
          </div>
          <p className="text-sm text-zinc-500">
            {application.status === "complete" ? "Complete" : STAGE_LABEL[application.stage]}
          </p>
          {client && (
            <div className="mt-3 space-y-1">
              <WorkdriveLinkEditor
                clientId={client.id}
                applicationId={id}
                initialUrl={client.workdrive_folder_url}
              />
              {client.workdrive_share_link && (
                <CopyLink label="Client upload link" url={client.workdrive_share_link} />
              )}
            </div>
          )}
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">Checklist</h2>
          <DocumentChecklist applicationId={id} documents={documents} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">Tasks</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            {tasks && tasks.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {tasks.map((task) => (
                  <li key={task.id} className="flex justify-between text-zinc-700">
                    <span>{task.title}</span>
                    <span className="text-zinc-500">{task.due_date ?? "no due date"} · {task.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No tasks yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">CBK correspondence</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            {cbkCorrespondence && cbkCorrespondence.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {cbkCorrespondence.map((entry) => (
                  <li key={entry.id} className="text-zinc-700">
                    <p>{entry.query_text}</p>
                    <p className="text-xs text-zinc-500">
                      Received {entry.received_date} · due {entry.response_deadline ?? "—"} ·{" "}
                      {entry.response_status}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No CBK correspondence logged.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
