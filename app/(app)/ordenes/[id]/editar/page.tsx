import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NuevaOrdenForm from "@/components/NuevaOrdenForm";

export default async function EditarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: orden } = await supabase
    .from("ordenes_compra")
    .select("*, orden_items(*)")
    .eq("id", id)
    .single();
  if (!orden) notFound();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social, ruc")
    .order("razon_social", { ascending: true });

  const items = (orden.orden_items || []).sort((a: any, b: any) => a.posicion - b.posicion);

  const inicial = {
    proveedor_id: orden.proveedor_id,
    fecha_emision: orden.fecha_emision,
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
    items: items.map((it: any) => ({
      cantidad: String(it.cantidad),
      um: it.um || "UND",
      codigo: it.codigo || "",
      descripcion: it.descripcion,
      entrega: it.entrega || "",
      valor_unitario: String(it.valor_unitario)
    }))
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Editar orden N.º {orden.numero}</h1>
      <NuevaOrdenForm proveedores={proveedores || []} ordenId={id} inicial={inicial} />
    </div>
  );
}
