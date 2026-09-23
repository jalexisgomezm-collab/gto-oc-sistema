import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const activo = body.activo !== false;

  const { data, error } = await supabase
    .from("catalogo_productos")
    .update({ descripcion, um, codigo, activo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, descripcion, um, codigo, activo")
    .single();

  if (error) {
    if ((error as any).code === "23505") {
      return NextResponse.json({ error: "Ya existe otro producto con esa descripción" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ producto: data });
}
