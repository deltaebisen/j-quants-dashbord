"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { displayCode } from "@/lib/format";
import { useStockSearch } from "@/hooks/use-stock-search";
import { VirtualKeypad } from "@/components/stock/virtual-keypad";

export function StockSearch() {
  const [open, setOpen] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);
  const router = useRouter();
  const { query, setQuery, results, isLoading } = useStockSearch();

  const handleKeypadInput = useCallback(
    (key: string) => setQuery((prev) => prev + key),
    [setQuery]
  );
  const handleKeypadDelete = useCallback(
    () => setQuery((prev) => prev.slice(0, -1)),
    [setQuery]
  );
  const handleKeypadClear = useCallback(() => setQuery(""), [setQuery]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (code: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/stocks/${code}`);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-64 justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        銘柄検索...
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>銘柄検索</DialogTitle>
          <DialogDescription>銘柄コードまたは社名で検索</DialogDescription>
        </DialogHeader>
        <DialogContent
          className="overflow-hidden p-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLElement | null;
            const input = target?.querySelector<HTMLInputElement>(
              '[data-slot="command-input"]'
            );
            input?.focus();
          }}
        >
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
            <div className="flex items-center">
              <CommandInput
                placeholder="銘柄コードまたは社名を入力..."
                value={query}
                onValueChange={setQuery}
              />
              <button
                type="button"
                className={`mr-3 shrink-0 rounded p-1 ${showKeypad ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setShowKeypad((prev) => !prev)}
                onPointerDown={(e) => e.preventDefault()}
              >
                <Keyboard className="h-4 w-4" />
              </button>
            </div>
            <CommandList className="h-[200px]">
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  検索中...
                </div>
              )}
              {!isLoading && query.length > 0 && results.length === 0 && (
                <CommandEmpty>該当する銘柄が見つかりません</CommandEmpty>
              )}
              {results.length > 0 && (
                <CommandGroup heading="検索結果">
                  {results.map((company) => (
                    <CommandItem
                      key={company.Code}
                      value={company.Code}
                      onSelect={() => handleSelect(company.Code)}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div>
                          <span className="font-mono font-medium">
                            {displayCode(company.Code)}
                          </span>
                          <span className="ml-2">{company.CoName}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {company.S33Nm}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {showKeypad && (
            <VirtualKeypad
              onKey={handleKeypadInput}
              onDelete={handleKeypadDelete}
              onClear={handleKeypadClear}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
