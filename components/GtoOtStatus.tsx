"use client";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import GtoStatus from "./GtoStatus";
export default function GtoOtStatus() {
  const source = useMemo(() => ({
    async list() { const r = await createClient().rpc("gto_ot_actividad"); if (r.error) throw r.error; return (r.data || []) as unknown[]; },
    async read(id: string) { const r = await createClient().rpc("gto_ot_marcar_leida", { p_ot: id }); if (r.error) throw r.error; }
  }), []);
  return <GtoStatus module="Logística y Compras" source={source} />;
}
