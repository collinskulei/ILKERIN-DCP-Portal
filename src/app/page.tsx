import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { AddClientDialog } from "@/components/add-client-dialog";
import { CaseBoard, type ApplicationBoardRow } from "@/components/case-board";
import { CompletionConfetti } from "@/components/completion-confetti";
import { GuideMeButton, type TourStep } from "@/components/guided-tour";

const DASHBOARD_TOUR: TourStep[] = [
  {
    selector: '[data-tour="add-client"]',
    title: "Add a client",
    body: "Start here for a new client, or one already in progress before this app existed. Pick a starting stage and the full checklist for that stage is created automatically.",
  },
  {
    selector: '[data-tour="view-toggle"]',
    title: "Board or list view",
    body: "Switch between a Kanban-style board (grouped by stage) and a flat table — whichever gives you the view you need.",
  },
  {
    selector: '[data-tour="stage-column"]',
    title: "Stage columns",
    body: "Each column is a licensing stage. Cards show live progress, and small badges flag overdue tasks, expiring documents, or pending CBK queries.",
  },
  {
    selector: '[data-tour="complete-column"]',
    title: "Completed cases",
    body: "Once a case manager marks a licence received, the case lands here and its checklist locks from further edits.",
  },
  {
    selector: '[data-tour="sign-out"]',
    title: "That's it!",
    body: "Click into any client to see their full checklist, tasks, CBK log, and a progress visualization. You can restart this tour anytime.",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("application_board")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 bg-zinc-50 px-6 py-8">
      <Suspense fallback={null}>
        <CompletionConfetti />
      </Suspense>
      <div className="animate-fade-in mx-auto max-w-6xl">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Case whiteboard</h1>
            <p className="text-sm text-zinc-500">Live progress across every client engagement</p>
          </div>
          <div className="flex items-center gap-4">
            <GuideMeButton steps={DASHBOARD_TOUR} />
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
