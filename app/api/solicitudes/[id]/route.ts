import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";

export const runtime = "nodejs";

const fmt = (n: number) => String(Number(n.toFixed(4)));

async function obtenerOCrearProducto(supabase: any, descripcion: string, um: string) {
  const desc = descripcion.trim();
  const { data: existente } = await supabase.from("catalogo_productos").select("id").ilike("descripcion", desc).maybeSingle();
  if (existente) return existente.id as string;
  const { data: creado, error } = await supabase
    .from("catalogo_productos")
    .insert({ descripcion: desc, um: um || "UND", activo: true })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: ahora } = await supabase.from("catalogo_productos").select("id").ilike("descripcion", desc).maybeSingle();
      if (ahora) return ahora.id as string;
    }
    throw new Error(error.message);
  }
  return creado.id as string;
}

/**
 * Corrige un ítem de la solicitud (producto, cantidad, U.M., observación).
 * Puede hacerlo el área de compras o quien registró la solicitud, mientras siga abierta.
 * Si el ítem ya tiene algo atendido (OC/OS, compra menor, almacén) no se cambia el producto
 * y la cantidad no puede quedar por debajo de lo ya atendido.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const itemId = String(body.item_id || "");
  const descripcion = String(body.descripcion || "").trim();
  const cantidad = Number(body.cantidad);
  const um = (String(body.um || "UND").trim() || "UND").toUpperCase();
  const observacion = body.observacion ? String(body.observacion).trim() : null;
  if (!itemId) return NextResponse.json({ error: "Falta el ítem" }, { status: 400 });
  if (!descripcion) return NextResponse.json({ error: "La descripción del producto es obligatoria" }, { status: 400 });
  if (!(cantidad > 0)) return NextResponse.json({ error: "La cantidad debe ser mayor a cero" }, { status: 400 });

  const { data: sol } = await supabase.from("solicitudes_pedido").select("id, estado, creado_por").eq("id", id).single();
  if (!sol) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  const perfil = await obtenerPerfil(supabase);
  if (!perfil?.es_compras && sol.creado_por !== user.id) {
    return NextResponse.json({ error: "Solo el área de compras o quien registró la solicitud puede corregir sus ítems" }, { status: 403 });
  }
  if (sol.estado === "anulada" || sol.estado === "atendida") {
    return NextResponse.json({ error: "La solicitud ya está cerrada; no se pueden editar sus ítems" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("solicitud_items")
    .select("id, posicion, descripcion, cantidad, um, observacion, producto_id")
    .eq("id", itemId)
    .eq("solicitud_id", id)
    .single();
  if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  const { data: ats } = await supabase
    .from("solicitud_item_atenciones")
    .select("tipo, cantidad, orden_anulada")
    .eq("item_id", itemId);
  const vigentes = (ats || []).filter((a: any) => !a.orden_anulada);
  const usado = vigentes.reduce((s: number, a: any) => s + Number(a.cantidad || 0), 0);
  const cambiaProducto = descripcion.toLowerCase() !== String(item.descripcion || "").trim().toLowerCase();

  if (vigentes.length > 0 && cambiaProducto) {
    return NextResponse.json(
      { error: "Este ítem ya tiene una atención (OC/OS, compra menor, almacén o anulación); no se puede cambiar el producto. Anula esa atención primero o agrega el producto correcto en una nueva solicitud." },
      { status: 400 }
    );
  }
  if (cantidad + 0.0001 < usado) {
    return NextResponse.json({ error: `La cantidad no puede ser menor a lo ya atendido (${fmt(usado)} ${item.um || "UND"})` }, { status: 400 });
  }

  let productoId = item.producto_id;
  try {
    if (cambiaProducto || !productoId) productoId = await obtenerOCrearProducto(supabase, descripcion, um);
  } catch (e: any) {
    return NextResponse.json({ error: `No se pudo registrar el producto: ${e.message}` }, { status: 500 });
  }

  const { data: actualizado, error } = await supabase
    .from("solicitud_items")
    .update({ descripcion, cantidad, um, observacion, producto_id: productoId })
    .eq("id", itemId)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!actualizado || actualizado.length === 0) {
    return NextResponse.json(
      { error: "La base de datos no permitió guardar el cambio (falta el permiso de edición de ítems). Avisa al administrador del sistema." },
      { status: 403 }
    );
  }

  // queda constancia en el seguimiento
  const cambios: string[] = [];
  if (cambiaProducto) cambios.push(`producto "${item.descripcion}" → "${descripcion}"`);
  if (Number(item.cantidad) !== cantidad || (item.um || "UND") !== um)
    cambios.push(`cantidad ${fmt(Number(item.cantidad))} ${item.um || "UND"} → ${fmt(cantidad)} ${um}`);
  if ((item.observacion || null) !== observacion) cambios.push("observación");
  if (cambios.length) {
    await supabase.rpc("registrar_seguimiento", {
      p_solicitud: id,
      p_estado: null,
      p_comentario: `Ítem ${item.posicion} corregido: ${cambios.join("; ")}`
    });
  }

  return NextResponse.json({ ok: true });
}
