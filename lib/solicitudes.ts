export const AREAS = [
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "TALLER", label: "Taller" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "ADMINISTRACION", label: "Administración" }
];

export const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));

/** Etapas del requerimiento, en el orden en que avanza. */
export const ETAPAS = [
  { value: "pendiente", label: "Pendiente", ayuda: "Recibida por compras, aún sin atender." },
  { value: "en_consulta", label: "En consulta", ayuda: "Compras está consultando a proveedores (precios, stock, plazos)." },
  { value: "en_cotizacion", label: "En cotización", ayuda: "Compras recibió cotizaciones y las está comparando." },
  { value: "proveedor_elegido", label: "Proveedor elegido", ayuda: "Se eligió el mejor proveedor; falta emitir la orden." },
  { value: "convertida", label: "OC / OS emitida", ayuda: "Se emitió la orden de compra o de servicio al proveedor." },
  { value: "atendida", label: "Atendido", ayuda: "El pedido fue entregado al área." }
];

/** Camino corto: compra menor (sin cotizaciones ni OC). */
export const ETAPAS_COMPRA_MENOR = [
  { value: "pendiente", label: "Pendiente", ayuda: "Recibida por compras, aún sin atender." },
  { value: "compra_menor", label: "Comprado", ayuda: "Compras hizo la compra menor; falta entregarla al área." },
  { value: "atendida", label: "Atendido", ayuda: "El pedido fue entregado al área." }
];

/** Camino corto: se entrega desde el stock de almacén. */
export const ETAPAS_ALMACEN = [
  { value: "pendiente", label: "Pendiente", ayuda: "Recibida por compras, aún sin atender." },
  { value: "atendida", label: "Entregado desde almacén", ayuda: "Se atendió con stock existente, sin comprar." }
];

export function etapasPara(via: string | null | undefined) {
  if (via === "MIXTA") return ETAPAS;
  if (via === "COMPRA_MENOR") return ETAPAS_COMPRA_MENOR;
  if (via === "ALMACEN") return ETAPAS_ALMACEN;
  return ETAPAS;
}

export const VIA_LABEL: Record<string, string> = {
  NORMAL: "Proceso normal (cotización y OC/OS)",
  COMPRA_MENOR: "Compra menor",
  ALMACEN: "Atendido desde almacén",
  MIXTA: "Mixta (por ítems: OC/OS, compra menor y/o almacén)"
};

export const MEDIO_PAGO_LABEL: Record<string, string> = {
  CAJA_CHICA: "Caja chica",
  TARJETA: "Tarjeta de la empresa",
  REEMBOLSO: "Reembolso al trabajador",
  OTRO: "Otro"
};

export const COMPROBANTE_LABEL: Record<string, string> = {
  BOLETA: "Boleta",
  FACTURA: "Factura",
  TICKET: "Ticket",
  RECIBO: "Recibo",
  OTRO: "Otro"
};

export const ESTADOS_ESPECIALES = [
  { value: "observada", label: "Observada", ayuda: "Compras necesita más información del área." },
  { value: "anulada", label: "Anulada", ayuda: "La solicitud fue anulada." }
];

export const ESTADO_LABEL: Record<string, string> = {
  ...Object.fromEntries([...ETAPAS, ...ESTADOS_ESPECIALES].map((e) => [e.value, e.label])),
  compra_menor: "Comprado (compra menor)",
  atendida_parcial: "Atendido parcial"
};

export const AYUDA_PARCIAL = "Parte de los ítems ya se pidió, compró o entregó; faltan otros (ver el detalle por ítem).";

export const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-600",
  en_consulta: "bg-blue-50 text-blue-700",
  en_cotizacion: "bg-indigo-50 text-indigo-700",
  proveedor_elegido: "bg-amber-50 text-amber-700",
  convertida: "bg-verde-claro text-verde-oscuro",
  compra_menor: "bg-teal-50 text-teal-700",
  atendida_parcial: "bg-lime-100 text-lime-800",
  atendida: "bg-verde text-white",
  observada: "bg-orange-100 text-orange-700",
  anulada: "bg-red-50 text-red-600"
};

