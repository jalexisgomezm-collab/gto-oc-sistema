import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  ShadingType,
  ImageRun,
  Footer,
  Header,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  PageNumber,
  TableLayoutType
} from "docx";
import fs from "node:fs";
import path from "node:path";
import { EMPRESA, GRIS_TEXTO_HEX, FUENTE, VERDE_HEX, VERDE_CLARO_HEX } from "@/lib/empresa";
import { montoALetras } from "@/lib/numeroALetras";
import type { OrdenCompraData } from "@/lib/types";

// Formato con recuadros sobre la hoja membretada de GTO PERU, igual al PDF
const CM_A_TWIPS = 566.929;
const cm = (v: number) => Math.round(v * CM_A_TWIPS);
const pt = (v: number) => Math.round(v * 20);
const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VERDE = VERDE_HEX;
const VERDE_CLARO = VERDE_CLARO_HEX;
const VERDE_OSCURO = "016B39";
const BLANCO = "FFFFFF";
const GRIS_CAB = VERDE;
const NEGRO = { style: BorderStyle.SINGLE, size: 6, color: "8FBFA3" };
const NINGUNO = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const B_NEGRO = { top: NEGRO, bottom: NEGRO, left: NEGRO, right: NEGRO };
const B_NINGUNO = { top: NINGUNO, bottom: NINGUNO, left: NINGUNO, right: NINGUNO };
const T_NINGUNO = { ...B_NINGUNO, insideHorizontal: NINGUNO, insideVertical: NINGUNO };
const T_NEGRO = { ...B_NEGRO, insideHorizontal: NEGRO, insideVertical: NEGRO };

function run(text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, bold: !!o.bold, italics: !!o.italics, size: Math.round((o.size ?? 8) * 2), font: FUENTE, color: o.color });
}
function par(children: TextRun[], o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}) {
  return new Paragraph({ alignment: o.align, spacing: { before: pt(o.before ?? 0), after: pt(o.after ?? 2) }, children });
}
/** "Etiqueta: valor" en negrita + normal; los saltos de línea del valor se respetan. */
function filaDato(label: string, valor: string, size = 8) {
  const partes = (valor || "—").split("\n");
  const runs: TextRun[] = [run(`${label} `, { bold: true, size, color: VERDE_OSCURO })];
  partes.forEach((p, i) => runs.push(new TextRun({ text: p, size: size * 2, font: FUENTE, break: i > 0 ? 1 : undefined })));
  return par(runs, { after: 2 });
}
function celda(
  children: (Paragraph | Table)[],
  o: { w: number; bordes?: "negro" | "ninguno"; fill?: string; valign?: (typeof VerticalAlign)[keyof typeof VerticalAlign]; margen?: number }
) {
  const m = o.margen ?? 70;
  return new TableCell({
    children,
    width: { size: o.w, type: WidthType.DXA },
    borders: o.bordes === "negro" ? B_NEGRO : B_NINGUNO,
    shading: o.fill || o.bordes === "negro" ? { type: ShadingType.CLEAR, fill: o.fill || BLANCO, color: "auto" } : undefined,
    verticalAlign: o.valign,
    margins: { top: m, bottom: m, left: m + 30, right: m + 30 }
  });
}
function tabla(filas: TableRow[], anchos: number[], bordes: "negro" | "ninguno" = "ninguno") {
  return new Table({
    rows: filas,
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: bordes === "negro" ? T_NEGRO : T_NINGUNO
  });
}
const vacio = (after = 0) => new Paragraph({ spacing: { before: 0, after: pt(after) }, children: [] });

