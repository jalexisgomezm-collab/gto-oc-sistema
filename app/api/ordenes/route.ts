import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarOrdenDocx } from "@/lib/docx/generarOrdenDocx";
import { generarOrdenPdf } from "@/lib/pdf/generarOrdenPdf";
import type { OrdenCompraData } from "@/lib/types";

export const runtime = "nodejs";

function slug(texto: string) {
  return (texto || "PROVEEDOR")
    .split("")
    .map((c) => (/[a-zA-Z0-9 _-]/.test(c) ? c : "-"))
    .join("")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();

  const tipo = body.tipo === "SERVICIO" ? "SERVICIO" : "COMPRA";
  const {
    proveedor_id,
    fecha_emision,
    moneda,
    forma_pago,
    lugar_entrega,
    origen,
    destino,
    fecha_entrega,
    centro_costos,
    doc_relacionado,
    proyecto_id,
    comprador,
    garantia,
    penalidad,
    condiciones_especiales,
    observaciones,
    incluir_anticorrupcion,
    descuento,
    items
  } = body;

  if (!proveedor_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Faltan datos obligatorios (proveedor o ítems)" }, { status: 400 });
  }

  const { data: proveedor, error: errProv } = await supabase
    .from("proveedores")
    .select("*, cuentas_bancarias(banco, cuenta, cci)")
    .eq("id", proveedor_id)
    .single();
  if (errProv || !proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  // Validar que las cantidades ligadas a la solicitud no superen lo pendiente de cada ítem
  if (body.solicitud_id) {
    const pedidas = new Map<string, number>();
    for (const it of items) {
      if (it.solicitud_item_id) pedidas.set(it.solicitud_item_id, (pedidas.get(it.solicitud_item_id) || 0) + Number(it.cantidad || 0));
    }
    if (pedidas.size > 0) {
      const { data: estados } = await supabase
        .from("v_solicitud_items_estado")
        .select("item_id, posicion, descripcion, cantidad_pendiente, um")
        .in("item_id", Array.from(pedidas.keys()));
      for (const e of (estados as any[]) || []) {
        const pedida = pedidas.get(e.item_id) || 0;
        if (pedida > Number(e.cantidad_pendiente) + 0.0001) {
          return NextResponse.json(
            {
              error: `"${e.descripcion}": pides ${pedida} pero en la solicitud solo quedan ${Number(e.cantidad_pendiente)} ${e.um || "UND"} pendientes. Ajusta la cantidad; si compras de más, agrega el excedente como un ítem aparte.`
            },
            { status: 400 }
          );
        }
      }
    }
  }

  const { data: numero, error: errFolio } = await supabase.rpc("siguiente_folio");
  if (errFolio) {
    return NextResponse.json({ error: `No se pudo asignar el folio: ${errFolio.message}` }, { status: 500 });
  }

  let opGravadas = 0;
  const itemsCalc = items.map((it: any, idx: number) => {
    const cant = Number(it.cantidad);
    const vunit = Number(it.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    return { posicion: idx + 1, cantidad: cant, um: it.um || "UND", codigo: it.codigo || null, descripcion: it.descripcion, entrega: it.entrega || null, valor_unitario: vunit };
  });
  // ítems de la solicitud que cubre esta orden (seguimiento por ítem)
  const vinculos: { posicion: number; item_id: string; cantidad: number }[] = items
    .map((it: any, idx: number) => ({ posicion: idx + 1, item_id: it.solicitud_item_id, cantidad: Number(it.cantidad) }))
    .filter((v: any) => v.item_id && v.cantidad > 0);
  const subtotal = Math.round(opGravadas * 100) / 100;
  const desc = Math.round((Number(descuento) || 0) * 100) / 100;
  const gravada = Math.round((subtotal - desc) * 100) / 100;
  const igv = Math.round(gravada * 0.18 * 100) / 100;
  const total = Math.round((gravada + igv) * 100) / 100;

  const { data: ordenInsertada, error: errInsert } = await supabase
    .from("ordenes_compra")
    .insert({
      tipo,
      numero,
      proveedor_id,
      fecha_emision: fecha_emision || new Date().toISOString().slice(0, 10),
      moneda: moneda || "SOLES",
      forma_pago,
      lugar_entrega,
      origen,
      destino,
      fecha_entrega,
      centro_costos,
      doc_relacionado,
      proyecto_id: proyecto_id || null,
      comprador,
      garantia,
      penalidad,
      condiciones_especiales: condiciones_especiales || [],
      observaciones,
      incluir_anticorrupcion: incluir_anticorrupcion !== false,
      subtotal: desc ? subtotal : null,
      descuento: desc || null,
      igv,
      total,
      creado_por: user.id
    })
    .select("id")
    .single();

  if (errInsert || !ordenInsertada) {
    return NextResponse.json({ error: `No se pudo crear la orden: ${errInsert?.message}` }, { status: 500 });
  }
  const ordenId = ordenInsertada.id;
  const solicitudId: string | null = body.solicitud_id || null;

  const { data: itemsGuardados, error: errItems } = await supabase
    .from("orden_items")
    .insert(itemsCalc.map((it) => ({ ...it, orden_id: ordenId })))
    .select("id, posicion");
  if (errItems) {
    return NextResponse.json({ error: `No se pudieron guardar los ítems: ${errItems.message}` }, { status: 500 });
  }

  const fechaEmisionTexto = new Date((fecha_emision || new Date().toISOString().slice(0, 10)) + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const datosCompletos: OrdenCompraData = {
    tipo,
    numero,
    fecha_emision: fechaEmisionTexto,
    moneda: (moneda || "SOLES") as any,
    forma_pago,
    lugar_entrega,
    origen,
    destino,
    fecha_entrega,
    centro_costos,
    doc_relacionado,
    comprador,
    garantia,
    penalidad,
    condiciones_especiales: condiciones_especiales || [],
    observaciones,
    incluir_anticorrupcion: incluir_anticorrupcion !== false,
    subtotal: desc ? subtotal : null,
    descuento: desc || null,
    igv,
    total,
    proveedor: proveedor as any,
    items: itemsCalc as any
  };

  async function vincular() {
    if (!solicitudId) return null;
    const pItems = vinculos.map((v) => ({
      item_id: v.item_id,
      cantidad: v.cantidad,
      orden_item_id: (itemsGuardados || []).find((g: any) => g.posicion === v.posicion)?.id || null
    }));
    const { error } = await supabase.rpc("vincular_orden_items", { p_solicitud: solicitudId, p_orden: ordenId, p_items: pItems });
    return error;
  }

  const numeroPadded = String(numero).padStart(6, "0");
  const provSlug = slug(proveedor.razon_social);
  const prefijo = tipo === "SERVICIO" ? "OS" : "OC";
  const pathDocx = `${numero}/${prefijo}_${numeroPadded}_${provSlug}.docx`;
  const pathPdf = `${numero}/${prefijo}_${numeroPadded}_${provSlug}.pdf`;

  try {
    const [docxBuf, pdfBuf] = await Promise.all([generarOrdenDocx(datosCompletos), generarOrdenPdf(datosCompletos)]);

    await supabase.storage
      .from("documentos-oc")
      .upload(pathDocx, docxBuf, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });
    await supabase.storage.from("documentos-oc").upload(pathPdf, pdfBuf, { contentType: "application/pdf", upsert: true });

    await supabase.from("ordenes_compra").update({ archivo_docx_url: pathDocx, archivo_pdf_url: pathPdf }).eq("id", ordenId);
  } catch (err: any) {
    await vincular();
    return NextResponse.json(
      { error: `La orden se guardó (N.º ${numero}) pero falló la generación de archivos: ${err.message}`, id: ordenId, numero },
      { status: 207 }
    );
  }

  if (solicitudId) {
    const errVinculo = await vincular();
    if (errVinculo) {
      return NextResponse.json(
        { error: `La orden N.º ${numero} se emitió, pero no se pudo actualizar la solicitud: ${errVinculo.message}`, id: ordenId, numero },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ id: ordenId, numero });
}