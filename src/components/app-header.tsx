import Link from "next/link";
import Image from "next/image";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-brand bg-brand-dark px-6 py-2.5">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/ilkerin-logo-light.png"
          alt="Ilkerin Consulting"
          width={906}
          height={412}
          priority
          className="h-8 w-auto"
        />
        <span className="hidden text-sm font-normal text-white/70 sm:inline">DCP Portal</span>
      </Link>
      <Link
        href="/documentation"
        className="text-sm text-white/70 transition-colors hover:text-white"
      >
        📖 Guide
      </Link>
    </header>
  );
}
