"use client";

import { Button } from "@/components/ui/button";
import { PERIOD_OPTIONS } from "@/lib/constants";

interface PeriodSelectorProps {
  selected: string;
  onSelect: (value: string) => void;
}

export function PeriodSelector({ selected, onSelect }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
