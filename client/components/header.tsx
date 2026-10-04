"use client";

import {
  Heart,
  History as HistoryIcon,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { SearchBar } from "@/components/SearchBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-errors";

export function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");

  async function signOut() {
    setLogoutError("");
    try {
      await logout();
      router.push("/");
    } catch (error: unknown) {
      setLogoutError(apiErrorMessage(error, "Could not log out. Please retry."));
    }
  }

  return (
    <header className="sticky top-0 z-50 flex items-center gap-4 border-b bg-background/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <Logo />

      <div className="flex flex-1 justify-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          title="Favorites"
          nativeButton={false}
          render={<Link href="/favorites" />}
        >
          <Heart className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Watch history"
          nativeButton={false}
          render={<Link href="/history" />}
        >
          <HistoryIcon className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/stats" />}
        >
          Stats
        </Button>
        <ModeToggle />

        {loading ? (
          <Skeleton className="size-8 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-red-600 text-sm text-white">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <UserIcon className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/favorites")}>
                <Heart className="mr-2 size-4" />
                Favorites
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              Sign up
            </Button>
          </div>
        )}
      </div>
      {logoutError && (
        <p
          role="alert"
          className="absolute right-3 top-full mt-1 rounded border bg-background px-3 py-2 text-xs text-red-600 shadow"
        >
          {logoutError}
        </p>
      )}
    </header>
  );
}
