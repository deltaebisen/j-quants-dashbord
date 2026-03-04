"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, ExternalLink } from "lucide-react";
import { useEdinetDocuments } from "@/hooks/use-edinet-documents";
import { EDINET_DOC_TYPES, EDINET_DOC_TYPE_FILTERS } from "@/lib/constants";
import type { EdinetDocument } from "@/lib/edinet-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface EdinetPageClientProps {
  initialDocuments: EdinetDocument[];
  initialDate: string;
}

function secCodeToJQuantsCode(secCode: string | null): string | null {
  if (!secCode || secCode.trim().length === 0) return null;
  const code = secCode.trim();
  if (code.length === 5) return code;
  if (code.length === 4) return code + "0";
  return null;
}

function formatSubmitTime(submitDateTime: string): string {
  if (!submitDateTime) return "—";
  const match = submitDateTime.match(/(\d{2}:\d{2})/);
  return match ? match[1] : submitDateTime;
}

function getDocTypeBadgeVariant(
  docTypeCode: string | null
): "default" | "secondary" | "outline" {
  if (!docTypeCode) return "outline";
  switch (docTypeCode) {
    case "120":
    case "130":
      return "default";
    case "240":
    case "250":
    case "160":
    case "170":
      return "secondary";
    default:
      return "outline";
  }
}

export function EdinetPageClient({
  initialDocuments,
  initialDate,
}: EdinetPageClientProps) {
  const [date, setDate] = useState(initialDate);
  const [docTypeFilter, setDocTypeFilter] = useState("all");

  const isInitialDate = date === initialDate;
  const { documents: fetchedDocuments, isLoading } = useEdinetDocuments(
    isInitialDate ? "" : date
  );

  const documents = isInitialDate ? initialDocuments : fetchedDocuments;
  const loading = !isInitialDate && isLoading;

  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = date === today;

  const filteredDocuments = useMemo(() => {
    if (docTypeFilter === "all") return documents;
    return documents.filter((d) => d.docTypeCode === docTypeFilter);
  }, [documents, docTypeFilter]);

  const handlePrevDay = () => {
    const prev = format(subDays(new Date(date), 1), "yyyy-MM-dd");
    setDate(prev);
  };

  const handleNextDay = () => {
    if (isToday) return;
    const next = format(addDays(new Date(date), 1), "yyyy-MM-dd");
    setDate(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            disabled={isToday}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDINET_DOC_TYPE_FILTERS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {filteredDocuments.length} 件
            {docTypeFilter !== "all" && ` / ${documents.length} 件中`}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            開示書類一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              該当する書類がありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">時刻</TableHead>
                  <TableHead className="w-[140px]">書類種別</TableHead>
                  <TableHead>提出者</TableHead>
                  <TableHead className="w-[80px]">コード</TableHead>
                  <TableHead>書類名</TableHead>
                  <TableHead className="w-[60px]">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const jquantsCode = secCodeToJQuantsCode(doc.secCode);
                  return (
                    <TableRow key={doc.docID}>
                      <TableCell className="text-muted-foreground">
                        {formatSubmitTime(doc.submitDateTime)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getDocTypeBadgeVariant(doc.docTypeCode)}
                          className="text-xs"
                        >
                          {doc.docTypeCode
                            ? (EDINET_DOC_TYPES[doc.docTypeCode] ??
                              doc.docTypeCode)
                            : "不明"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {doc.filerName}
                      </TableCell>
                      <TableCell>
                        {jquantsCode ? (
                          <Link
                            href={`/stocks/${jquantsCode}`}
                            className="text-primary hover:underline"
                          >
                            {doc.secCode?.slice(0, 4)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {doc.docDescription ?? "—"}
                      </TableCell>
                      <TableCell>
                        {doc.pdfFlag === "1" ? (
                          <a
                            href={`/api/edinet/documents/pdf?docID=${doc.docID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
