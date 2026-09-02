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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
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

  const { data: ordenExistente, error: errExistente } = await supabase
    .from("ordenes_compra")
    .select("numero")
    .eq("id", id)
    .single();
  if (errExistente || !ordenExistente) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  const numero = ordenExistente.numero;

  const { data: proveedor, error: errProv } = await supabase
    .from("proveedores")
    .select("*, cuentas_bancarias(banco, cuenta, cci)")
    .eq("id", proveedor_id)
    .single();
  if (errProv || !proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  let opGravadas = 0;
  const itemsCalc = items.map((it: any, idx: number) => {
    const cant = Number(it.cantidad);
    const vunit = Number(it.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    return { posicion: idx + 1, cantidad: cant, um: it.um || "UND", codigo: it.codigo || null, descripcion: it.descripcion, entrega: it.entrega || null, valor_unitario: vunit };
  });
  const subtotal = Math.round(opGravadas * 100) / 100;
  const desc = Math.round((Number(descuento) || 0) * 100) / 100;
  const gravada = Math.round((subtotal - desc) * 100) / 100;
  const igv = Math.round(gravada * 0.18 * 100) / 100;
  const total = Math.round((gravada + igv) * 100) / 100;

  const { error: errUpdate } = await supabase
    .from("ordenes_compra")
    .update({
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
      comprador,
      garantia,
      penalidad,
      condiciones_especiales: condiciones_especiales || [],
      observaciones,
      incluir_anticorrupcion: incluir_anticorrupcion !== false,
      subtotal: desc ? subtotal : null,
      descuento: desc || null,
      igv,
      total
    })
    .eq("id", id);

  if (errUpdate) {
    return NextResponse.json({ error: `No se pudo actualizar la orden: ${errUpdate.message}` }, { status: 500 });
  }

  await supabase.from("orden_items").delete().eq("orden_id", id);
  const { error: errItems } = await supabase.from("orden_items").insert(itemsCalc.map((it) => ({ ...it, orden_id: id })));
  if (errItems) {
    return NextResponse.json({ error: `No se pudieron guardar los ítems: ${errItems.message}` }, { status: 500 });
  }

  const fechaEmisionTexto = new Date((fecha_emision || new Date().toISOString().slice(0, 10)) + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const datosCompletos: OrdenCompraData = {
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

  const numeroPadded = String(numero).padStart(6, "0");
  const provSlug = slug(proveedor.razon_social);
  const pathDocx = `${numero}/OC_${numeroPadded}_${provSlug}.docx`;
  const pathPdf = `${numero}/OC_${numeroPadded}_${provSlug}.pdf`;

  try {
    const [docxBuf, pdfBuf] = await Promise.all([generarOrdenDocx(datosCompletos), generarOrdenPdf(datosCompletos)]);

    await supabase.storage
      .from("documentos-oc")
      .upload(pathDocx, docxBuf, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });
    await supabase.storage.from("documentos-oc").upload(pathPdf, pdfBuf, { contentType: "application/pdf", upsert: true });

    await supabase.from("ordenes_compra").update({ archivo_docx_url: pathDocx, archivo_pdf_url: pathPdf }).eq("id", id);
  } catch (err: any) {
    return NextResponse.json(
      { error: `La orden se actualizó (N.º ${numero}) pero falló la generación de archivos: ${err.message}`, id, numero },
      { status: 207 }
    );
  }

  return NextResponse.json({ id, numero });
}
