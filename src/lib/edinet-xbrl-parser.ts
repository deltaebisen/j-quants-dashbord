import JSZip from "jszip";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { getEdinetDocumentXbrl } from "./edinet-client";
import type {
  MajorShareholder,
  MajorShareholderResult,
} from "./edinet-shareholders-types";

/**
 * Download and parse major shareholder data from an EDINET XBRL document.
 */
export async function getMajorShareholdersFromDoc(
  docID: string,
  periodEnd: string
): Promise<MajorShareholderResult> {
  const zipBuffer = await getEdinetDocumentXbrl(docID);
  const zip = await JSZip.loadAsync(zipBuffer);

  // Find HTM files under XBRL/PublicDoc/
  const htmFiles: { name: string; content: string }[] = [];
  for (const [path, file] of Object.entries(zip.files)) {
    if (
      !file.dir &&
      /\.(htm|html)$/i.test(path) &&
      /PublicDoc/i.test(path)
    ) {
      const content = await file.async("string");
      htmFiles.push({ name: path, content });
    }
  }

  if (htmFiles.length === 0) {
    throw new Error("No HTM files found in XBRL package");
  }

  for (const { content } of htmFiles) {
    const result = parseMajorShareholders(content);
    if (result && result.shareholders.length > 0) {
      return { ...result, docID, periodEnd };
    }
  }

  throw new Error("Major shareholder data not found in XBRL document");
}

function parseMajorShareholders(
  html: string
): Omit<MajorShareholderResult, "docID" | "periodEnd"> | null {
  const $ = cheerio.load(html, { xml: false });

  // Strategy 1: Find MajorShareholdersTextBlock (ix:nonnumeric, case-insensitive)
  // Cheerio lowercases tag names, so ix:nonnumeric matches ix:nonNumeric in source
  const block = $('[name="jpcrp_cor:MajorShareholdersTextBlock"]');
  if (block.length > 0) {
    const table = block.first().find("table").first();
    if (table.length > 0) {
      return parseShareholderTable($, table);
    }
  }

  // Strategy 2: Broader attribute match
  const block2 = $('[name*="MajorShareholders"]').filter((_, el) => {
    return $(el).find("table").length > 0;
  });
  if (block2.length > 0) {
    const table = block2.first().find("table").first();
    if (table.length > 0) {
      return parseShareholderTable($, table);
    }
  }

  // Strategy 3: Find by section header text "大株主の状況"
  let foundTable: cheerio.Cheerio<Element> | null = null;
  $("h3, h4, h5, p").each((_, el) => {
    if (foundTable) return;
    const text = $(el).text().trim();
    if (!text.includes("大株主の状況")) return;
    // Walk siblings to find the next table
    let node = $(el);
    for (let i = 0; i < 30; i++) {
      const next = node.next();
      if (next.length === 0) {
        node = node.parent();
        continue;
      }
      if (next.is("table")) {
        foundTable = next as cheerio.Cheerio<Element>;
        return;
      }
      const inner = next.find("table").first();
      if (inner.length > 0) {
        foundTable = inner as cheerio.Cheerio<Element>;
        return;
      }
      node = next;
    }
  });
  if (foundTable) {
    return parseShareholderTable($, foundTable);
  }

  return null;
}

function parseShareholderTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<Element>
): Omit<MajorShareholderResult, "docID" | "periodEnd"> | null {
  const rows = table.find("tr");
  if (rows.length < 2) return null;

  // Detect column indices from header row
  let nameCol = -1;
  let sharesCol = -1;
  let ratioCol = -1;

  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const cells = $(rows[r]).find("th, td");
    cells.each((i, cell) => {
      const text = $(cell).text().replace(/\s+/g, "");
      if (/氏名|名称/.test(text) && nameCol === -1) nameCol = i;
      if (/所有株式数|持株数|株式数/.test(text) && sharesCol === -1)
        sharesCol = i;
      if (/割合/.test(text) && ratioCol === -1) ratioCol = i;
    });
    if (nameCol >= 0 && sharesCol >= 0) break;
  }

  if (nameCol === -1) nameCol = 0;
  if (sharesCol === -1) sharesCol = 2; // typical: name(0), address(1), shares(2)
  if (ratioCol === -1) ratioCol = sharesCol + 1;

  const shareholders: MajorShareholder[] = [];
  let totalShares = 0;
  let totalHoldingRatio = 0;
  let foundTotal = false;

  // Find where data rows start (skip header rows)
  let startRow = 1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const cells = $(rows[r]).find("th, td");
    if (cells.length <= nameCol) continue;
    const text = $(cells[nameCol]).text().replace(/\s+/g, "");
    if (/氏名|名称|住所|株主/.test(text)) {
      startRow = r + 1;
    }
  }

  for (let r = startRow; r < rows.length; r++) {
    const cells = $(rows[r]).find("th, td");
    if (cells.length <= Math.max(nameCol, sharesCol)) continue;

    const nameText = $(cells[nameCol]).text().trim().replace(/\s+/g, " ");
    const shares = parseIxValue($, cells[sharesCol]);
    const ratio =
      ratioCol < cells.length ? parseDisplayedNumber($, cells[ratioCol]) : 0;

    // Total row
    if (/^計$|^合計$/.test(nameText.replace(/\s/g, ""))) {
      if (shares > 0) {
        totalShares = shares;
        totalHoldingRatio = ratio;
        foundTotal = true;
      }
      continue;
    }

    // Skip empty or non-data rows
    if (!nameText || nameText.length < 2 || /^―$|^－$|^-$/.test(nameText))
      continue;
    if (shares <= 0) continue;

    shareholders.push({ name: nameText, shares, holdingRatio: ratio });
  }

  if (shareholders.length === 0) return null;

  if (!foundTotal) {
    totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
    totalHoldingRatio = shareholders.reduce(
      (sum, s) => sum + s.holdingRatio,
      0
    );
  }

  return { shareholders, totalShares, totalHoldingRatio };
}

/**
 * Parse XBRL fact value from ix:nonfraction: text × 10^scale.
 * Used for share counts where scale=3 → text "1,805,605" = 1,805,605,000 shares.
 */
function parseIxValue(
  $: cheerio.CheerioAPI,
  cell: Element
): number {
  // Look for ix:nonfraction (cheerio lowercases tags)
  const ixEl = $(cell).find("ix\\:nonfraction").first();
  if (ixEl.length > 0) {
    const scale = parseInt(ixEl.attr("scale") || "0", 10);
    const raw = parseFloat(ixEl.text().replace(/[,\s]/g, ""));
    if (!isNaN(raw)) {
      return raw * Math.pow(10, scale);
    }
  }

  // Fallback: plain text
  const text = $(cell).text().replace(/[,\s]/g, "");
  const num = parseFloat(text);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse displayed text as-is (ignore scale). Used for ratio/percentage columns
 * where scale=-2 would convert 13.84% to 0.1384 — we want 13.84.
 */
function parseDisplayedNumber(
  $: cheerio.CheerioAPI,
  cell: Element
): number {
  const text = $(cell).text().replace(/[,\s%％]/g, "");
  const num = parseFloat(text);
  return isNaN(num) ? 0 : num;
}
