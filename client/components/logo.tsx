import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="Playlix home" className="flex shrink-0 items-center gap-2.5">
      <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <svg viewBox="0 0 512 512" aria-hidden="true" className="size-full p-1.5">
          <path d="M128 184h62M128 256h62M128 328h62" fill="none" stroke="white" strokeLinecap="round" strokeWidth="24" opacity=".72" />
          <path d="M230 151a24 24 0 0 1 37-20l138 101a29 29 0 0 1 0 48L267 381a24 24 0 0 1-37-20z" fill="white" />
        </svg>
      </span>
      <span className="text-xl font-semibold tracking-tight">
        <span className="text-foreground">Play</span>
        <span className="text-violet-600 dark:text-violet-400">lix</span>
      </span>
    </Link>
  );
}
