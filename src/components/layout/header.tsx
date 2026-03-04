"use client";

import Link from "next/link";
import { StockSearch } from "@/components/stock/stock-search";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            J-Quants ダッシュボード
          </Link>
          <Link
            href="/edinet"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            EDINET 開示書類
          </Link>
        </div>
        <StockSearch />
      </div>
    </header>
  );
}
