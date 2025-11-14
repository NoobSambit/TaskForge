"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { format, parseISO, startOfWeek, getDay } from "date-fns";

interface StreakHistoryItem {
  date: string;
  count: number;
  hasActivity: boolean;
}

interface StreakHeatmapProps {
  history: StreakHistoryItem[];
  isLoading?: boolean;
  className?: string;
}

interface CellPosition {
  row: number;
  col: number;
}

export function StreakHeatmap({ 
  history, 
  isLoading = false,
  className = "" 
}: StreakHeatmapProps) {
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Determine if we should animate (respect reduced motion)
  const shouldAnimate = typeof window !== "undefined" && 
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Get color intensity based on task count
  const getColorClass = (count: number): string => {
    if (count === 0) return "bg-muted/30 dark:bg-muted/20";
    if (count === 1) return "bg-green-200 dark:bg-green-900/40";
    if (count === 2) return "bg-green-400 dark:bg-green-700/60";
    if (count >= 3 && count <= 4) return "bg-green-600 dark:bg-green-600/80";
    return "bg-green-700 dark:bg-green-500";
  };

  // Format the grid data by weeks
  const formatGridData = useCallback(() => {
    if (!history.length) return [];

    const weeks: StreakHistoryItem[][] = [];
    let currentWeek: StreakHistoryItem[] = [];

    // Add empty cells for days before the first date
    const firstDate = parseISO(history[0].date);
    const firstDayOfWeek = getDay(firstDate);
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: "", count: 0, hasActivity: false });
    }

    // Add all history items
    history.forEach((item, index) => {
      currentWeek.push(item);
      
      const date = parseISO(item.date);
      const dayOfWeek = getDay(date);
      
      // Start new week on Sunday (day 0)
      if (dayOfWeek === 6 || index === history.length - 1) {
        // Pad the last week if needed
        while (currentWeek.length < 7) {
          currentWeek.push({ date: "", count: 0, hasActivity: false });
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  }, [history]);

  const weeks = formatGridData();
  const totalCells = weeks.reduce((sum, week) => sum + week.filter(d => d.date).length, 0);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!focusedCell) return;

    const { row, col } = focusedCell;
    let newRow = row;
    let newCol = col;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        newCol = Math.min(col + 1, weeks.length - 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        newCol = Math.max(col - 1, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        newRow = Math.min(row + 1, 6);
        break;
      case "ArrowUp":
        event.preventDefault();
        newRow = Math.max(row - 1, 0);
        break;
      case "Home":
        event.preventDefault();
        newRow = 0;
        newCol = 0;
        break;
      case "End":
        event.preventDefault();
        newRow = 6;
        newCol = weeks.length - 1;
        break;
      default:
        return;
    }

    // Validate new position
    if (weeks[newCol] && weeks[newCol][newRow]) {
      setFocusedCell({ row: newRow, col: newCol });
      const cell = weeks[newCol][newRow];
      if (cell.date) {
        setHoveredCell(cell.date);
      }
    }
  }, [focusedCell, weeks]);

  // Handle cell focus
  const handleCellFocus = useCallback((row: number, col: number, date: string) => {
    setFocusedCell({ row, col });
    if (date) {
      setHoveredCell(date);
    }
  }, []);

  // Handle cell blur
  const handleCellBlur = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Get tooltip content
  const getTooltipContent = (item: StreakHistoryItem): string => {
    if (!item.date) return "";
    
    const date = parseISO(item.date);
    const formattedDate = format(date, "MMMM d, yyyy");
    
    if (item.count === 0) {
      return `${formattedDate}: No tasks completed`;
    }
    
    return `${formattedDate}: ${item.count} task${item.count !== 1 ? 's' : ''} completed`;
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="bg-muted/50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-4" />
          <div className="grid grid-cols-[repeat(13,1fr)] gap-1">
            {Array.from({ length: 91 }).map((_, i) => (
              <div key={i} className="h-3 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className={`bg-muted/50 rounded-lg p-4 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">No streak data available</p>
      </div>
    );
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={className}>
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Activity Heatmap</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30 dark:bg-muted/20" aria-label="No activity" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40" aria-label="Low activity" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/60" aria-label="Medium activity" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-600/80" aria-label="High activity" />
              <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-500" aria-label="Very high activity" />
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="relative">
          {/* Day labels */}
          <div className="absolute -left-12 top-0 flex flex-col gap-[3px] text-[10px] text-muted-foreground">
            {dayLabels.map((day, idx) => (
              <div key={day} className="h-3 flex items-center" aria-hidden="true">
                {idx % 2 === 1 && day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-label="Activity heatmap showing daily task completion"
            aria-rowcount={7}
            aria-colcount={weeks.length}
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, 12px)`,
              gridAutoRows: "12px",
            }}
            onKeyDown={handleKeyDown}
          >
            {weeks.map((week, colIndex) => (
              week.map((item, rowIndex) => {
                const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
                const isHovered = hoveredCell === item.date;
                const colorClass = getColorClass(item.count);
                const tooltipContent = getTooltipContent(item);

                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    role="gridcell"
                    aria-rowindex={rowIndex + 1}
                    aria-colindex={colIndex + 1}
                    aria-label={tooltipContent || "No data"}
                    tabIndex={item.date ? (isFocused || (!focusedCell && rowIndex === 0 && colIndex === 0) ? 0 : -1) : -1}
                    className={`
                      rounded-sm border-2 
                      ${colorClass}
                      ${item.date ? 'cursor-pointer' : 'opacity-0'}
                      ${isFocused ? 'ring-2 ring-primary ring-offset-1' : 'border-transparent'}
                      ${shouldAnimate ? 'transition-all duration-200' : ''}
                      ${isHovered && !isFocused ? 'ring-1 ring-primary/50' : ''}
                    `}
                    style={{
                      gridColumn: colIndex + 1,
                      gridRow: rowIndex + 1,
                    }}
                    onMouseEnter={() => item.date && setHoveredCell(item.date)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onFocus={() => item.date && handleCellFocus(rowIndex, colIndex, item.date)}
                    onBlur={handleCellBlur}
                  />
                );
              })
            ))}
          </div>

          {/* Tooltip */}
          {hoveredCell && (
            <div
              className="absolute left-0 -top-12 bg-popover text-popover-foreground text-xs rounded-md px-3 py-2 shadow-lg border z-10 whitespace-nowrap"
              role="tooltip"
              aria-live="polite"
            >
              {history.find(h => h.date === hoveredCell) && 
                getTooltipContent(history.find(h => h.date === hoveredCell)!)
              }
            </div>
          )}
        </div>

        {/* Screen reader summary */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Showing {totalCells} days of activity. 
          Use arrow keys to navigate through the calendar.
          {hoveredCell && ` Currently viewing ${getTooltipContent(history.find(h => h.date === hoveredCell)!)}`}
        </div>
      </div>
    </div>
  );
}
