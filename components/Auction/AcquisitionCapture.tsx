"use client";
import { useEffect } from "react";
import { detectAcquisitionSource } from "@/lib/auctions/acquisition-sources";

export function AcquisitionCapture() {
  useEffect(() => { detectAcquisitionSource(); }, []);
  return null;
}
