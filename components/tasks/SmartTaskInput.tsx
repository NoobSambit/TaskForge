"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiParseResult } from "@/lib/ai";
import SmartSuggestionsPanel from "./SmartSuggestionsPanel";

export interface SmartTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionAccepted: (result: AiParseResult) => void;
  onEnterCreate?: () => void;
  debounceMs?: number;
  disabled?: boolean;
  placeholder?: string;
  enableAI?: boolean;
}

export default function SmartTaskInput({
  value,
  onChange,
  onSuggestionAccepted,
  onEnterCreate,
  debounceMs = 800,
  disabled = false,
  placeholder = "What needs to be done? (e.g., 'Buy groceries tomorrow at 2pm, high priority')",
  enableAI = true,
}: SmartTaskInputProps) {
  const [aiResult, setAiResult] = useState<AiParseResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const parseWithAI = useCallback(async (input: string) => {
    if (!input.trim() || input.trim().length < 3) {
      setAiResult(null);
      setAiError(null);
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: input.trim() }),
        signal: abortController.signal,
      });

      // Check if this request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse input");
      }

      if (data.success && data.data) {
        setAiResult(data.data);
        setAiError(null);
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === "AbortError") {
        return;
      }

      console.error("AI parse error:", error);
      setAiError(error.message || "Failed to parse with AI. You can still enter manually.");
      setAiResult(null);
    } finally {
      if (!abortController.signal.aborted) {
        setAiLoading(false);
      }
    }
  }, []);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't parse if AI is disabled or value is empty
    if (!enableAI || !newValue.trim()) {
      setAiResult(null);
      setAiError(null);
      return;
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      parseWithAI(newValue);
    }, debounceMs);
  };

  const handleAcceptSuggestion = (result: AiParseResult) => {
    onSuggestionAccepted(result);
    setAiResult(null);
    setAiError(null);
  };

  const handleRejectSuggestion = () => {
    setAiResult(null);
    setAiError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // If there's an AI result, accept it first
      if (aiResult) {
        handleAcceptSuggestion(aiResult);
      }
      
      // Trigger create
      if (onEnterCreate) {
        onEnterCreate();
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="smart-task-input" className="flex items-center gap-2">
          Task Description
          {enableAI && (
            <span className="text-purple-500 text-sm" title="AI-powered parsing">✨</span>
          )}
        </Label>
        <Input
          id="smart-task-input"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={enableAI && aiLoading ? "border-purple-300" : ""}
        />
        {enableAI && (
          <p className="text-xs text-muted-foreground">
            Type naturally and AI will help extract details. Press Enter to create.
          </p>
        )}
      </div>

      {enableAI && (
        <SmartSuggestionsPanel
          result={aiResult}
          error={aiError}
          loading={aiLoading}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
        />
      )}
    </div>
  );
}
