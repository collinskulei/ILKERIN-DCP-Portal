import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1 — Approval of Name",
  stage_2: "Stage 2 — Application for Licence",
  stage_3: "Stage 3 — Data Submission & Licensing",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: applications, error } = await supabase
    .from("applications")
    .select(
      "id, stage, completion_pct, status, client:clients(id, company_name, case_manager:profiles(full_name))",
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Active cases</h1>
          <SignOutButton />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Could not load applications: {error.message}
          </p>
        )}

        {!error && (!applications || applications.length === 0) && (
          <p className="text-sm text-zinc-500">
            No cases yet. Once client and application records exist, they will show up here.
          </p>
        )}

        {applications && applications.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Stage</th>
                  <th className="px-4 py-2 font-medium">Completion</th>
                  <th className="px-4 py-2 font-medium">Case manager</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {applications.map((app) => {
                  const client = Array.isArray(app.client) ? app.client[0] : app.client;
                  const caseManager = client?.case_manager
                    ? Array.isArray(client.case_manager)
                      ? client.case_manager[0]
                      : client.case_manager
                    : null;

                  return (
                    <tr key={app.id}>
                      <td className="px-4 py-3">
                        <Link href={`/cases/${app.id}`} className="font-medium text-zinc-900 hover:underline">
                          {client?.company_name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{STAGE_LABEL[app.stage] ?? app.stage}</td>
                      <td className="px-4 py-3 text-zinc-600">{app.completion_pct}%</td>
                      <td className="px-4 py-3 text-zinc-600">{caseManager?.full_name ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-zinc-600">{app.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
