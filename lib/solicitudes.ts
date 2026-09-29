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

export const ESTADOS_ESPECIALES = [
  { value: "observada", label: "Observada", ayuda: "Compras necesita más información del área." },
  { value: "anulada", label: "Anulada", ayuda: "La solicitud fue anulada." }
];

export const ESTADO_LABEL: Record<string, string> = Object.fromEntries(
  [...ETAPAS, ...ESTADOS_ESPECIALES].map((e) => [e.value, e.label])
);

export const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-600",
  en_consulta: "bg-blue-50 text-blue-700",
  en_cotizacion: "bg-indigo-50 text-indigo-700",
  proveedor_elegido: "bg-amber-50 text-amber-700",
  convertida: "bg-verde-claro text-verde-oscuro",
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
