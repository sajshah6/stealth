"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export interface InputOption {
  id: string;
  label: string;
  description?: string;
}

export interface InputPromptData {
  question: string;
  type: "single_select" | "multi_select" | "text";
  options?: InputOption[];
}

interface InputPromptProps {
  prompt: InputPromptData;
  onSubmit?: (value: string | string[]) => void;
}

export function InputPrompt({ prompt }: InputPromptProps) {
  return (
    <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">Your Input Needed</h4>
          <p className="text-sm text-gray-700 mb-4">{prompt.question}</p>

          {/* Options */}
          {prompt.options && (
            <div className="space-y-2 mb-4">
              {prompt.options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <input
                    type={prompt.type === "single_select" ? "radio" : "checkbox"}
                    name="input-option"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <Button className="w-full sm:w-auto">Submit Selection</Button>
        </div>
      </div>
    </div>
  );
}

