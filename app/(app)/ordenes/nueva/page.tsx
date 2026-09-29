import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NuevaOrdenForm from "@/components/NuevaOrdenForm";

export default async function NuevaOrdenPage({
  searchParams
}: {
  searchParams: Promise<{ solicitud?: string; tipo?: string }>;
}) {
  const { solicitud: solicitudId, tipo: tipoParam } = await searchParams;
  const tipo = tipoParam === "SERVICIO" ? "SERVICIO" : "COMPRA";
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social, ruc")
    .eq("activo", true)
    .order("razon_social", { ascending: true });

  let inicial: any = undefined;
  let solicitud: any = null;
  if (solicitudId) {
    const { data } = await supabase
      .from("solicitudes_pedido")
      .select("id, numero, solicitante, proyecto_id, observaciones, orden_id, proyectos(nombre, cliente, numero_orden_trabajo), solicitud_items(*), solicitud_cotizaciones!solicitud_cotizaciones_solicitud_id_fkey(*)")
      .eq("id", solicitudId)
      .single();
    solicitud = data;
  }

  if (solicitud) {
    const cot = (solicitud.solicitud_cotizaciones || []).find((c: any) => c.elegida) || null;
    const items = (solicitud.solicitud_items || [])
      .sort((a: any, b: any) => a.posicion - b.posicion)
      .map((it: any) => ({
        cantidad: String(it.cantidad),
        um: it.um || "UND",
        codigo: "",
        descripcion: it.descripcion,
        entrega: "",
        valor_unitario: ""
      }));
    const p = solicitud.proyectos;
    inicial = {
      tipo,
      proveedor_id: cot?.proveedor_id || "",
      fecha_emision: new Date().toISOString().slice(0, 10),
      moneda: cot?.moneda || "SOLES",
      forma_pago: cot?.forma_pago || "",
      lugar_entrega: "",
      origen: "",
      destino: "",
      fecha_entrega: cot?.plazo_entrega || "",
      centro_costos: p?.numero_orden_trabajo || "",
      doc_relacionado: [`SP N° ${solicitud.numero}`, cot?.proveedor_nombre ? `Cotización ${cot.proveedor_nombre}` : null]
        .filter(Boolean)
        .join(" / "),
      comprador: solicitud.solicitante || "",
      garantia: cot?.garantia || "",
      penalidad: "",
      condiciones_especiales: "",
      observaciones: "",
      incluir_anticorrupcion: true,
      descuento: "",
      proyecto_id: solicitud.proyecto_id || null,
      proyecto_etiqueta: p ? [p.numero_orden_trabajo, p.nombre, p.cliente].filter(Boolean).join(" · ") : "",
      items: items.length > 0 ? items : undefined
    };
  }

  const titulo = tipo === "SERVICIO" ? "Nueva orden de servicio" : "Nueva orden de compra";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">{titulo}</h1>
      {solicitud ? (
        <p className="text-sm text-gray-500 mb-6">
          Generada desde la{" "}
          <Link href={`/solicitudes/${solicitud.id}`} className="text-verde hover:underline">
            solicitud N° {solicitud.numero}
          </Link>
          . Completa los valores unitarios según la cotización elegida y revisa los datos antes de emitir.
          {solicitud.orden_id && <span className="block text-amber-700 mt-1">Ojo: esta solicitud ya tiene una orden emitida.</span>}
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <NuevaOrdenForm
        proveedores={proveedores || []}
        inicial={inicial}
        solicitudId={solicitud?.id || null}
        tipoInicial={tipo}
      />
    </div>
  );
}
