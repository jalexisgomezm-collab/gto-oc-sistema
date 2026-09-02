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
  const id = searchParams.get("id");
  const q = searchParams.get("q");

  // ------------------------------------------------------------ por id
  if (id) {
    const { data: orden, error } = await supabase
      .from("ordenes_compra")
      .select("*, proveedores(razon_social, ruc), orden_items(*)")
      .eq("id", id)
      .single();

    if (error || !orden) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const items = (orden.orden_items || [])
      .sort((a: any, b: any) => a.posicion - b.posicion)
      .map((it: any) => ({
        cantidad: String(it.cantidad),
        um: it.um || "UND",
        codigo: it.codigo || "",
        descripcion: it.descripcion,
        entrega: it.entrega || "",
        valor_unitario: String(it.valor_unitario)
      }));

    const plantilla = {
      proveedor_id: orden.proveedor_id,
      moneda: orden.moneda,
      forma_pago: orden.forma_pago || "",
      lugar_entrega: orden.lugar_entrega || "",
      origen: orden.origen || "",
      destino: orden.destino || "",
      fecha_entrega: orden.fecha_entrega || "",
      centro_costos: orden.centro_costos || "",
      doc_relacionado: orden.doc_relacionado || "",
      comprador: orden.comprador || "",
      garantia: orden.garantia || "",
      penalidad: orden.penalidad || "",
      condiciones_especiales: (orden.condiciones_especiales || []).join("\n"),
      observaciones: orden.observaciones || "",
      incluir_anticorrupcion: orden.incluir_anticorrupcion !== false,
      descuento: orden.descuento ? String(orden.descuento) : "",
      items: items.length > 0 ? items : undefined
    };

    return NextResponse.json({
      plantilla,
      numero: orden.numero,
      proveedor: orden.proveedores || null
    });
  }

  // -------------------------------------------------------- por búsqueda
  const texto = (q || "").trim();
  if (texto.length < 2) {
    return NextResponse.json({ resultados: [] });
  }
  const textoSeguro = texto.replace(/[%,]/g, "");

  const resultadosMap = new Map<string, any>();

  if (textoSeguro) {
    const { data: provsMatch } = await supabase
      .from("proveedores")
      .select("id")
      .or(`razon_social.ilike.%${textoSeguro}%,ruc.ilike.%${textoSeguro}%`)
      .limit(15);
    const proveedorIds = (provsMatch || []).map((p: any) => p.id);

    if (proveedorIds.length > 0) {
      const { data: ordenesProv } = await supabase
        .from("ordenes_compra")
        .select("id, numero, fecha_emision, proveedores(razon_social, ruc)")
        .in("proveedor_id", proveedorIds)
        .order("numero", { ascending: false })
        .limit(8);
      for (const o of ordenesProv || []) resultadosMap.set(o.id, o);
    }
  }

  if (/^\d+$/.test(texto)) {
    const { data: ordenPorNumero } = await supabase
      .from("ordenes_compra")
      .select("id, numero, fecha_emision, proveedores(razon_social, ruc)")
      .eq("numero", Number(texto))
      .limit(1);
    for (const o of ordenPorNumero || []) resultadosMap.set(o.id, o);
  }

  const resultados = Array.from(resultadosMap.values())
    .sort((a: any, b: any) => b.numero - a.numero)
    .slice(0, 8);

  return NextResponse.json({ resultados });
}
