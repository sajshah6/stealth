"use client";

import Link from "next/link";
import { useAuth } from "@/providers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

/**
 * User menu component
 * Shows user info when signed in, or sign in button when not
 */
export function UserMenu() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t border-gray-200">
        <Button
          onClick={signInWithGoogle}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  // Get user initials from name or email
  const displayName = user.user_metadata?.full_name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-3 border-t border-gray-200">
      <Link
        href="/settings"
        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-teal-600 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{displayName}</div>
          <div className="text-xs text-gray-500 truncate">{user.email}</div>
        </div>
      </Link>
    </div>
  );
}

