export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex-1 bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold text-zinc-900">Case {id}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Case detail view (checklist, documents, tasks, CBK log) — Phase 3 milestone, not built yet.
        </p>
      </div>
    </div>
  );
}
