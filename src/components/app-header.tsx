import Link from "next/link";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-brand bg-brand-dark px-6 py-3">
      <Link href="/" className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
        <span className="text-sm font-semibold tracking-wide text-white">
          ILKERIN <span className="font-normal text-white/70">DCP Portal</span>
        </span>
      </Link>
    </header>
  );
}
