"use client";

import { AiParseResult } from "@/lib/ai";
import AIResultPreview from "./AIResultPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface SmartSuggestionsPanelProps {
  result?: AiParseResult | null;
  error?: string | null;
  loading?: boolean;
  onAccept: (result: AiParseResult) => void;
  onReject: () => void;
}

export default function SmartSuggestionsPanel({
  result,
  error,
  loading = false,
  onAccept,
  onReject,
}: SmartSuggestionsPanelProps) {
  // Don't show anything if there's no result, error, or loading state
  if (!result && !error && !loading) {
    return null;
  }

  // Show loading state
  if (loading && !result) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-950/10">
        <span className="text-purple-500 animate-pulse">✨</span>
        <span className="text-sm text-muted-foreground">AI is analyzing your input...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <span className="absolute left-4 top-4">⚠️</span>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Show result with preview
  if (result) {
    return (
      <AIResultPreview
        result={result}
        onAccept={() => onAccept(result)}
        onReject={onReject}
        loading={loading}
      />
    );
  }

  return null;
}
