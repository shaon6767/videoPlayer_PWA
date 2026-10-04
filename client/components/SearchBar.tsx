"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-lg">
      <button
        type="submit"
        aria-label="Search videos"
        className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="size-4" />
      </button>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search videos"
        aria-label="Search videos"
        className="pl-10"
      />
    </form>
  );
}
