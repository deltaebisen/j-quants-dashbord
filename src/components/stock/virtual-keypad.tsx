"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VirtualKeypadProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const;

export function VirtualKeypad({ onKey, onDelete, onClear }: VirtualKeypadProps) {
  return (
    <div
      className="border-t p-3"
      onPointerDown={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.flat().map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-10 font-mono text-base"
            onClick={() => onKey(key)}
          >
            {key}
          </Button>
        ))}
        <Button
          variant="outline"
          className="text-muted-foreground h-10 text-xs"
          onClick={onClear}
        >
          AC
        </Button>
        <Button
          variant="outline"
          className="h-10 font-mono text-base"
          onClick={() => onKey("0")}
        >
          0
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={onDelete}
        >
          <Delete className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
