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
  const nombre = (body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre del proyecto es obligatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("proyectos")
    .update({
      nombre,
      tipo: (body.tipo || "OTRO").trim(),
      cliente: body.cliente || null,
      numero_oc_cliente: body.numero_oc_cliente || null,
      numero_orden_trabajo: body.numero_orden_trabajo || null,
      estado: body.estado || "activo",
      observaciones: body.observaciones || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, nombre, tipo, cliente, numero_oc_cliente, numero_orden_trabajo, estado")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proyecto: data });
}
