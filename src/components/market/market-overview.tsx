import { subDays, format } from "date-fns";
import { getIndexPrices } from "@/lib/jquants-client";
import { INDEX_CODES, DEFAULT_INDEX_CODES } from "@/lib/constants";
import { IndexCardWrapper } from "./index-card-wrapper";

export async function MarketOverview() {
  const to = format(new Date(), "yyyyMMdd");
  const from = format(subDays(new Date(), 45), "yyyyMMdd");

  const indexDataArray = await Promise.all(
    DEFAULT_INDEX_CODES.map(async (code) => {
      try {
        const prices = await getIndexPrices(code, from, to);
        return { code, prices, name: INDEX_CODES[code] || code };
      } catch {
        return { code, prices: [], name: INDEX_CODES[code] || code };
      }
    })
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">マーケット概況</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indexDataArray.map(({ code, prices, name }) => (
          <IndexCardWrapper key={code} name={name} prices={prices} />
        ))}
      </div>
    </section>
  );
}
