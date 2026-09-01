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
  Header,
  Footer,
  PageNumber,
  HeightRule
} from "docx";
import fs from "node:fs";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_ZEBRA_HEX, VERDE_CLARO_HEX, GRIS_TEXTO_HEX, FUENTE } from "@/lib/empresa";
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
const THIN_BORDERS_SET = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

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

function simplePara(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; spaceBefore?: number; spaceAfter?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: pt(opts.spaceBefore ?? 0), after: pt(opts.spaceAfter ?? 2) },
    children: [run(text, { bold: opts.bold, size: opts.size, color: opts.color })]
  });
}

function labelLine(label: string, value: string, opts: { size?: number; spaceAfter?: number } = {}) {
  const size = opts.size ?? 8;
  return new Paragraph({
    spacing: { after: pt(opts.spaceAfter ?? 2) },
    children: [
      run(`${label}: `, { bold: true, size }),
      run(value || "", { size })
    ]
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
    borders: opts.borders ? THIN_BORDERS_SET : NO_BORDERS_SET,
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

function numberedHeading(text: string, spaceBefore = 6, spaceAfter = 3) {
  return new Paragraph({
    spacing: { before: pt(spaceBefore), after: pt(spaceAfter) },
    keepNext: true,
    children: [run(text, { bold: true, size: 10.5, color: VERDE_HEX })]
  });
}

export async function generarOrdenDocx(data: OrdenCompraData): Promise<Buffer> {
  const numeroTxt = String(data.numero);
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
  const logoPath = path.join(process.cwd(), "assets", "gto_logo.png");
  let logoImage: ImageRun | null = null;
  if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    const widthCm = 6.2;
    const heightCm = widthCm * (238 / 842);
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
          cell(
            [new Paragraph({ children: logoImage ? [logoImage] : [] })],
            { widthCm: cw * 0.52, valign: VerticalAlign.TOP }
          ),
          cell(
            [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [run("ORDEN DE COMPRA", { bold: true, size: 19, color: VERDE_HEX })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: pt(1) },
                children: [run(`OC N.º ${numeroTxt}`, { bold: true, size: 13, color: VERDE_HEX })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: pt(1) },
                children: [run(`Fecha de emisión: ${data.fecha_emision || ""}`, { size: 9 })]
              })
            ],
            { widthCm: cw * 0.48, valign: VerticalAlign.TOP }
          )
        ]
      })
    ],
    [cw * 0.52, cw * 0.48]
  );

  // ------------------------------------------------- bloque de empresa
  const bloqueEmpresa: Paragraph[] = [
    simplePara(`${EMPRESA.nombreLegal} | RUC ${EMPRESA.ruc}`, { bold: true, size: 9, spaceBefore: 1, spaceAfter: 1 }),
    labelLine("DOMICILIO FISCAL (SUNAT)", EMPRESA.domicilioFiscal, { size: 7.5, spaceAfter: 1 }),
    labelLine("SEDE OPERATIVA AREQUIPA", EMPRESA.sedeOperativa, { size: 7.5, spaceAfter: 1 }),
    labelLine("CORREOS", EMPRESA.correos, { size: 7.5, spaceAfter: 1 }),
    labelLine("CELULARES", `${EMPRESA.celulares} | PÁGINA WEB: ${EMPRESA.web}`, { size: 7.5, spaceAfter: 4 })
  ];

  // -------------------------------------------------- tabla de datos
  const campos: [string, string][] = [
    ["PROVEEDOR", prov.razon_social || ""],
    ["RUC", prov.ruc || ""],
    ["CONTACTO", prov.contacto || ""],
    ["TELÉFONO", prov.telefono || ""],
    ["CORREO", prov.email || ""],
    ["COTIZACIÓN", data.doc_relacionado || ""],
    ["MONEDA", moneda.toUpperCase()],
    ["FORMA DE PAGO", data.forma_pago || ""],
    ["FECHA REQUERIDA", data.fecha_entrega || ""],
    ["LUGAR DE ENTREGA", data.lugar_entrega || ""],
    ["SOLICITANTE / COMPRADOR", data.comprador || ""],
    ["CENTRO DE COSTOS", data.centro_costos || ""]
  ];
  const extra: [string, string][] = [
    ["DIRECCIÓN DEL PROVEEDOR", prov.direccion || ""],
    ["CÓDIGO DE PROVEEDOR", prov.codigo_proveedor || ""]
  ];
  for (const [label, value] of extra) {
    if (value) campos.push([label, value]);
  }
  while (campos.length % 4 !== 0) campos.push(["", ""]);

  const filasGrid: [string, string][][] = [];
  for (let i = 0; i < campos.length; i += 4) filasGrid.push(campos.slice(i, i + 4));

  const parW = cw / 4;
  const labelW = parW * 0.44;
  const valueW = parW * 0.56;

  const infoRows = filasGrid.map((fila, i) => {
    const shaded = i % 2 === 0;
    const cells: TableCell[] = [];
    for (const [label, value] of fila) {
      cells.push(
        cell([simplePara(label, { bold: true, size: 6.5, spaceAfter: 0 })], {
          widthCm: labelW,
          shadeHex: shaded ? GRIS_ZEBRA_HEX : undefined,
          valign: VerticalAlign.CENTER
        })
      );
      cells.push(
        cell([simplePara(value, { size: 8, spaceAfter: 0 })], {
          widthCm: valueW,
          shadeHex: shaded ? GRIS_ZEBRA_HEX : undefined,
          valign: VerticalAlign.CENTER
        })
      );
    }
    return new TableRow({ children: cells });
  });

  const infoTable = noBorderTable(infoRows, Array(4).fill([labelW, valueW]).flat());

  // -------------------------------------------------------- ítems
  const items = data.items;
  const incluirCodigo = items.some((it) => (it.codigo || "").toString().trim() !== "");

  const headers = incluirCodigo
    ? ["ÍTEM", "CÓDIGO", "CANT.", "U.M.", "DESCRIPCIÓN", "ENTREGA", `V. UNIT. (${monedaSym})`, `V. TOTAL (${monedaSym})`]
    : ["ÍTEM", "CANT.", "U.M.", "DESCRIPCIÓN", "ENTREGA", `V. UNIT. (${monedaSym})`, `V. TOTAL (${monedaSym})`];
  const colRatios = incluirCodigo
    ? [0.05, 0.09, 0.06, 0.06, 0.34, 0.1, 0.16]
    : [0.07, 0.08, 0.07, 0.37, 0.12, 0.14, 0.15];
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
    const shadeHex = idx % 2 === 1 ? GRIS_ZEBRA_HEX : undefined;

    const values: { text: string; align: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; size?: number }[] = [
      { text: String(idx + 1), align: AlignmentType.CENTER }
    ];
    if (incluirCodigo) values.push({ text: item.codigo || "", align: AlignmentType.CENTER });
    values.push({ text: `${cant}`, align: AlignmentType.CENTER });
    values.push({ text: item.um || "UND", align: AlignmentType.CENTER });
    values.push({ text: item.descripcion, align: AlignmentType.LEFT });
    values.push({ text: entrega, align: AlignmentType.CENTER, size: 7.5 });
    values.push({ text: money(vunit), align: AlignmentType.RIGHT });
    values.push({ text: money(vtotal), align: AlignmentType.RIGHT, bold: true });

    return new TableRow({
      children: values.map(
        (v, j) =>
          new TableCell({
            width: { size: cm(colW[j]), type: WidthType.DXA },
            shading: shadeHex ? shading(shadeHex) : undefined,
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
  etiquetas.push(["IGV 18 %", igv, false]);
  etiquetas.push(["IMPORTE TOTAL", total, true]);

  const innerW1 = cw * 0.45 * 0.55;
  const innerW2 = cw * 0.45 * 0.45;
  const innerRows = etiquetas.map(([label, val, destacado]) => {
    const fill = destacado ? VERDE_HEX : GRIS_ZEBRA_HEX;
    const color = destacado ? "FFFFFF" : undefined;
    return new TableRow({
      children: [
        cell([simplePara(label, { bold: true, size: destacado ? 9 : 8, color, spaceAfter: 0 })], {
          widthCm: innerW1,
          shadeHex: fill,
          valign: VerticalAlign.CENTER
        }),
        cell(
          [simplePara(`${monedaSym} ${money(val)}`, { bold: destacado, size: destacado ? 9 : 8, color, align: AlignmentType.RIGHT, spaceAfter: 0 })],
          { widthCm: innerW2, shadeHex: fill, valign: VerticalAlign.CENTER }
        )
      ]
    });
  });
  const innerTotalsTable = noBorderTable(innerRows, [innerW1, innerW2]);

  const totalsWrap = noBorderTable(
    [
      new TableRow({
        children: [
          cell([new Paragraph({ children: [] })], { widthCm: cw * 0.55 }),
          cell([innerTotalsTable as unknown as Paragraph], { widthCm: cw * 0.45 })
        ]
      })
    ],
    [cw * 0.55, cw * 0.45]
  );

  // ------------------------------------------------------------ SON
  const son = montoALetras(total, monedaTexto);
  const sonPara = new Paragraph({
    spacing: { before: pt(4), after: pt(4) },
    children: [run("SON: ", { bold: true, size: 8 }), run(`${son}.`, { bold: true, size: 8 })]
  });

  // --------------------------------- 02 datos bancarios / 03 condiciones
  const cuentas = prov.cuentas_bancarias || [];
  const detraccion = prov.detraccion || "";

  const datosBancariosChildren: Paragraph[] = [];
  if (!cuentas.length) {
    datosBancariosChildren.push(simplePara("(Pendiente de proporcionar por el proveedor)", { size: 8 }));
  }
  for (const c of cuentas) {
    let linea = c.banco || c.cuenta ? `${c.banco || ""}: ${c.cuenta || ""}` : "";
    if (c.cci) linea += ` | CCI: ${c.cci}`;
    if (linea) datosBancariosChildren.push(simplePara(linea, { size: 8, spaceAfter: 3 }));
  }
  if (detraccion) datosBancariosChildren.push(labelLine("Detracción", detraccion, { size: 8 }));

  const condicionesEntregaChildren: Paragraph[] = [];
  if (data.forma_pago) condicionesEntregaChildren.push(labelLine("Forma de pago", data.forma_pago, { size: 8 }));
  const origen = data.origen || "";
  const destino = data.destino || data.lugar_entrega || "";
  if (origen || destino) {
    condicionesEntregaChildren.push(simplePara(`Origen: ${origen}  |  Destino: ${destino}`, { size: 8, spaceAfter: 4 }));
  }
  condicionesEntregaChildren.push(
    new Paragraph({ spacing: { before: pt(2), after: pt(0) }, children: [run("FACTURACIÓN Y CAMBIOS", { bold: true, size: 8 })] })
  );
  condicionesEntregaChildren.push(
    simplePara("Toda comunicación relacionada con facturación y cambios deberá enviarse a: administracion@gtoperu.com", {
      size: 8,
      spaceAfter: 0
    })
  );

  function boxedSection(pairs: [string, Paragraph[]][]) {
    const half = (cw - 0.3) / 2;
    const cells = pairs.map(([title, children]) =>
      cell(
        [simplePara(title, { bold: true, size: 9, color: VERDE_HEX, spaceAfter: 3 }), ...children, simplePara("", { size: 1, spaceAfter: 1 })],
        { widthCm: half, shadeHex: VERDE_CLARO_HEX }
      )
    );
    return new Table({
      rows: [new TableRow({ cantSplit: false, children: cells })],
      width: { size: cm(half * 2), type: WidthType.DXA },
      columnWidths: [cm(half), cm(half)],
      borders: NO_BORDERS_SET
    });
  }

  const boxed0203 = boxedSection([
    ["02 / DATOS BANCARIOS", datosBancariosChildren],
    ["03 / CONDICIONES Y ENTREGA", condicionesEntregaChildren]
  ]);

  // ------------------------------------------------------- observaciones
  const condicionesExtra = data.condiciones_especiales || [];
  const garantia = data.garantia || "";
  const penalidad = data.penalidad || "";
  const observaciones = (data.observaciones || "").trim();
  const hay04 = condicionesExtra.length > 0 || !!garantia || !!penalidad || !!observaciones;

  const seccion04: Paragraph[] = [];
  if (hay04) {
    seccion04.push(numberedHeading("04 / OBSERVACIONES"));
    for (const linea of condicionesExtra) seccion04.push(simplePara(linea, { size: 8, spaceAfter: 2 }));
    if (observaciones) seccion04.push(simplePara(observaciones, { size: 8, spaceAfter: 4 }));
    if (garantia) seccion04.push(labelLine("Garantía", garantia, { size: 8 }));
    if (penalidad) seccion04.push(labelLine("Penalidad por retraso en la entrega", penalidad, { size: 8 }));

    seccion04.push(
      new Paragraph({
        spacing: { before: pt(2), after: pt(2) },
        children: [
          run("ACEPTACIÓN DE LA ORDEN: ", { bold: true, size: 8 }),
          run(
            `El proveedor deberá confirmar la recepción y aceptación de la OC ${numeroTxt} dentro de un plazo máximo de dos (2) días calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se considerará aceptada tácitamente.`,
            { size: 8 }
          )
        ]
      })
    );
    seccion04.push(
      new Paragraph({
        spacing: { after: pt(2) },
        children: [
          run("DOCUMENTOS PARA FACTURACIÓN: ", { bold: true, size: 8 }),
          run(
            `Consignar la OC ${numeroTxt} y adjuntar factura, guía de remisión o constancia del servicio y conformidad, cuando corresponda.`,
            { size: 8 }
          )
        ]
      })
    );
    if (data.incluir_anticorrupcion !== false) {
      seccion04.push(
        new Paragraph({
          spacing: { after: pt(2) },
          children: [
            run("CUMPLIMIENTO: ", { bold: true, size: 8 }),
            run(
              "El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden.",
              { size: 8 }
            )
          ]
        })
      );
    }
  }

  // ------------------------------------------------------------- footer
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, space: 4, color: "CCCCCC" } },
        spacing: { before: pt(4) },
        children: [
          run(`${EMPRESA.direccionCorta}  |  ${EMPRESA.whatsapp}  |  ${EMPRESA.correos.split(" | ")[0]}  |  ${EMPRESA.web}  |  Página `, {
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
        children: [
          headerTable,
          new Paragraph({ spacing: { after: pt(0) }, children: [] }),
          ...bloqueEmpresa,
          infoTable,
          new Paragraph({ spacing: { after: pt(1) }, children: [] }),
          numberedHeading("01 / DETALLE DEL PEDIDO"),
          itemsTable,
          new Paragraph({ spacing: { after: pt(1) }, children: [] }),
          totalsWrap,
          sonPara,
          boxed0203,
          ...seccion04
        ]
      }
    ]
  });

  const { Packer } = await import("docx");
  const buf = await Packer.toBuffer(doc);
  return buf;
}
