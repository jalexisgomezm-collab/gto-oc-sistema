import { EMPRESA } from "@/lib/empresa";

/**
 * Términos y Condiciones Generales de las órdenes de compra / servicio de GTO PERÚ.
 * Un solo texto para el PDF, el Word y la pantalla de detalle (se adapta a bienes o servicios
 * y a los datos de cada orden).
 */

export interface DatosTerminos {
  tipo?: string | null;
  numero: number | string;
  moneda?: string | null;
  total?: number | null;
  doc_relacionado?: string | null;
  forma_pago?: string | null;
  fecha_entrega?: string | null;
  lugar_entrega?: string | null;
  origen?: string | null;
  destino?: string | null;
  comprador?: string | null;
  garantia?: string | null;
  penalidad?: string | null;
  incluir_anticorrupcion?: boolean | null;
  proveedor?: { razon_social?: string | null; ruc?: string | null } | null;
  items?: { descripcion?: string | null }[] | null;
}

export interface Clausula {
  titulo: string;
  texto: string;
}

export interface Terminos {
  titulo: string;
  subtitulo: string;
  datos: [string, string][];
  clausulas: Clausula[];
  cierre: string;
}

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CORREO_ADMINISTRACION = EMPRESA.correos.split(" | ")[1] || EMPRESA.correos.split(" | ")[0];

