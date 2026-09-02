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
  PageNumber
} from "docx";
import fs from "node:fs";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_ZEBRA_HEX, GRIS_TEXTO_HEX, FUENTE } from "@/lib/empresa";
import { montoALetras } from "@/lib/numeroALetras";
import type { OrdenCompraData } from "@/lib/types";

const CM_A_TWIPS = 566.929;
const cm = (v: number) => Math.round(v * CM_A_TWIPS);
const pt = (v: number) => Math.round(v * 20); // spacing en twips (20 = 1pt)
const money = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS_SET = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" };
const THIN_BORDERS_SET = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER, insideHorizontal: THIN_BORDER, insideVertical: THIN_BORDER };

function shading(hex: string) {
  return { type: ShadingType.CLEAR, fill: hex, color: "auto" };
}

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    size: Math.round((opts.size ?? 8) * 2),
    font: FUENTE,
    color: opts.color
  });
}

function simplePara(
  text: string,
  opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; spaceBefore?: number; spaceAfter?: number } = {}
) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: pt(opts.spaceBefore ?? 0), after: pt(opts.spaceAfter ?? 2) },
    children: [run(text, { bold: opts.bold, size: opts.size, color: opts.color })]
  });
}

function labelLine(label: string, value: string, opts: { size?: number; spaceAfter?: number; bold?: boolean } = {}) {
  const size = opts.size ?? 8;
  return new Paragraph({
    spacing: { after: pt(opts.spaceAfter ?? 2) },
    children: [run(`${label}: `, { bold: true, size }), run(value || "", { size, bold: opts.bold })]
  });
}

function cell(
  children: Paragraph[] | Table[],
  opts: {
    widthCm?: number;
    shadeHex?: string;
    borders?: boolean;
    valign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    columnSpan?: number;
  } = {}
) {
  return new TableCell({
    children: children as Paragraph[],
    width: opts.widthCm ? { size: cm(opts.widthCm), type: WidthType.DXA } : undefined,
    shading: opts.shadeHex ? shading(opts.shadeHex) : undefined,
    borders: opts.borders === false ? NO_BORDERS_SET : THIN_BORDERS_SET,
    verticalAlign: opts.valign,
    columnSpan: opts.columnSpan
  });
}

function noBorderTable(rows: TableRow[], colWidthsCm: number[]) {
  return new Table({
    rows,
    width: { size: cm(colWidthsCm.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
    columnWidths: colWidthsCm.map(cm),
    borders: NO_BORDERS_SET
  });
}

function sectionBar(cw: number, texto: string) {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: cm(cw), type: WidthType.DXA },
            shading: shading(VERDE_HEX),
            borders: NO_BORDERS_SET,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: [run(texto, { bold: true, size: 9.5, color: "FFFFFF" })] })]
          })
        ]
      })
    ],
    width: { size: cm(cw), type: WidthType.DXA },
    columnWidths: [cm(cw)],
    borders: NO_BORDERS_SET
  });
}