export const PRIORIDAD_ESTILO: Record<string, string> = {
  ALTA: "bg-red-100 text-red-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAJA: "bg-gray-100 text-gray-500"
};

export const PRIORIDAD_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export const TIPO_ORDEN_LABEL: Record<string, string> = { COMPRA: "Orden de compra", SERVICIO: "Orden de servicio" };
export const TIPO_ORDEN_CORTO: Record<string, string> = { COMPRA: "OC", SERVICIO: "OS" };

export const MINIMO_COTIZACIONES = 3;

// ------------------------------------------------------------------ atención por ítem

export interface AtencionItem {
  id: string;
  item_id: string;
  tipo: "ORDEN" | "COMPRA_MENOR" | "ALMACEN" | "ANULADO";
  cantidad: number;
  orden_id: string | null;
  orden_numero: number | null;
  orden_tipo: string | null;
  orden_anulada: boolean;
  proveedor: string | null;
  entregado: boolean;
  entregado_at: string | null;
  comentario: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

export interface EstadoItem {
  atendida: number;
  pendiente: number;
  entregada: number;
  anulada: number;
  clave: "pendiente" | "parcial" | "pedido" | "comprado" | "entregado" | "anulado";
  etiqueta: string;
  estilo: string;
}

const redondear = (v: number) => Math.round(v * 1000) / 1000;
export const fmtCant = (v: number) => String(redondear(Number(v) || 0));

/** Estado de un ítem a partir de sus atenciones vigentes (las de órdenes anuladas no cuentan). */
export function estadoItem(cantidad: number, atenciones: AtencionItem[]): EstadoItem {
  const vig = atenciones.filter((a) => !a.orden_anulada);
  const suma = (f: (a: AtencionItem) => boolean) => redondear(vig.filter(f).reduce((s, a) => s + Number(a.cantidad), 0));
  const atendida = suma(() => true);
  const anulada = suma((a) => a.tipo === "ANULADO");
  const entregada = suma((a) => a.tipo !== "ANULADO" && a.entregado);
  const pendiente = Math.max(0, redondear(Number(cantidad) - atendida));
  const cant = Number(cantidad);
  let clave: EstadoItem["clave"];
  if (anulada >= cant) clave = "anulado";
  else if (atendida <= 0) clave = "pendiente";
  else if (pendiente > 0) clave = "parcial";
  else if (entregada + anulada >= cant) clave = "entregado";
  else if (vig.some((a) => a.tipo === "ORDEN" && !a.entregado)) clave = "pedido";
  else clave = "comprado";
  const ETQ: Record<EstadoItem["clave"], [string, string]> = {
    pendiente: ["Pendiente", "bg-gray-100 text-gray-600"],
    parcial: [`Parcial: ${fmtCant(atendida)} de ${fmtCant(cant)}`, "bg-lime-100 text-lime-800"],
    pedido: ["Pedido al proveedor", "bg-verde-claro text-verde-oscuro"],
    comprado: ["Comprado, por entregar", "bg-teal-50 text-teal-700"],
    entregado: ["Entregado", "bg-verde text-white"],
    anulado: ["Anulado", "bg-red-50 text-red-600"]
  };
  return { atendida, pendiente, entregada, anulada, clave, etiqueta: ETQ[clave][0], estilo: ETQ[clave][1] };
}

/** Texto corto de una atención: "OC N° 276 · Rodamientos del Sur" */
export function textoAtencion(a: AtencionItem) {
  if (a.tipo === "ORDEN") {
    const t = TIPO_ORDEN_CORTO[a.orden_tipo || "COMPRA"] || "OC";
    return `${t} N° ${a.orden_numero ?? "—"}${a.proveedor ? ` · ${a.proveedor}` : ""}${a.orden_anulada ? " (orden anulada)" : ""}`;
  }
  if (a.tipo === "COMPRA_MENOR") return `Compra menor${a.proveedor ? ` · ${a.proveedor}` : ""}`;
  if (a.tipo === "ALMACEN") return "Desde almacén";
  return `Anulado${a.comentario ? `: ${a.comentario}` : ""}`;
}
