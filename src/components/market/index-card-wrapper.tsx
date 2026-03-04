"use client";

import type { IndexPrice } from "@/lib/jquants-types";
import { IndexCard } from "./index-card";

interface IndexCardWrapperProps {
  name: string;
  prices: IndexPrice[];
}

export function IndexCardWrapper({ name, prices }: IndexCardWrapperProps) {
  return <IndexCard name={name} prices={prices} />;
}
