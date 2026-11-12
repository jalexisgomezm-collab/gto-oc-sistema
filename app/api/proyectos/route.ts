import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const soloActivos = searchParams.get("todos") !== "1";

  let query = supabase
    .from("proyectos")
    .select("id, nombre, tipo, cliente, numero_oc_cliente, numero_orden_trabajo, estado")
    .order("created_at", { ascending: false })
    .limit(soloActivos ? 20 : 500);

  if (soloActivos) query = query.eq("estado", "activo");
  if (q) {
    // Busca por nombre, N° de OT, cliente u OC del cliente
    const t = q.replace(/[%,()*]/g, " ").trim();
    if (t) {
      query = query.or(
        ["nombre", "numero_orden_trabajo", "cliente", "numero_oc_cliente"].map((c) => `${c}.ilike.*${t}*`).join(",")
      );
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proyectos: data || [] });
}

// Desde la separación (11/2026) las OT/proyectos son un espejo de solo lectura del Maestro.
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Las OT y proyectos ahora se crean y editan en el Maestro de Operaciones. Aquí solo se eligen." },
    { status: 403 }
  );
}
