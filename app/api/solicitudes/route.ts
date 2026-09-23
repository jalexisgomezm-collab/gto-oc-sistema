import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const AREAS = ["LABORATORIO", "TALLER", "LOGISTICA", "ADMINISTRACION"];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");

  let query = supabase
    .from("solicitudes_pedido")
    .select("id, numero, area, solicitante, fecha_solicitud, estado, solicitud_items(id)")
    .order("numero", { ascending: false });

  if (area && AREAS.includes(area)) query = query.eq("area", area);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const solicitudes = (data || []).map((s: any) => ({
    id: s.id,
    numero: s.numero,
    area: s.area,
    solicitante: s.solicitante,
    fecha_solicitud: s.fecha_solicitud,
    estado: s.estado,
    total_items: (s.solicitud_items || []).length
  }));

  return NextResponse.json({ solicitudes });
}

async function obtenerOCrearProducto(supabase: any, descripcion: string, um: string) {
  const desc = descripcion.trim();
  const { data: existente } = await supabase
    .from("catalogo_productos")
    .select("id, descripcion, um")
    .ilike("descripcion", desc)
    .maybeSingle();
  if (existente) return existente.id as string;

  const { data: creado, error } = await supabase
    .from("catalogo_productos")
    .insert({ descripcion: desc, um: um || "UND", activo: true })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: creadoAhora } = await supabase
        .from("catalogo_productos")
        .select("id")
        .ilike("descripcion", desc)
        .maybeSingle();
      if (creadoAhora) return creadoAhora.id as string;
    }
    throw new Error(error.message);
  }
  return creado.id as string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { area, solicitante, fecha_solicitud, observaciones, items } = body;

  if (!area || !AREAS.includes(area)) {
    return NextResponse.json({ error: "Selecciona un área válida" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un ítem" }, { status: 400 });
  }
  if (items.some((it: any) => !it.descripcion || !it.cantidad)) {
    return NextResponse.json({ error: "Completa la descripción y la cantidad de todos los ítems" }, { status: 400 });
  }

  const { data: numero, error: errFolio } = await supabase.rpc("siguiente_folio_solicitud");
  if (errFolio) {
    return NextResponse.json({ error: `No se pudo asignar el número: ${errFolio.message}` }, { status: 500 });
  }

  const { data: solicitud, error: errInsert } = await supabase
    .from("solicitudes_pedido")
    .insert({
      numero,
      area,
      solicitante: solicitante || null,
      fecha_solicitud: fecha_solicitud || new Date().toISOString().slice(0, 10),
      observaciones: observaciones || null,
      creado_por: user.id
    })
    .select("id")
    .single();

  if (errInsert || !solicitud) {
    return NextResponse.json({ error: `No se pudo crear la solicitud: ${errInsert?.message}` }, { status: 500 });
  }

  try {
    const itemsParaInsertar = [];
    let posicion = 1;
    for (const it of items) {
      const productoId = await obtenerOCrearProducto(supabase, it.descripcion, it.um || "UND");
      itemsParaInsertar.push({
        solicitud_id: solicitud.id,
        producto_id: productoId,
        posicion: posicion++,
        descripcion: it.descripcion.trim(),
        cantidad: Number(it.cantidad),
        um: it.um || "UND",
        observacion: it.observacion || null
      });
    }
    const { error: errItems } = await supabase.from("solicitud_items").insert(itemsParaInsertar);
    if (errItems) throw new Error(errItems.message);
  } catch (err: any) {
    return NextResponse.json(
      { error: `La solicitud se creó (N.º ${numero}) pero no se pudieron guardar los ítems: ${err.message}`, id: solicitud.id, numero },
      { status: 207 }
    );
  }

  return NextResponse.json({ id: solicitud.id, numero });
}
