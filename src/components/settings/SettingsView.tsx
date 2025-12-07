"use client";

import { useAuth } from "@/providers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, Mail, User } from "lucide-react";

/**
 * Settings View
 * Shows user profile information and sign out option
 */
export function SettingsView() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view settings.</p>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

        {/* Profile Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Profile
          </h2>

          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-teal-600 text-white text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-500">Signed in with Google</p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* User Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm text-gray-900">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Account
          </h2>
          <Button
            variant="outline"
            onClick={signOut}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

