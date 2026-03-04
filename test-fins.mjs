import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf8");
const match = envContent.match(/JQUANTS_API_KEY=(.+)/);
const key = match ? match[1].trim() : "";

// Check financial summary for Toyota (72030) to find free float fields
const res = await fetch(
  "https://api.jquants.com/v2/fins/summary?code=72030",
  { headers: { "x-api-key": key } }
);
const j = await res.json();
const dataKey = Object.keys(j).find((k) => k !== "pagination_key");
const arr = dataKey ? j[dataKey] : [];
if (arr.length > 0) {
  const latest = arr[arr.length - 1];
  // Print all keys to find free float related fields
  console.log("All keys:", Object.keys(latest).join(", "));
  console.log("---");
  // Print all key-value pairs that might relate to shares/float
  for (const [k, v] of Object.entries(latest)) {
    if (v && String(v) !== "" && String(v) !== "0") {
      console.log(`${k}: ${v}`);
    }
  }
}
