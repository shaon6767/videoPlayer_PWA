"use client";

import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-5 w-9" />;

  return (
    <div className="flex items-center gap-2 px-1">
      <Sun className="hidden size-4 text-muted-foreground sm:block" />
      <Switch
        checked={resolvedTheme === "dark"}
        onCheckedChange={(checked: boolean) =>
          setTheme(checked ? "dark" : "light")
        }
      />
      <Moon className="hidden size-4 text-muted-foreground sm:block" />
    </div>
  );
}
