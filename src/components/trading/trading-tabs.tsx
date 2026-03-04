"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarginTradingTable } from "./margin-trading-table";
import { ShortSellingTable } from "./short-selling-table";

interface TradingTabsProps {
  code: string;
}

export function TradingTabs({ code }: TradingTabsProps) {
  return (
    <Tabs defaultValue="margin">
      <TabsList>
        <TabsTrigger value="margin">信用残</TabsTrigger>
        <TabsTrigger value="short">空売り比率</TabsTrigger>
      </TabsList>
      <TabsContent value="margin">
        <MarginTradingTable code={code} />
      </TabsContent>
      <TabsContent value="short">
        <ShortSellingTable code={code} />
      </TabsContent>
    </Tabs>
  );
}
