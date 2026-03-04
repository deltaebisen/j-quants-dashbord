import { notFound } from "next/navigation";
import { getCompanyMaster } from "@/lib/jquants-client";
import { displayCode } from "@/lib/format";
import { StockHeader } from "@/components/stock/stock-header";
import { StockDetailClient } from "@/components/stock/stock-detail-client";

interface StockPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: StockPageProps) {
  const { code } = await params;
  const master = await getCompanyMaster();
  const company = master.find((c) => c.Code === code);
  return {
    title: company
      ? `${company.CoName} (${displayCode(code)}) - J-Quants ダッシュボード`
      : `${displayCode(code)} - J-Quants ダッシュボード`,
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { code } = await params;
  const master = await getCompanyMaster();
  const company = master.find((c) => c.Code === code);

  if (!company) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <StockHeader company={company} />
      <StockDetailClient code={code} />
    </div>
  );
}
