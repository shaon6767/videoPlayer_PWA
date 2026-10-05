import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white">
        S
      </span>
      <h1 className="mt-6 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        This video or page doesn&apos;t exist.
      </p>
      <Button
        className="mt-6 bg-red-600 hover:bg-red-700"
        render={<Link href="/" />}
      >
        Back to home
      </Button>
    </div>
  );
}
