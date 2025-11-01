"use client";

import { AiParseResult } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface AIResultPreviewProps {
  result: AiParseResult;
  onAccept: () => void;
  onReject: () => void;
  onEdit?: () => void;
  loading?: boolean;
}

export default function AIResultPreview({
  result,
  onAccept,
  onReject,
  onEdit,
  loading = false,
}: AIResultPreviewProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityLabel = (priority: number) => {
    const labels: Record<number, string> = {
      1: "1 - Lowest",
      2: "2 - Low",
      3: "3 - Normal",
      4: "4 - High",
      5: "5 - Highest",
    };
    return labels[priority] || `${priority}`;
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="ai">AI Suggestion</Badge>
            {loading && (
              <span className="text-xs text-muted-foreground">Processing...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                disabled={loading}
                title="Edit suggestion"
              >
                ✏️
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={loading}
              title="Reject suggestion"
            >
              ✕
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={loading}
              title="Accept suggestion"
            >
              ✓ Accept
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Title:</span>
            <p className="text-sm font-medium">{result.title}</p>
          </div>

          {result.description && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Description:</span>
              <p className="text-sm">{result.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {result.priority !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Priority:</span>
                <Badge variant="outline">{getPriorityLabel(result.priority)}</Badge>
              </div>
            )}

            {result.dueDate && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Due:</span>
                <Badge variant="outline">{formatDate(result.dueDate)}</Badge>
              </div>
            )}

            {result.recurrence && result.recurrence !== "none" && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Recurrence:</span>
                <Badge variant="outline">{result.recurrence}</Badge>
              </div>
            )}
          </div>

          {result.tags && result.tags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