export async function generarOrdenDocx(data: OrdenCompraData): Promise<Buffer> {
  const numeroPadded = String(data.numero).padStart(6, "0");
  const prov = data.proveedor;
  const moneda = data.moneda || "SOLES";
  const monedaSym = moneda.toString().toUpperCase().startsWith("DOLAR") || moneda.toUpperCase().startsWith("USD") ? "US$" : "S/";
  const monedaTexto = monedaSym === "US$" ? "DÓLARES" : "SOLES";

  const marginTop = cm(0.8);
  const marginBottom = cm(1.0);
  const marginLeft = cm(1.3);
  const marginRight = cm(1.3);
  const pageWidthTwips = cm(21.0); // A4
  const cw = (pageWidthTwips - marginLeft - marginRight) / CM_A_TWIPS; // ancho útil en "cm"

  // ---------------------------------------------------------------- logo
  const logoPath = path.join(process.cwd(), "public", "logo-gto.png");
  let logoImage: ImageRun | null = null;
  if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    const widthCm = 6.2;
    const heightCm = widthCm / 3.537;
    logoImage = new ImageRun({
      data: logoBuf,
      transformation: {
        width: Math.round((widthCm / 2.54) * 96),
        height: Math.round((heightCm / 2.54) * 96)
      },
      type: "png"
    });
  }

  const headerTable = noBorderTable(
    [
      new TableRow({
        children: [
          cell([new Paragraph({ children: logoImage ? [logoImage] : [] })], { widthCm: cw * 0.52, valign: VerticalAlign.TOP, borders: false }),
          cell(
            [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [run("ORDEN DE COMPRA", { bold: true, size: 19, color: VERDE_HEX })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: pt(1) },
                children: [run(`N° ${numeroPadded}`, { bold: true, size: 13, color: VERDE_HEX })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: pt(1) },
                children: [run(`R.U.C. ${EMPRESA.ruc}`, { size: 9 })]
              })
            ],
            { widthCm: cw * 0.48, valign: VerticalAlign.TOP, borders: false }
          )
        ]
      })
    ],
    [cw * 0.52, cw * 0.48]
  );

  // ------------------------------------------------- bloque de empresa
  const bloqueEmpresa: Paragraph[] = [
    labelLine("Sede fiscal", EMPRESA.domicilioFiscal, { size: 7.5, spaceAfter: 1 }),
    labelLine("Sede operativa", EMPRESA.sedeOperativa, { size: 7.5, spaceAfter: 1 }),
    simplePara(`Tel: ${EMPRESA.celulares}   |   ${EMPRESA.correos.split(" | ")[0]}`, { size: 7.5, spaceAfter: 1 }),
    simplePara(EMPRESA.web, { size: 7.5, spaceAfter: 4 })
  ];

  const divider = new Paragraph({
    spacing: { before: pt(2), after: pt(8) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: VERDE_HEX, space: 1 } },
    children: []
  });

  // -------------------------------------------------- tabla 2 col x 6 filas
  const izquierda: [string, string][] = [
    ["R.U.C. / DNI", prov.ruc || ""],
    ["Razón social", prov.razon_social || ""],
    ["Dirección", prov.direccion || ""],
    ["Contacto", prov.contacto || ""],
    ["Celular", prov.telefono || "-"],
    ["Correo", prov.email || "-"]
  ];
  const derecha: [string, string][] = [
    ["Tipo de proveedor", "NACIONAL"],
    ["Fecha de emisión", data.fecha_emision || ""],
    ["Centro de costos", data.centro_costos || "-"],
    ["Referencia de cotización", data.doc_relacionado || "-"],
    ["Comprador", data.comprador || "-"],
    ["Moneda", moneda === "DOLARES" ? "DÓLARES (US$)" : "SOLES (S/)"]
  ];

  const wLabelI = cw * 0.16;
  const wValueI = cw * 0.34;
  const wLabelD = cw * 0.2;
  const wValueD = cw * 0.3;

  const infoRows = izquierda.map((_, i) => {
    const shaded = i % 2 === 0;
    const fill = shaded ? GRIS_ZEBRA_HEX : undefined;
    const [labelI, valorI] = izquierda[i];
    const [labelD, valorD] = derecha[i];
    return new TableRow({
      children: [
        cell([simplePara(labelI, { bold: true, size: 8, spaceAfter: 0 })], { widthCm: wLabelI, shadeHex: fill, valign: VerticalAlign.CENTER }),
        cell([simplePara(valorI, { size: 8, spaceAfter: 0 })], { widthCm: wValueI, shadeHex: fill, valign: VerticalAlign.CENTER }),
        cell([simplePara(labelD, { bold: true, size: 8, spaceAfter: 0 })], { widthCm: wLabelD, shadeHex: fill, valign: VerticalAlign.CENTER }),
        cell([simplePara(valorD, { size: 8, spaceAfter: 0 })], { widthCm: wValueD, shadeHex: fill, valign: VerticalAlign.CENTER })
      ]
    });
  });

  const infoTable = new Table({
    rows: infoRows,
    width: { size: cm(cw), type: WidthType.DXA },
    columnWidths: [wLabelI, wValueI, wLabelD, wValueD].map(cm),
    borders: THIN_BORDERS_SET
  });

  // -------------------------------------------------------- ítems
  const items = data.items;
  const incluirCodigo = items.some((it) => (it.codigo || "").toString().trim() !== "");

  const headers = incluirCodigo
    ? ["ÍTEM", "CÓDIGO", "DESCRIPCIÓN", "CANT.", "U.M.", "ENTREGA", `V. UNIT. (${monedaSym})`, `IMPORTE (${monedaSym})`]
    : ["ÍTEM", "DESCRIPCIÓN", "CANT.", "U.M.", "ENTREGA", `V. UNIT. (${monedaSym})`, `IMPORTE (${monedaSym})`];
  const colRatios = incluirCodigo
    ? [0.06, 0.09, 0.32, 0.07, 0.07, 0.1, 0.13, 0.16]
    : [0.06, 0.36, 0.07, 0.07, 0.1, 0.15, 0.19];
  const colW = colRatios.map((w) => cw * w);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, j) =>
        new TableCell({
          width: { size: cm(colW[j]), type: WidthType.DXA },
          shading: shading(VERDE_HEX),
          borders: THIN_BORDERS_SET,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: h === "DESCRIPCIÓN" ? AlignmentType.LEFT : AlignmentType.CENTER,
              children: [run(h, { bold: true, size: 7.5, color: "FFFFFF" })]
            })
          ]
        })
    )
  });

  let opGravadas = 0;
  const itemRows = items.map((item, idx) => {
    const cant = Number(item.cantidad);
    const vunit = Number(item.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    const entrega = item.entrega || data.fecha_entrega || "POR COORDINAR";

    const values: { text: string; align: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; size?: number }[] = [
      { text: String(idx + 1), align: AlignmentType.CENTER }
    ];
    if (incluirCodigo) values.push({ text: item.codigo || "", align: AlignmentType.CENTER });
    values.push({ text: item.descripcion, align: AlignmentType.LEFT });
    values.push({ text: `${cant}`, align: AlignmentType.CENTER });
    values.push({ text: item.um || "UND", align: AlignmentType.CENTER });
    values.push({ text: entrega, align: AlignmentType.CENTER, size: 7.5 });
    values.push({ text: money(vunit), align: AlignmentType.RIGHT });
    values.push({ text: money(vtotal), align: AlignmentType.RIGHT, bold: true });

    return new TableRow({
      children: values.map(
        (v, j) =>
          new TableCell({
            width: { size: cm(colW[j]), type: WidthType.DXA },
            borders: THIN_BORDERS_SET,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: v.align, children: [run(v.text, { bold: v.bold, size: v.size ?? 8 })] })]
          })
      )
    });
  });

  const itemsTable = new Table({
    rows: [headerRow, ...itemRows],
    width: { size: cm(colW.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
    columnWidths: colW.map(cm),
    borders: THIN_BORDERS_SET
  });

  const subtotalItems = Math.round(opGravadas * 100) / 100;
  const descuento = Math.round((data.descuento || 0) * 100) / 100;
  opGravadas = Math.round((subtotalItems - descuento) * 100) / 100;
  const igv = Math.round(opGravadas * 0.18 * 100) / 100;
  const total = Math.round((opGravadas + igv) * 100) / 100;

  // ------------------------------------------------------- totales
  const etiquetas: [string, number, boolean][] = [];
  if (descuento) {
    etiquetas.push(["SUBTOTAL", subtotalItems, false]);
    etiquetas.push(["DESCUENTO", -descuento, false]);
  }
  etiquetas.push(["OPERACIÓN GRAVADA", opGravadas, false]);
  etiquetas.push(["I.G.V. (18%)", igv, false]);
  etiquetas.push(["IMPORTE TOTAL", total, true]);

  const innerW1 = cw * 0.48 * 0.55;
  const innerW2 = cw * 0.48 * 0.45;
  const innerRows = etiquetas.map(([label, val, destacado]) => {
    const fill = destacado ? VERDE_HEX : GRIS_ZEBRA_HEX;
    const color = destacado ? "FFFFFF" : undefined;
    return new TableRow({
      children: [
        cell([simplePara(label, { bold: true, size: destacado ? 9 : 8.5, color, spaceAfter: 0 })], {
          widthCm: innerW1,
          shadeHex: fill,
          valign: VerticalAlign.CENTER,
          borders: false
        }),
        cell(
          [simplePara(`${monedaSym} ${money(val)}`, { bold: destacado, size: destacado ? 9 : 8.5, color, align: AlignmentType.RIGHT, spaceAfter: 0 })],
          { widthCm: innerW2, shadeHex: fill, valign: VerticalAlign.CENTER, borders: false }
        )
      ]
    });
  });
  const innerTotalsTable = noBorderTable(innerRows, [innerW1, innerW2]);

  const totalsWrap = noBorderTable(
    [
      new TableRow({
        children: [
          cell([new Paragraph({ children: [] })], { widthCm: cw * 0.52, borders: false }),
          cell([innerTotalsTable as unknown as Paragraph], { widthCm: cw * 0.48, borders: false })
        ]
      })
    ],
    [cw * 0.52, cw * 0.48]
  );

  // ------------------------------------------------------------ SON
  const son = montoALetras(total, monedaTexto);
  const sonPara = new Paragraph({
    spacing: { before: pt(6), after: pt(8) },
    children: [run("SON: ", { bold: true, size: 8.5 }), run(`${son}.`, { italics: true, size: 8.5 })]
  });

  // ---------------------------------------- CONDICIONES COMERCIALES
  const condicionesComerciales: Paragraph[] = [];
  if (data.forma_pago) condicionesComerciales.push(labelLine("Forma de pago", data.forma_pago, { size: 8.5 }));
  if (data.lugar_entrega || data.origen || data.destino) {
    condicionesComerciales.push(
      labelLine("Lugar de recojo y entrega", data.lugar_entrega || `${data.origen || ""} → ${data.destino || ""}`, { size: 8.5 })
    );
  }
  condicionesComerciales.push(labelLine("Plazo de entrega", data.fecha_entrega || "Por coordinar con el proveedor.", { size: 8.5 }));
  if (data.garantia) condicionesComerciales.push(labelLine("Garantía", data.garantia, { size: 8.5 }));
  if (data.penalidad) condicionesComerciales.push(labelLine("Penalidad por retraso en la entrega", data.penalidad, { size: 8.5 }));

  // ---------------------------------------------------- CUENTAS BANCARIAS
  const cuentas = prov.cuentas_bancarias || [];
  const cuentasBancarias: Paragraph[] = [];
  if (!cuentas.length) {
    cuentasBancarias.push(simplePara("(Pendiente de proporcionar por el proveedor)", { size: 8.5 }));
  }
  for (const c of cuentas) {
    let linea = `${c.banco || ""}: ${c.cuenta || ""}`;
    if (c.cci) linea += `  |  CCI: ${c.cci}`;
    cuentasBancarias.push(simplePara(linea, { size: 8.5, spaceAfter: 3 }));
  }
  if (prov.detraccion) cuentasBancarias.push(labelLine("Detracción", prov.detraccion, { size: 8.5 }));

  // ---------------------------------------------------------- OBSERVACIONES
  const condicionesExtra = data.condiciones_especiales || [];
  const observaciones = (data.observaciones || "").trim();
  const hayObservaciones = condicionesExtra.length > 0 || !!data.garantia || !!data.penalidad || !!observaciones;

  const observacionesParas: Paragraph[] = [];
  for (const linea of condicionesExtra) observacionesParas.push(simplePara(linea, { size: 8.5, spaceAfter: 2 }));
  if (observaciones) observacionesParas.push(simplePara(observaciones, { size: 8.5, spaceAfter: 4 }));
  observacionesParas.push(
    new Paragraph({
      spacing: { after: pt(2) },
      children: [
        run("Aceptación de la orden: ", { bold: true, size: 8 }),
        run(
          "El proveedor deberá confirmar la recepción y aceptación de esta OC dentro de un plazo máximo de dos (2) días calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se considerará aceptada tácitamente.",
          { size: 8 }
        )
      ]
    })
  );
  observacionesParas.push(
    new Paragraph({
      spacing: { after: pt(2) },
      children: [
        run("Documentos para facturación: ", { bold: true, size: 8 }),
        run(
          "Consignar el número de esta OC y adjuntar factura, guía de remisión o constancia del servicio y conformidad, cuando corresponda.",
          { size: 8 }
        )
      ]
    })
  );
  if (data.incluir_anticorrupcion !== false) {
    observacionesParas.push(
      new Paragraph({
        spacing: { after: pt(2) },
        children: [
          run("Cumplimiento: ", { bold: true, size: 8 }),
          run(
            "El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden.",
            { size: 8 }
          )
        ]
      })
    );
  }

  // -------------------------------------------------------------- COMUNICACIÓN
  const comunicacionPara = new Paragraph({
    spacing: { after: pt(2) },
    children: [
      run("Toda comunicación relacionada con facturación y cambios deberá enviarse a: ", { size: 8.5 }),
      run(EMPRESA.correos.split(" | ")[1] || EMPRESA.correos.split(" | ")[0], { bold: true, size: 8.5 })
    ]
  });

  // ------------------------------------------------------------- footer
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, space: 4, color: "CCCCCC" } },
        spacing: { before: pt(4) },
        children: [
          run(`${EMPRESA.nombreComercial}   |   R.U.C. ${EMPRESA.ruc}   |   ${EMPRESA.web}   |   Página `, {
            size: 7,
            color: GRIS_TEXTO_HEX
          }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, font: FUENTE, color: GRIS_TEXTO_HEX }),
          run(" de ", { size: 7, color: GRIS_TEXTO_HEX }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: FUENTE, color: GRIS_TEXTO_HEX })
        ]
      })
    ]
  });

  const bodyChildren: (Paragraph | Table)[] = [
    headerTable,
    ...bloqueEmpresa,
    divider,
    infoTable,
    new Paragraph({ spacing: { before: pt(10), after: pt(4) }, children: [] }),
    itemsTable,
    new Paragraph({ spacing: { after: pt(1) }, children: [] }),
    totalsWrap,
    sonPara,
    sectionBar(cw, "CONDICIONES COMERCIALES"),
    new Paragraph({ spacing: { before: pt(4), after: pt(0) }, children: [] }),
    ...condicionesComerciales,
    sectionBar(cw, "CUENTAS BANCARIAS"),
    new Paragraph({ spacing: { before: pt(4), after: pt(0) }, children: [] }),
    ...cuentasBancarias
  ];

  if (hayObservaciones) {
    bodyChildren.push(sectionBar(cw, "OBSERVACIONES"));
    bodyChildren.push(new Paragraph({ spacing: { before: pt(4), after: pt(0) }, children: [] }));
    bodyChildren.push(...observacionesParas);
  }

  bodyChildren.push(sectionBar(cw, "COMUNICACIÓN"));
  bodyChildren.push(new Paragraph({ spacing: { before: pt(4), after: pt(0) }, children: [] }));
  bodyChildren.push(comunicacionPara);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FUENTE, size: 16 } }
      }
    },
    sections: [
      {
        properties: {
          page: { margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight } }
        },
        footers: { default: footer },
        children: bodyChildren
      }
    ]
  });

  const { Packer } = await import("docx");
  const buf = await Packer.toBuffer(doc);
  return buf;
}