export async function generarOrdenDocx(data: OrdenCompraData): Promise<Buffer> {
  const esServicio = data.tipo === "SERVICIO";
  const numeroPadded = String(data.numero).padStart(6, "0");
  const prov = data.proveedor;
  const moneda = data.moneda || "SOLES";
  const monedaSym = moneda.toString().toUpperCase().startsWith("DOLAR") || moneda.toUpperCase().startsWith("USD") ? "US$" : "S/";
  const monedaTexto = monedaSym === "US$" ? "DÓLARES" : "SOLES";

  const mLR = cm(1.05);
  const ANCHO = cm(21.0) - mLR * 2; // ancho útil en twips

  // ------------------------------------------------------------ cálculos
  const items = data.items;
  const incluirCodigo = items.some((it) => (it.codigo || "").toString().trim() !== "");
  let opGravadas = 0;
  const filas = items.map((item, idx) => {
    const cant = Number(item.cantidad);
    const vunit = Number(item.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    return { idx, cant, vunit, vtotal, entrega: item.entrega || data.fecha_entrega || "Por coordinar", um: item.um || "UND", descripcion: item.descripcion, codigo: item.codigo || "" };
  });
  const subtotalItems = Math.round(opGravadas * 100) / 100;
  const descuento = Math.round((data.descuento || 0) * 100) / 100;
  opGravadas = Math.round((subtotalItems - descuento) * 100) / 100;
  const igv = Math.round(opGravadas * 0.18 * 100) / 100;
  const total = Math.round((opGravadas + igv) * 100) / 100;
  const son = montoALetras(total, monedaTexto);
  const totales: [string, number, boolean][] = [];
  if (descuento) {
    totales.push(["Subtotal", subtotalItems, false]);
    totales.push(["Descuento", -descuento, false]);
  }
  totales.push(["Operación gravada", opGravadas, false]);
  totales.push(["I.G.V. (18%)", igv, false]);
  totales.push(["IMPORTE TOTAL", total, true]);

  const lugar = data.lugar_entrega || (data.origen || data.destino ? `${data.origen || ""} → ${data.destino || ""}` : "");
  const correo1 = EMPRESA.correos.split(" | ")[0];
  const correoFact = EMPRESA.correos.split(" | ")[1] || correo1;

  // ------------------------------------------------------------ membrete (fondo de página: logo arriba, contactos al pie)
  const fondoPath = path.join(process.cwd(), "public", "membrete-gto.jpg");
  const titulo = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [run(esServicio ? "ORDEN DE SERVICIO" : "ORDEN DE COMPRA", { bold: true, size: 16, color: VERDE })]
    }),
    par([run(`GTO PERU S.A.C. · R.U.C. ${EMPRESA.ruc}`, { bold: true, size: 9.5, color: "333333" })], { align: AlignmentType.RIGHT, after: 3 }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: `  N° ${numeroPadded}  `, bold: true, size: 22, font: FUENTE, color: BLANCO, shading: { type: ShadingType.CLEAR, fill: VERDE, color: "auto" } })
      ]
    })
  ];
  // el título va en el encabezado para que se repita en cada página, a la derecha del logo del membrete
  const membrete = new Header({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: fs.existsSync(fondoPath)
          ? [
              new ImageRun({
                type: "jpg",
                data: fs.readFileSync(fondoPath),
                transformation: { width: 794, height: 1123 },
                floating: {
                  horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
                  verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                  behindDocument: true,
                  allowOverlap: true,
                  wrap: { type: TextWrappingType.NONE }
                },
                altText: { title: "Membrete GTO PERU", description: "Membrete GTO PERU", name: "Membrete" }
              })
            ]
          : []
      }),
      ...titulo
    ]
  });

  const c1 = cm(2.6), c2 = cm(3.6), c3 = ANCHO - c1 - c2;
  const referencia = tabla(
    [
      new TableRow({
        children: [
          celda([par([run(esServicio ? "Orden Servicio:" : "Orden Compra:", { bold: true, size: 9, color: VERDE_OSCURO })], { after: 0 })], { w: c1, margen: 10 }),
          celda([par([run(numeroPadded, { size: 9 })], { after: 0 })], { w: c2, margen: 10 }),
          celda([par([run(`Moneda: ${moneda === "DOLARES" ? "USD - Dólar americano" : "PEN - Sol peruano"}`, { bold: true, size: 9 })], { after: 0 })], { w: c3, margen: 10 })
        ]
      }),
      new TableRow({
        children: [
          celda([par([run("Fecha emisión:", { bold: true, size: 9, color: VERDE_OSCURO })], { after: 0 })], { w: c1, margen: 10 }),
          celda([par([run(data.fecha_emision || "", { size: 9 })], { after: 0 })], { w: c2, margen: 10 }),
          celda([par([run(`Forma de pago: ${data.forma_pago || "Por coordinar"}`, { size: 9 })], { after: 0 })], { w: c3, margen: 10 })
        ]
      })
    ],
    [c1, c2, c3]
  );

  // ------------------------------------------------------------ recuadros
  const wIzq = Math.round(ANCHO * 0.55), wGap = cm(0.4), wDer = ANCHO - wIzq - wGap;
  const filaCajas = (izq: Paragraph[], der: Paragraph[]) =>
    tabla(
      [
        new TableRow({
          children: [
            celda(izq, { w: wIzq, bordes: "negro", valign: VerticalAlign.TOP }),
            celda([vacio()], { w: wGap }),
            celda(der, { w: wDer, bordes: "negro", valign: VerticalAlign.TOP })
          ]
        })
      ],
      [wIzq, wGap, wDer]
    );
  const cajaProveedor = [
    par([run("PROVEEDOR", { bold: true, color: VERDE })], { after: 3 }),
    ...(prov.codigo_proveedor ? [filaDato("Código:", prov.codigo_proveedor)] : []),
    filaDato("Razón social:", prov.razon_social || ""),
    filaDato("R.U.C. / DNI:", prov.ruc || ""),
    filaDato("Dirección:", prov.direccion || ""),
    filaDato("ATT:", prov.contacto || ""),
    filaDato("Teléfono:", prov.telefono || ""),
    filaDato("Email:", prov.email || "")
  ];
  const cajaComprador = [
    filaDato("Comprador:", data.comprador || "Área de Compras / Logística"),
    filaDato("E:", correo1),
    filaDato("T:", EMPRESA.celulares)
  ];
  const cajaEntrega = [
    filaDato("Lugar de entrega:", lugar || `Sede operativa GTO PERU\n${EMPRESA.sedeOperativa}`),
    filaDato("Fecha requerida:", data.fecha_entrega || "Por coordinar"),
    filaDato("Centro de costos:", data.centro_costos || "")
  ];
  const cajaRef = [
    filaDato("Ref. cotización:", data.doc_relacionado || ""),
    filaDato("Tipo proveedor:", "Nacional"),
    filaDato("Facturar a:", `${EMPRESA.nombreLegal}\nR.U.C. ${EMPRESA.ruc}`)
  ];

  // ------------------------------------------------------------ ítems
  const escala = ANCHO / 535;
  const cols = incluirCodigo
    ? [34, 46, 179, 40, 36, 58, 66, 76]
    : [34, 0, 225, 40, 36, 58, 66, 76];
  const anchos = cols.filter((w) => w > 0).map((w) => Math.round(w * escala));
  anchos[anchos.length - 1] += ANCHO - anchos.reduce((a, b) => a + b, 0);
  const cab = ["Ítem No.", ...(incluirCodigo ? ["Código"] : []), "Descripción", "Cantidad", "Unidad Medida", "Fecha de entrega", `V. Unitario (sin IGV) ${monedaSym}`, `Importe (sin IGV) ${monedaSym}`];
  const derecha = (i: number) => {
    const nombre = cab[i];
    return nombre === "Cantidad" || nombre.startsWith("V. Unitario") || nombre.startsWith("Importe");
  };
  const tablaItems = tabla(
    [
      new TableRow({
        tableHeader: true,
        children: cab.map((t, i) =>
          celda([par([run(t, { bold: true, size: 7.2, color: BLANCO })], { after: 0, align: derecha(i) ? AlignmentType.RIGHT : AlignmentType.LEFT })], {
            w: anchos[i],
            bordes: "negro",
            fill: GRIS_CAB,
            valign: VerticalAlign.CENTER,
            margen: 40
          })
        )
      }),
      ...filas.map(
        (f) =>
          new TableRow({
            cantSplit: true,
            children: [
              String((f.idx + 1) * 10).padStart(5, "0"),
              ...(incluirCodigo ? [f.codigo] : []),
              f.descripcion,
              String(f.cant),
              f.um,
              f.entrega,
              money(f.vunit),
              money(f.vtotal)
            ].map((t, i) =>
              celda([par([run(t, { size: 7.8, bold: cab[i] === "Descripción" })], { after: 0, align: derecha(i) ? AlignmentType.RIGHT : AlignmentType.LEFT })], {
                w: anchos[i],
                bordes: "negro",
                margen: 40
              })
            )
          })
      )
    ],
    anchos,
    "negro"
  );

  // ------------------------------------------------------------ totales + SON
  const wSon = Math.round(ANCHO * 0.58), wTotL = Math.round((ANCHO - wSon) * 0.55), wTotV = ANCHO - wSon - wTotL;
  const tablaTotales = tabla(
    totales.map(
      ([l, v, dest], i) =>
        new TableRow({
          children: [
            celda(i === 0 ? [par([run("SON: ", { bold: true }), run(`${son}.`)], { after: 0 })] : [vacio()], { w: wSon, margen: 40 }),
            celda([par([run(l, { bold: true, color: dest ? BLANCO : undefined })], { after: 0 })], { w: wTotL, bordes: "negro", fill: dest ? VERDE : undefined, margen: 40 }),
            celda([par([run(`${monedaSym} ${money(v)}`, { bold: dest, color: dest ? BLANCO : undefined })], { after: 0, align: AlignmentType.RIGHT })], {
              w: wTotV,
              bordes: "negro",
              fill: dest ? VERDE : undefined,
              margen: 40
            })
          ]
        })
    ),
    [wSon, wTotL, wTotV]
  );

  // ------------------------------------------------------------ bloques
  const bloque = (titulo: string, contenido: Paragraph[]) =>
    tabla(
      [
        new TableRow({ children: [celda([par([run(titulo, { bold: true, color: VERDE_OSCURO })], { after: 0 })], { w: ANCHO, bordes: "negro", fill: VERDE_CLARO, margen: 40 })] }),
        new TableRow({ children: [celda(contenido.length ? contenido : [vacio()], { w: ANCHO, bordes: "negro" })] })
      ],
      [ANCHO],
      "negro"
    );
  const linea = (label: string | null, valor: string) => par(label ? [run(`${label} `, { bold: true }), run(valor)] : [run(valor)], { after: 2 });
  const legal = (label: string, valor: string) => par([run(`${label} `, { bold: true, size: 7.5 }), run(valor, { size: 7.5 })], { after: 3 });

  const condiciones = [
    linea("Forma de pago:", data.forma_pago || "Por coordinar."),
    linea("Plazo de entrega:", data.fecha_entrega || "Por coordinar con el proveedor."),
    ...(lugar ? [linea("Lugar de recojo y entrega:", lugar)] : []),
    ...(data.garantia ? [linea("Garantía:", data.garantia)] : []),
    ...(data.penalidad ? [linea("Penalidad por retraso en la entrega:", data.penalidad)] : [])
  ];
  const cuentas = prov.cuentas_bancarias || [];
  const cuentasParas = [
    ...(cuentas.length === 0 ? [linea(null, "(Pendiente de proporcionar por el proveedor)")] : []),
    ...cuentas.map((c) => linea(null, `${c.banco}: ${c.cuenta}${c.cci ? `   |   CCI: ${c.cci}` : ""}`)),
    ...(prov.detraccion ? [linea("Detracción:", prov.detraccion)] : [])
  ];
  const observaciones = [
    ...(data.condiciones_especiales || []).map((l) => linea(null, l)),
    ...((data.observaciones || "").trim() ? [linea(null, (data.observaciones || "").trim())] : []),
    legal(
      "Aceptación de la orden:",
      "El proveedor deberá confirmar la recepción y aceptación de esta orden dentro de un plazo máximo de dos (2) días calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se considerará aceptada tácitamente."
    ),
    legal(
      "Documentos para facturación:",
      `Consignar el número de esta orden y adjuntar factura, guía de remisión o constancia del servicio y conformidad, cuando corresponda. Enviar a: ${correoFact}`
    ),
    ...(data.incluir_anticorrupcion !== false
      ? [
          legal(
            "Cumplimiento:",
            "El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden."
          )
        ]
      : [])
  ];

  // ------------------------------------------------------------ pie
  const footer = new Footer({
    children: [
      par(
        [
          run(
            `Este documento es confidencial y está dirigido únicamente al proveedor indicado. Si lo recibió por error, por favor notifíquelo a ${correo1} y elimínelo.`,
            { size: 6.5, italics: true, color: VERDE_OSCURO }
          )
        ],
        { after: 1 }
      ),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FUENTE, color: GRIS_TEXTO_HEX }),
          run(" | ", { size: 8, color: GRIS_TEXTO_HEX }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FUENTE, color: GRIS_TEXTO_HEX })
        ]
      })
    ]
  });

  const doc = new Document({
    title: `${esServicio ? "Orden de servicio" : "Orden de compra"} ${data.numero}`,
    styles: { default: { document: { run: { font: FUENTE, size: 16 } } } },
    sections: [
      {
        properties: {
          page: { size: { width: cm(21), height: cm(29.7) }, margin: { top: cm(2.85), bottom: cm(3.3), left: mLR, right: mLR, header: cm(0.75), footer: cm(2.35) } }
        },
        headers: { default: membrete },
        footers: { default: footer },
        children: [
          referencia,
          vacio(6),
          filaCajas(cajaProveedor, cajaComprador),
          vacio(4),
          filaCajas(cajaEntrega, cajaRef),
          par([run(`Sírvase atender los ${esServicio ? "servicios" : "materiales"} detallados a continuación, en las condiciones indicadas:`, { size: 8.5 })], {
            before: 10,
            after: 5
          }),
          tablaItems,
          vacio(5),
          tablaTotales,
          vacio(4),
          bloque("CONDICIONES COMERCIALES", condiciones),
          vacio(4),
          bloque("CUENTAS BANCARIAS DEL PROVEEDOR", cuentasParas),
          vacio(4),
          bloque("OBSERVACIONES Y CONDICIONES", observaciones)
        ]
      }
    ]
  });

  const { Packer } = await import("docx");
  return await Packer.toBuffer(doc);
}
