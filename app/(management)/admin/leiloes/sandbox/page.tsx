import type { Metadata } from "next";
import { AuctionSandboxLauncher } from "@/components/Management/AuctionSandboxLauncher";
export const metadata: Metadata = { title: "Ambiente de ensaio" };
export default function AuctionSandboxPage(){return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08734e]">Qualidade</p><h1 className="mt-2 text-3xl font-bold">Ambiente de ensaio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Crie um cenário controlado para validar abertura de lotes, lances assistidos, fechamento e broadcast antes de operar um leilão real.</p></header><AuctionSandboxLauncher/></div>}
