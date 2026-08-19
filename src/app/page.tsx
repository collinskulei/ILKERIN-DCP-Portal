import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { AddClientDialog } from "@/components/add-client-dialog";
import { CaseBoard, type ApplicationBoardRow } from "@/components/case-board";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("application_board")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Case whiteboard</h1>
            <p className="text-sm text-zinc-500">Live progress across every client engagement</p>
          </div>
          <div className="flex items-center gap-4">
            <AddClientDialog />
            <SignOutButton />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Could not load cases: {error.message}
          </p>
        )}

        {!error && <CaseBoard rows={(rows ?? []) as ApplicationBoardRow[]} />}
      </div>
    </div>
  );
}
