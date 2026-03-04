import { Badge } from "@/components/ui/badge";
import { displayCode } from "@/lib/format";
import type { CompanyMaster } from "@/lib/jquants-types";

interface StockHeaderProps {
  company: CompanyMaster;
}

export function StockHeader({ company }: StockHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-bold">{company.CoName}</h1>
      <span className="font-mono text-lg text-muted-foreground">
        {displayCode(company.Code)}
      </span>
      <Badge variant="secondary">{company.S33Nm}</Badge>
      <Badge variant="outline">{company.MktNm}</Badge>
    </div>
  );
}
