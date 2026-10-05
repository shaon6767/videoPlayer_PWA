"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { useAuth } from "@/lib/auth-context";
import { Heart, History as HistoryIcon, LogOut, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FavoritesPage {
  totalCount: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api.get<FavoritesPage>("/favorites", { params: { page: 1 } }),
      api.get<unknown[]>("/history"),
    ])
      .then(([favorites, history]) => {
        setFavoritesCount(favorites.data.totalCount);
        setHistoryCount(history.data.length);
      })
      .catch((cause: unknown) => {
        setError(apiErrorMessage(cause, "Could not load your profile activity."));
      });
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-md">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  async function signOut() {
    setLogoutError("");
    try {
      await logout();
      router.push("/");
    } catch (cause: unknown) {
      setLogoutError(apiErrorMessage(cause, "Could not log out. Please retry."));
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="size-20">
            <AvatarFallback className="bg-red-600 text-2xl text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-3 text-xl font-semibold">{user.name}</h1>
          {"email" in user && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              {user.email}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Member since {joined}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {logoutError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {logoutError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-lg border p-4">
              <Heart className="size-5 text-red-600" />
              <span className="text-lg font-semibold">
                {favoritesCount ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">Favorites</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border p-4">
              <HistoryIcon className="size-5 text-red-600" />
              <span className="text-lg font-semibold">
                {historyCount ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">Watched</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={signOut}
          >
            <LogOut className="mr-2 size-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
