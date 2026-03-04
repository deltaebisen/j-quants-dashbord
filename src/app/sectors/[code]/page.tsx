import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompaniesBySector } from "@/lib/jquants-client";
import { SECTOR33_NAMES } from "@/lib/constants";
import { displayCode } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SectorPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: SectorPageProps) {
  const { code } = await params;
  const sectorName = SECTOR33_NAMES[code];
  return {
    title: sectorName
      ? `${sectorName} - セクター銘柄一覧 - J-Quants ダッシュボード`
      : `セクター ${code} - J-Quants ダッシュボード`,
  };
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { code } = await params;
  const sectorName = SECTOR33_NAMES[code];

  if (!sectorName) {
    notFound();
  }

  const companies = await getCompaniesBySector(code);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← マーケット概況
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline gap-3">
            <span>{sectorName}</span>
            <span className="text-muted-foreground text-base font-normal">
              {companies.length}銘柄
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              該当する銘柄がありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">コード</TableHead>
                  <TableHead>銘柄名</TableHead>
                  <TableHead>市場</TableHead>
                  <TableHead>規模</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.Code}>
                    <TableCell>
                      <Link
                        href={`/stocks/${company.Code}`}
                        className="text-primary hover:underline font-mono"
                      >
                        {displayCode(company.Code)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/stocks/${company.Code}`}
                        className="hover:text-primary hover:underline"
                      >
                        {company.CoName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.MktNm || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.ScaleCat || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
