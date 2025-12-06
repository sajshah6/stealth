"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-gray-100 bg-white">
      <button className="flex items-center gap-1 text-lg font-medium hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors">
        ChatGPT 5.1
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
            <path d="M21 3v6h-6" />
          </svg>
        </Button>
      </div>
    </header>
  );
}

