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
  if (q) query = query.ilike("nombre", `%${q.replace(/[%,]/g, "")}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proyectos: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const nombre = (body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre del proyecto es obligatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      nombre,
      tipo: (body.tipo || "OTRO").trim(),
      cliente: body.cliente || null,
      numero_oc_cliente: body.numero_oc_cliente || null,
      numero_orden_trabajo: body.numero_orden_trabajo || null,
      observaciones: body.observaciones || null,
      creado_por: user.id
    })
    .select("id, nombre, tipo, cliente, numero_oc_cliente, numero_orden_trabajo, estado")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proyecto: data });
}
