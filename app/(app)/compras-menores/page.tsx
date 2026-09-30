import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { AREA_LABEL, COMPROBANTE_LABEL, MEDIO_PAGO_LABEL, dinero, obtenerLimitesCompraMenor, textoLimitesCM, totalesPorMoneda } from "@/lib/solicitudes";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function sumarPor(filas: any[], clave: (r: any) => string) {
  const m: Record<string, { filas: any[]; n: number; orden: number }> = {};
  for (const r of filas) {
    const k = clave(r);
    m[k] ||= { filas: [], n: 0, orden: 0 };
    m[k].filas.push(r);
    m[k].n += 1;
    m[k].orden += Number(r.monto) * (r.moneda === "DOLARES" ? 3.7 : 1); // solo para ordenar
  }
  return Object.entries(m)
    .sort((a, b) => b[1].orden - a[1].orden)
    .map(([k, v]) => [k, { texto: totalesPorMoneda(v.filas), n: v.n }] as [string, { texto: string; n: number }]);
}

export default async function ComprasMenoresPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: mesParam } = await searchParams;
  const supabase = await createClient();
  const perfil = await obtenerPerfil(supabase);
  if (!perfil?.es_compras) redirect("/solicitudes");

  const hoy = new Date();
  const mes = /^\d{4}-\d{2}$/.test(mesParam || "") ? (mesParam as string) : hoy.toISOString().slice(0, 7);
  const [anio, m] = mes.split("-").map(Number);
  const desde = `${mes}-01`;
  const siguiente = m === 12 ? `${anio + 1}-01-01` : `${anio}-${String(m + 1).padStart(2, "0")}-01`;
  const anterior = m === 1 ? `${anio - 1}-12` : `${anio}-${String(m - 1).padStart(2, "0")}`;
  const posterior = m === 12 ? `${anio + 1}-01` : `${anio}-${String(m + 1).padStart(2, "0")}`;

  const [{ data }, limites] = await Promise.all([
    supabase
      .from("solicitud_compras_menores")
      .select("*, solicitudes_pedido(id, numero, area, solicitante, proyectos(numero_orden_trabajo, nombre))")
      .gte("fecha", desde)
      .lt("fecha", siguiente)
      .order("fecha", { ascending: false }),
    obtenerLimitesCompraMenor(supabase)
  ]);
  const filas = (data as any[]) || [];
  const total = totalesPorMoneda(filas);
  const porArea = sumarPor(filas, (r) => AREA_LABEL[r.solicitudes_pedido?.area] || r.solicitudes_pedido?.area || "—");
  const porOT = sumarPor(filas, (r) => {
    const p = r.solicitudes_pedido?.proyectos;
    return p ? [p.numero_orden_trabajo, p.nombre].filter(Boolean).join(" · ") : "Abastecimiento general";
  });
  const porMedio = sumarPor(filas, (r) => MEDIO_PAGO_LABEL[r.medio_pago] || r.medio_pago);

  const Resumen = ({ titulo, datos }: { titulo: string; datos: [string, { texto: string; n: number }][] }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{titulo}</p>
      {datos.length === 0 && <p className="text-sm text-gray-400">—</p>}
      <ul className="space-y-1">
        {datos.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3 text-sm">
            <span className="truncate">
              {k} <span className="text-xs text-gray-400">({v.n})</span>
            </span>
            <span className="whitespace-nowrap font-medium">{v.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Compras menores</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/compras-menores?mes=${anterior}`} className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50">
            ←
          </Link>
          <span className="font-medium w-36 text-center">
            {MESES[m - 1]} {anio}
          </span>
          <Link href={`/compras-menores?mes=${posterior}`} className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50">
            →
          </Link>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Requerimientos atendidos sin cotización ni OC (el total por solicitud debe ser {textoLimitesCM(limites)}). Total del mes:{" "}
        <b className="text-gray-800">{total}</b> en {filas.length} compra(s).
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Resumen titulo="Por área" datos={porArea} />
        <Resumen titulo="Por OT / proyecto" datos={porOT} />
        <Resumen titulo="Por medio de pago" datos={porMedio} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Solicitud</th>
              <th className="text-left px-4 py-2">Área</th>
              <th className="text-left px-4 py-2">Dónde se compró</th>
              <th className="text-left px-4 py-2">Comprobante</th>
              <th className="text-left px-4 py-2">Pago</th>
              <th className="text-right px-4 py-2">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 whitespace-nowrap">{r.fecha}</td>
                <td className="px-4 py-2">
                  <Link href={`/solicitudes/${r.solicitud_id}`} className="text-verde hover:underline">
                    N° {r.solicitudes_pedido?.numero}
                  </Link>
                  {r.solicitudes_pedido?.proyectos?.numero_orden_trabajo && (
                    <span className="block text-xs text-gray-400">{r.solicitudes_pedido.proyectos.numero_orden_trabajo}</span>
                  )}
                </td>
                <td className="px-4 py-2">{AREA_LABEL[r.solicitudes_pedido?.area] || r.solicitudes_pedido?.area}</td>
                <td className="px-4 py-2">{r.proveedor}</td>
                <td className="px-4 py-2 text-gray-600">
                  {COMPROBANTE_LABEL[r.comprobante_tipo] || r.comprobante_tipo} {r.comprobante_numero || ""}
                </td>
                <td className="px-4 py-2 text-gray-600">{MEDIO_PAGO_LABEL[r.medio_pago] || r.medio_pago}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">{dinero(Number(r.monto), r.moneda)}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No hay compras menores registradas en este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
