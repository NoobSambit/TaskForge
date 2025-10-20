"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Ctx = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLElement>;
};

const DropdownMenuContext = React.createContext<Ctx | null>(null);

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu components must be used within <DropdownMenu>");
  return ctx;
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export type DropdownMenuProps = React.HTMLAttributes<HTMLDivElement>;
export function DropdownMenu({ className, children, ...props }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  return (
    <div className={cn("relative inline-block text-left", className)} {...props}>
      <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
        {children}
      </DropdownMenuContext.Provider>
    </div>
  );
}

export type DropdownMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, asChild, children, onClick, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useDropdownMenu();
    const mergedRef = composeRefs<HTMLButtonElement>(ref, triggerRef as unknown as React.Ref<HTMLButtonElement>);

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      onClick?.(e);
      setOpen((o) => !o);
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref: composeRefs(child.props.ref, mergedRef),
        onClick: (e: React.MouseEvent) => {
          child.props.onClick?.(e);
          handleClick(e as any);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      });
    }

    return (
      <button
        type="button"
        ref={mergedRef}
        data-state={open ? "open" : "closed"}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "end", sideOffset = 4, style, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const mergedRef = composeRefs<HTMLDivElement>(ref, contentRef);

    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      const onClick = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (contentRef.current && !contentRef.current.contains(target)) {
          setOpen(false);
        }
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClick);
      return () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("mousedown", onClick);
      };
    }, [open, setOpen]);

    if (!open) return null;

    const alignmentClass =
      align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

    return (
      <div
        ref={mergedRef}
        role="menu"
        style={{ marginTop: sideOffset, ...style }}
        className={cn(
          "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          alignmentClass,
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  inset?: boolean;
};

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownMenu();
    return (
      <button
        ref={ref}
        role="menuitem"
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          // Close after selection by default
          if (!e.defaultPrevented) setOpen(false);
        }}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export type DropdownMenuLabelProps = React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
};

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
      {...props}
    />
  )
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn("my-1 h-px bg-muted", className)} {...props} />;
}

export function DropdownMenuGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-0", className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
}
