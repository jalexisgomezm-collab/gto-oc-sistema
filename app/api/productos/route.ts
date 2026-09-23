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
    .from("catalogo_productos")
    .select("id, descripcion, um, codigo, activo")
    .order("descripcion", { ascending: true })
    .limit(soloActivos ? 20 : 500);

  if (soloActivos) query = query.eq("activo", true);
  if (q) query = query.ilike("descripcion", `%${q.replace(/[%,]/g, "")}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ productos: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const descripcion = (body.descripcion || "").trim();
  if (!descripcion) return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 });

  const um = (body.um || "UND").trim() || "UND";
  const codigo = body.codigo ? String(body.codigo).trim() : null;

  // Ya existe un producto con esa descripción (sin importar mayúsculas/minúsculas): lo reutilizamos.
  const { data: existente } = await supabase
    .from("catalogo_productos")
    .select("id, descripcion, um, codigo, activo")
    .ilike("descripcion", descripcion)
    .maybeSingle();
  if (existente) {
    if (!existente.activo) {
      await supabase.from("catalogo_productos").update({ activo: true }).eq("id", existente.id);
      existente.activo = true;
    }
    return NextResponse.json({ producto: existente });
  }

  const { data, error } = await supabase
    .from("catalogo_productos")
    .insert({ descripcion, um, codigo, activo: true })
    .select("id, descripcion, um, codigo, activo")
    .single();

  if (error) {
    // Condición de carrera: alguien más lo creó entre el SELECT y el INSERT.
    if ((error as any).code === "23505") {
      const { data: creadoAhora } = await supabase
        .from("catalogo_productos")
        .select("id, descripcion, um, codigo, activo")
        .ilike("descripcion", descripcion)
        .maybeSingle();
      if (creadoAhora) return NextResponse.json({ producto: creadoAhora });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ producto: data });
}