export function terminosOrden(d: DatosTerminos): Terminos {
  const servicio = d.tipo === "SERVICIO";
  const sigla = servicio ? "OS" : "OC";
  const ref = `${sigla} N.° ${d.numero}`;
  const correo = CORREO_ADMINISTRACION;
  const sym = (d.moneda || "").toUpperCase().startsWith("DOLAR") ? "US$" : "S/";
  const ruta = (d.origen || d.destino ? [d.origen, d.destino].filter(Boolean).join(" - ") : "") || d.lugar_entrega || "";
  const lugar = d.lugar_entrega || ruta || "el lugar indicado en la orden";
  const items = (d.items || []).map((i) => (i.descripcion || "").trim()).filter(Boolean);
  const objeto = items.length === 0 ? "" : items.length === 1 ? items[0] : `${items[0]} y ${items.length - 1} ítem(s) más`;
  const cotizacion = (d.doc_relacionado || "").trim();

  const clausulas: Clausula[] = [
    {
      titulo: "Aceptación de la orden",
      texto:
        `El proveedor deberá confirmar por escrito la recepción de esta orden y la aceptación de sus términos dentro de los dos (2) días calendario siguientes a su envío. ` +
        `Si en ese plazo no comunica observaciones o su rechazo por escrito, la orden se considerará aceptada en todos sus términos. ` +
        (servicio
          ? "El inicio del servicio, la movilización de personal o unidades, o la emisión del comprobante de pago también constituyen aceptación."
          : "El despacho de los bienes o la emisión del comprobante de pago también constituyen aceptación.")
    },
    {
      titulo: "Alcance y documentos contractuales",
      texto:
        `Forman parte de esta orden ${cotizacion ? `la cotización / documento ${cotizacion}, ` : "la cotización del proveedor, "}` +
        `${servicio ? "el detalle del servicio" : "las especificaciones técnicas de los bienes"} y estos términos. ` +
        `Ante cualquier diferencia prevalece la orden de ${servicio ? "servicio" : "compra"}; toda excepción solo es válida si GTO PERÚ la aprueba por escrito.`
    },
    {
      titulo: "Precios y modificaciones",
      texto:
        `Los precios son fijos y no están sujetos a reajuste. Incluyen todo lo necesario para ${servicio ? "prestar el servicio" : "entregar los bienes"} en ${lugar} ` +
        `(embalaje, transporte, seguros, tributos aplicables y demás costos), salvo que la orden indique otra cosa. ` +
        `No se aceptarán variaciones, recargos ni cambios de ${servicio ? "alcance, ruta, unidad, personal" : "cantidad, marca, modelo o especificación"} o fecha sin autorización previa y escrita de GTO PERÚ.`
    },
    {
      titulo: servicio ? "Ejecución del servicio" : "Entrega de los bienes",
      texto: servicio
        ? `El servicio se ejecutará ${ruta ? `en ${ruta}` : "en el lugar indicado"} y en el plazo coordinado${d.fecha_entrega ? ` (${d.fecha_entrega})` : ""}. ` +
          "No se permiten subcontrataciones, sustituciones de unidades o de personal, ni ejecuciones parciales sin autorización previa de GTO PERÚ cuando afecten el alcance contratado."
        : `Los bienes se entregarán en ${lugar} en el plazo indicado${d.fecha_entrega ? ` (${d.fecha_entrega})` : ""}. ` +
          "No se aceptan entregas parciales ni productos sustitutos sin autorización previa. El riesgo de pérdida o daño pasa a GTO PERÚ recién cuando recibe los bienes conformes en el lugar de entrega."
    },
    {
      titulo: "Calidad y garantía",
      texto: servicio
        ? "El servicio se prestará con personal calificado, equipos y unidades en buen estado y conforme a las buenas prácticas del rubro. " +
          `${d.garantia ? `Garantía: ${d.garantia}. ` : ""}El proveedor corregirá sin costo cualquier deficiencia que le sea atribuible.`
        : "Los bienes deben ser nuevos, originales, de primera calidad y cumplir la marca, especificaciones y normas técnicas solicitadas. " +
          `El proveedor los garantiza contra defectos de fabricación y vicios ocultos por ${d.garantia ? d.garantia : "el plazo del fabricante y, como mínimo, doce (12) meses desde su recepción"}, ` +
          "y repondrá o reparará sin costo lo que resulte defectuoso."
    },
    {
      titulo: "Documentación",
      texto:
        "El proveedor entregará, según corresponda, guía de remisión, certificados de calidad u origen, fichas técnicas, hojas de seguridad (SDS/MSDS), " +
        `${servicio ? "constancia o informe del servicio, permisos de transporte, pólizas" : "manuales"} y demás documentos exigibles. Todos deberán consignar la ${ref}.`
    },
    {
      titulo: "Seguridad, salud y medio ambiente",
      texto:
        "El proveedor cumplirá la normativa de seguridad y salud en el trabajo, medio ambiente y transporte aplicable, así como las políticas de GTO PERÚ y de su cliente final. " +
        "Si ingresa a instalaciones controladas presentará SCTR vigente, IPERC y PETS, y su personal usará el EPP requerido. " +
        "Para materiales peligrosos o fiscalizados adjuntará la hoja de seguridad, la identificación ONU y los permisos correspondientes."
    },
    {
      titulo: "Embalaje, rotulado y custodia",
      texto:
        `La carga deberá estar correctamente embalada, rotulada (con la ${ref}, descripción y cantidad) y asegurada para su transporte. ` +
        "El proveedor responde por su custodia hasta la entrega conforme y comunicará de inmediato cualquier incidente, daño, pérdida o desviación."
    },
    {
      titulo: "Inspección y conformidad",
      texto:
        `GTO PERÚ podrá inspeccionar ${servicio ? "el servicio" : "los bienes"} antes de otorgar su conformidad, y el pago está sujeto a ella. ` +
        `Lo que no se ajuste a lo solicitado podrá ser observado o rechazado; el proveedor deberá subsanarlo o reemplazarlo en el plazo que se le indique, sin costos adicionales, ` +
        "y asumirá los costos de devolución. La conformidad no libera al proveedor de su responsabilidad por vicios ocultos."
    },
    {
      titulo: "Retrasos y penalidad",
      texto:
        (d.penalidad
          ? `Penalidad pactada: ${d.penalidad}. `
          : "Por cada día de retraso atribuible al proveedor se aplicará una penalidad de cinco por mil (0.5 %) del monto de la orden sin IGV, hasta un máximo del diez por ciento (10 %) de dicho monto. ") +
        "No se aceptan postergaciones no autorizadas. La penalidad podrá descontarse de los pagos pendientes y no aplica ante fuerza mayor debidamente acreditada y comunicada por escrito dentro de los tres (3) días de ocurrido el hecho."
    },
    {
      titulo: "Facturación y pago",
      texto:
        `La factura electrónica deberá consignar la ${ref}, adjuntar los documentos de sustento y la conformidad, y enviarse a ${correo}. ` +
        `El plazo de pago${d.forma_pago ? ` (${d.forma_pago})` : ""} se cuenta desde la recepción de la factura correcta y la conformidad. ` +
        "Las facturas con errores u omisiones serán devueltas y el plazo correrá desde su corrección."
    },
    {
      titulo: "Retenciones y detracciones",
      texto:
        "GTO PERÚ aplicará las retenciones, detracciones u otras obligaciones tributarias que correspondan legalmente. " +
        "El proveedor deberá consignar su cuenta de detracciones y la información exigible en sus comprobantes."
    },
    {
      titulo: "Compensación y retención de pagos",
      texto:
        "GTO PERÚ podrá retener los pagos pendientes hasta la subsanación de observaciones documentarias, operativas o de conformidad, " +
        "y compensar con ellos las penalidades, daños o costos debidamente sustentados atribuibles al proveedor, conforme a ley."
    },
    {
      titulo: "Responsabilidad e indemnidad",
      texto:
        "El proveedor responde por los daños que cause a GTO PERÚ, a sus clientes o a terceros por el incumplimiento de esta orden o por actos de su personal, " +
        "y mantendrá indemne a GTO PERÚ frente a reclamos laborales, previsionales, tributarios o de terceros derivados de su actividad. Su personal no tiene vínculo laboral con GTO PERÚ."
    },
    {
      titulo: "Confidencialidad",
      texto:
        "La información técnica, comercial y de clientes que el proveedor reciba con motivo de esta orden es confidencial; no podrá divulgarla ni usarla para otros fines sin autorización escrita de GTO PERÚ."
    },
    {
      titulo: "Resolución",
      texto:
        "GTO PERÚ podrá resolver total o parcialmente esta orden, mediante comunicación escrita, ante el incumplimiento del proveedor, al alcanzarse el tope de penalidad " +
        "o por fuerza mayor, pagando únicamente lo recibido o ejecutado conforme hasta esa fecha."
    },
    {
      titulo: d.incluir_anticorrupcion === false ? "Conflicto de interés" : "Ética, anticorrupción y conflicto de interés",
      texto:
        (d.incluir_anticorrupcion === false
          ? ""
          : "Las partes cumplirán la legislación anticorrupción y antisoborno y se abstendrán de ofrecer, entregar o aceptar pagos o beneficios indebidos. ") +
        "El proveedor informará cualquier conflicto de interés y conservará registros completos y veraces de las operaciones relacionadas con esta orden."
    },
    {
      titulo: "Comunicaciones",
      texto:
        `Las coordinaciones operativas se realizarán con el solicitante o comprador designado${d.comprador ? ` (${d.comprador})` : ""}. ` +
        `Las comunicaciones contractuales, de facturación y cualquier cambio de alcance solo serán válidas si se remiten por escrito a ${correo}.`
    },
    {
      titulo: "Ley aplicable y controversias",
      texto:
        "Esta orden se rige por las leyes de la República del Perú. Las partes procurarán resolver de buena fe cualquier controversia; de no lograrlo, " +
        "se someten a la jurisdicción de los jueces y tribunales del distrito judicial de Lima."
    }
  ];

  return {
    titulo: "TÉRMINOS Y CONDICIONES GENERALES",
    subtitulo: `Orden de ${servicio ? "Servicio" : "Compra"} ${ref}  |  GTO PERÚ S.A.C.`,
    datos: [
      ["PROVEEDOR", d.proveedor?.razon_social || "—"],
      ["RUC", d.proveedor?.ruc || "—"],
      ["REFERENCIA", cotizacion || "—"],
      ["TOTAL", d.total != null ? `${sym} ${money(Number(d.total))}` : "—"],
      [servicio ? "SERVICIO" : "BIENES", objeto || "—"],
      [servicio ? "RUTA / LUGAR" : "LUGAR DE ENTREGA", d.lugar_entrega || ruta || "—"],
      ["COMPRADOR", d.comprador || "—"],
      ["CORREO", correo]
    ],
    clausulas,
    cierre: `La aceptación de la ${ref} confirma la lectura y conformidad con estos términos y condiciones, sin perjuicio de las normas imperativas aplicables.`
  };
}
