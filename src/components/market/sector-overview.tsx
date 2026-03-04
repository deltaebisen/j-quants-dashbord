import Link from "next/link";
import { getCompanyMaster } from "@/lib/jquants-client";
import { SECTOR33_NAMES } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function SectorOverview() {
  let masterData: Awaited<ReturnType<typeof getCompanyMaster>>;
  try {
    masterData = await getCompanyMaster();
  } catch {
    masterData = [];
  }

  // Count companies per sector
  const sectorMap = new Map<string, { count: number; scaleCats: Record<string, number> }>();

  for (const item of masterData) {
    const s33 = item.S33;
    if (!s33 || s33 === "9999") continue;

    const existing = sectorMap.get(s33) || { count: 0, scaleCats: {} };
    existing.count += 1;
    const cat = item.ScaleCat || "その他";
    existing.scaleCats[cat] = (existing.scaleCats[cat] || 0) + 1;
    sectorMap.set(s33, existing);
  }

  const sectors = Object.entries(SECTOR33_NAMES).map(([code, name]) => {
    const data = sectorMap.get(code);
    return {
      code,
      name,
      count: data?.count || 0,
      largeCap: (data?.scaleCats["TOPIX Core30"] || 0) +
        (data?.scaleCats["TOPIX Large70"] || 0),
    };
  });

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>セクター概況（33業種）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>業種</TableHead>
                <TableHead className="text-right">銘柄数</TableHead>
                <TableHead className="text-right">大型株</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.map((sector) => (
                <TableRow key={sector.code}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sectors/${sector.code}`}
                      className="hover:text-primary hover:underline"
                    >
                      {sector.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {sector.count > 0 ? sector.count : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {sector.largeCap > 0 ? sector.largeCap : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
