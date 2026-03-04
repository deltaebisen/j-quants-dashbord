"use client";

import { useEffect, useState } from "react";
import type { MarginInterest } from "@/lib/jquants-types";
import { formatDate, formatVolume } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ShortSellingTableProps {
  code: string;
}

export function ShortSellingTable({ code }: ShortSellingTableProps) {
  const [data, setData] = useState<MarginInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/jquants/markets/margin-interest?code=${code}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [code]);

  if (isLoading) {
    return <Skeleton className="h-64 rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          空売りデータがありません
        </CardContent>
      </Card>
    );
  }

  const entries = data.slice(-20).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>空売り比率</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead className="text-right">売残（制度）</TableHead>
              <TableHead className="text-right">売残（一般）</TableHead>
              <TableHead className="text-right">買残</TableHead>
              <TableHead className="text-right">空売り比率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((row) => {
              const totalVol = (row.ShrtVol || 0) + (row.LongVol || 0);
              const ratio = totalVol > 0 ? ((row.ShrtVol || 0) / totalVol) * 100 : null;

              return (
                <TableRow key={row.Date}>
                  <TableCell>{formatDate(row.Date)}</TableCell>
                  <TableCell className="text-right">
                    {formatVolume(row.ShrtStdVol)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVolume(row.ShrtNegVol)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVolume(row.LongVol)}
                  </TableCell>
                  <TableCell className="text-right">
                    {ratio != null ? `${ratio.toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
