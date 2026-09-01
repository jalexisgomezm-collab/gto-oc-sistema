import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_ZEBRA_HEX, VERDE_CLARO_HEX, GRIS_TEXTO_HEX } from "@/lib/empresa";
import { montoALetras } from "@/lib/numeroALetras";
import type { OrdenCompraData } from "@/lib/types";

const VERDE = `#${VERDE_HEX}`;
const GRIS_ZEBRA = `#${GRIS_ZEBRA_HEX}`;
const VERDE_CLARO = `#${VERDE_CLARO_HEX}`;
const GRIS_TEXTO = `#${GRIS_TEXTO_HEX}`;

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 32, paddingHorizontal: 37, fontSize: 8, fontFamily: "Helvetica", color: "#111111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  logo: { width: 176, height: 49.6 },
  headerRight: { alignItems: "flex-end" },
  tituloOC: { fontSize: 19, fontWeight: 700, color: VERDE },
  ocNumero: { fontSize: 13, fontWeight: 700, color: VERDE, marginTop: 2 },
  fechaEmision: { fontSize: 9, marginTop: 2 },
  empresaNombre: { fontSize: 9, fontWeight: 700, marginBottom: 2 },
  labelLine: { fontSize: 7.5, marginBottom: 2 },
  labelBold: { fontWeight: 700 },
  gridRow: { flexDirection: "row" },
  gridCell: { flexBasis: "12.5%", flexGrow: 1, padding: 3, justifyContent: "center" },
  gridLabel: { fontSize: 6.5, fontWeight: 700 },
  gridValue: { fontSize: 8 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: VERDE, marginTop: 6, marginBottom: 4 },
  itemsHeaderRow: { flexDirection: "row", backgroundColor: VERDE },
  itemsHeaderCell: { padding: 3, fontSize: 7.5, fontWeight: 700, color: "#FFFFFF" },
  itemsRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#D9D9D9" },
  itemsCell: { padding: 3, fontSize: 8 },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalsBox: { width: "45%" },
  totalRow: { flexDirection: "row", backgroundColor: GRIS_ZEBRA, marginBottom: 1 },
  totalRowDestacado: { flexDirection: "row", backgroundColor: VERDE, marginBottom: 1 },
  totalLabel: { flex: 1, padding: 4, fontSize: 8, fontWeight: 700 },
  totalValue: { padding: 4, fontSize: 8, textAlign: "right" },
  sonPara: { marginTop: 6, marginBottom: 6, fontSize: 8, fontWeight: 700 },
  boxedWrap: { flexDirection: "row", gap: 6, marginBottom: 6 },
  boxedCell: { flex: 1, backgroundColor: VERDE_CLARO, padding: 6 },
  boxedTitle: { fontSize: 9, fontWeight: 700, color: VERDE, marginBottom: 3 },
  boxedLine: { fontSize: 8, marginBottom: 3 },
  obsLine: { fontSize: 8, marginBottom: 3 },
  legalBlock: { fontSize: 8, marginBottom: 3 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 37,
    right: 37,
    borderTopWidth: 0.5,
    borderColor: "#CCCCCC",
    paddingTop: 3,
    fontSize: 7,
    color: GRIS_TEXTO,
    textAlign: "center"
  }
});

function Grid({ campos }: { campos: [string, string][] }) {
  const filas: [string, string][][] = [];
  for (let i = 0; i < campos.length; i += 4) filas.push(campos.slice(i, i + 4));
  return (
    <View>
      {filas.map((fila, i) => (
        <View key={i} style={styles.gridRow}>
          {fila.map(([label, value], j) => (
            <View key={j} style={[styles.gridCell, { backgroundColor: i % 2 === 0 ? GRIS_ZEBRA : undefined }]}>
              <Text style={styles.gridLabel}>{label}</Text>
              <Text style={styles.gridValue}>{value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function OrdenDocumento({ data, logoDataUri }: { data: OrdenCompraData; logoDataUri: string | null }) {
  const numeroTxt = String(data.numero);
  const prov = data.proveedor;
  const moneda = data.moneda || "SOLES";
  const monedaSym = moneda.toUpperCase().startsWith("DOLAR") || moneda.toUpperCase().startsWith("USD") ? "US$" : "S/";
  const monedaTexto = monedaSym === "US$" ? "DÓLARES" : "SOLES";

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
  for (const kv of extra) if (kv[1]) campos.push(kv);
  while (campos.length % 4 !== 0) campos.push(["", ""]);

  const items = data.items;
  const incluirCodigo = items.some((it) => (it.codigo || "").toString().trim() !== "");

  let opGravadas = 0;
  const filasItems = items.map((item, idx) => {
    const cant = Number(item.cantidad);
    const vunit = Number(item.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    const entrega = item.entrega || data.fecha_entrega || "POR COORDINAR";
    return { idx, cant, vunit, vtotal, entrega, um: item.um || "UND", descripcion: item.descripcion, codigo: item.codigo || "" };
  });

  const subtotalItems = Math.round(opGravadas * 100) / 100;
  const descuento = Math.round((data.descuento || 0) * 100) / 100;
  opGravadas = Math.round((subtotalItems - descuento) * 100) / 100;
  const igv = Math.round(opGravadas * 0.18 * 100) / 100;
  const total = Math.round((opGravadas + igv) * 100) / 100;
  const son = montoALetras(total, monedaTexto);

  const etiquetas: [string, number, boolean][] = [];
  if (descuento) {
    etiquetas.push(["SUBTOTAL", subtotalItems, false]);
    etiquetas.push(["DESCUENTO", -descuento, false]);
  }
  etiquetas.push(["OPERACIÓN GRAVADA", opGravadas, false]);
  etiquetas.push(["IGV 18 %", igv, false]);
  etiquetas.push(["IMPORTE TOTAL", total, true]);

  const cuentas = prov.cuentas_bancarias || [];
  const condicionesExtra = data.condiciones_especiales || [];
  const hay04 = condicionesExtra.length > 0 || !!data.garantia || !!data.penalidad || !!(data.observaciones || "").trim();

  const colDescPct = incluirCodigo ? "34%" : "37%";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerRow}>
        {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : <View />}
        <View style={styles.headerRight}>
          <Text style={styles.tituloOC}>ORDEN DE COMPRA</Text>
          <Text style={styles.ocNumero}>OC N.º {numeroTxt}</Text>
          <Text style={styles.fechaEmision}>Fecha de emisión: {data.fecha_emision}</Text>
        </View>
      </View>

      <Text style={styles.empresaNombre}>
        {EMPRESA.nombreLegal} | RUC {EMPRESA.ruc}
      </Text>
      <Text style={styles.labelLine}>
        <Text style={styles.labelBold}>DOMICILIO FISCAL (SUNAT): </Text>
        {EMPRESA.domicilioFiscal}
      </Text>
      <Text style={styles.labelLine}>
        <Text style={styles.labelBold}>SEDE OPERATIVA AREQUIPA: </Text>
        {EMPRESA.sedeOperativa}
      </Text>
      <Text style={styles.labelLine}>
        <Text style={styles.labelBold}>CORREOS: </Text>
        {EMPRESA.correos}
      </Text>
      <Text style={[styles.labelLine, { marginBottom: 6 }]}>
        <Text style={styles.labelBold}>CELULARES: </Text>
        {EMPRESA.celulares} | PÁGINA WEB: {EMPRESA.web}
      </Text>

      <Grid campos={campos} />

      <Text style={styles.sectionTitle}>01 / DETALLE DEL PEDIDO</Text>
      <View style={styles.itemsHeaderRow}>
        <Text style={[styles.itemsHeaderCell, { width: "5%" }]}>ÍTEM</Text>
        {incluirCodigo && <Text style={[styles.itemsHeaderCell, { width: "9%" }]}>CÓDIGO</Text>}
        <Text style={[styles.itemsHeaderCell, { width: "6%" }]}>CANT.</Text>
        <Text style={[styles.itemsHeaderCell, { width: "6%" }]}>U.M.</Text>
        <Text style={[styles.itemsHeaderCell, { width: colDescPct }]}>DESCRIPCIÓN</Text>
        <Text style={[styles.itemsHeaderCell, { width: "10%" }]}>ENTREGA</Text>
        <Text style={[styles.itemsHeaderCell, { width: "14%", textAlign: "right" }]}>V. UNIT. ({monedaSym})</Text>
        <Text style={[styles.itemsHeaderCell, { width: "16%", textAlign: "right" }]}>V. TOTAL ({monedaSym})</Text>
      </View>
      {filasItems.map((f) => (
        <View key={f.idx} style={[styles.itemsRow, { backgroundColor: f.idx % 2 === 1 ? GRIS_ZEBRA : undefined }]} wrap={false}>
          <Text style={[styles.itemsCell, { width: "5%", textAlign: "center" }]}>{f.idx + 1}</Text>
          {incluirCodigo && <Text style={[styles.itemsCell, { width: "9%", textAlign: "center" }]}>{f.codigo}</Text>}
          <Text style={[styles.itemsCell, { width: "6%", textAlign: "center" }]}>{f.cant}</Text>
          <Text style={[styles.itemsCell, { width: "6%", textAlign: "center" }]}>{f.um}</Text>
          <Text style={[styles.itemsCell, { width: colDescPct }]}>{f.descripcion}</Text>
          <Text style={[styles.itemsCell, { width: "10%", textAlign: "center", fontSize: 7.5 }]}>{f.entrega}</Text>
          <Text style={[styles.itemsCell, { width: "14%", textAlign: "right" }]}>{money(f.vunit)}</Text>
          <Text style={[styles.itemsCell, { width: "16%", textAlign: "right", fontWeight: 700 }]}>{money(f.vtotal)}</Text>
        </View>
      ))}

      <View style={styles.totalsWrap}>
        <View style={styles.totalsBox}>
          {etiquetas.map(([label, val, destacado], i) => (
            <View key={i} style={destacado ? styles.totalRowDestacado : styles.totalRow}>
              <Text style={[styles.totalLabel, destacado ? { color: "#FFFFFF" } : {}]}>{label}</Text>
              <Text style={[styles.totalValue, { width: "45%" }, destacado ? { color: "#FFFFFF", fontWeight: 700 } : {}]}>
                {monedaSym} {money(val)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sonPara}>SON: {son}.</Text>

      <View style={styles.boxedWrap} wrap={false}>
        <View style={styles.boxedCell}>
          <Text style={styles.boxedTitle}>02 / DATOS BANCARIOS</Text>
          {cuentas.length === 0 && <Text style={styles.boxedLine}>(Pendiente de proporcionar por el proveedor)</Text>}
          {cuentas.map((c, i) => (
            <Text key={i} style={styles.boxedLine}>
              {c.banco}: {c.cuenta}
              {c.cci ? ` | CCI: ${c.cci}` : ""}
            </Text>
          ))}
          {prov.detraccion && (
            <Text style={styles.boxedLine}>
              <Text style={styles.labelBold}>Detracción: </Text>
              {prov.detraccion}
            </Text>
          )}
        </View>
        <View style={styles.boxedCell}>
          <Text style={styles.boxedTitle}>03 / CONDICIONES Y ENTREGA</Text>
          {data.forma_pago && (
            <Text style={styles.boxedLine}>
              <Text style={styles.labelBold}>Forma de pago: </Text>
              {data.forma_pago}
            </Text>
          )}
          {(data.origen || data.destino || data.lugar_entrega) && (
            <Text style={styles.boxedLine}>
              Origen: {data.origen || ""}  |  Destino: {data.destino || data.lugar_entrega || ""}
            </Text>
          )}
          <Text style={[styles.boxedLine, styles.labelBold]}>FACTURACIÓN Y CAMBIOS</Text>
          <Text style={styles.boxedLine}>
            Toda comunicación relacionada con facturación y cambios deberá enviarse a: administracion@gtoperu.com
          </Text>
        </View>
      </View>

      {hay04 && (
        <View>
          <Text style={styles.sectionTitle}>04 / OBSERVACIONES</Text>
          {condicionesExtra.map((linea, i) => (
            <Text key={i} style={styles.obsLine}>
              {linea}
            </Text>
          ))}
          {data.observaciones && <Text style={[styles.obsLine, { marginBottom: 6 }]}>{data.observaciones}</Text>}
          {data.garantia && (
            <Text style={styles.obsLine}>
              <Text style={styles.labelBold}>Garantía: </Text>
              {data.garantia}
            </Text>
          )}
          {data.penalidad && (
            <Text style={styles.obsLine}>
              <Text style={styles.labelBold}>Penalidad por retraso en la entrega: </Text>
              {data.penalidad}
            </Text>
          )}
          <Text style={styles.legalBlock}>
            <Text style={styles.labelBold}>ACEPTACIÓN DE LA ORDEN: </Text>
            El proveedor deberá confirmar la recepción y aceptación de la OC {numeroTxt} dentro de un plazo máximo de dos (2) días
            calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se
            considerará aceptada tácitamente.
          </Text>
          <Text style={styles.legalBlock}>
            <Text style={styles.labelBold}>DOCUMENTOS PARA FACTURACIÓN: </Text>
            Consignar la OC {numeroTxt} y adjuntar factura, guía de remisión o constancia del servicio y conformidad, cuando
            corresponda.
          </Text>
          {data.incluir_anticorrupcion !== false && (
            <Text style={styles.legalBlock}>
              <Text style={styles.labelBold}>CUMPLIMIENTO: </Text>
              El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y
              antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden.
            </Text>
          )}
        </View>
      )}

      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `${EMPRESA.direccionCorta}  |  ${EMPRESA.whatsapp}  |  ${EMPRESA.correos.split(" | ")[0]}  |  ${EMPRESA.web}  |  Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  );
}

export async function generarOrdenPdf(data: OrdenCompraData): Promise<Buffer> {
  const fs = await import("node:fs");
  const logoPath = path.join(process.cwd(), "assets", "gto_logo.png");
  let logoDataUri: string | null = null;
  if (fs.existsSync(logoPath)) {
    const b64 = fs.readFileSync(logoPath).toString("base64");
    logoDataUri = `data:image/png;base64,${b64}`;
  }

  const buf = await renderToBuffer(
    <Document>
      <OrdenDocumento data={data} logoDataUri={logoDataUri} />
    </Document>
  );
  return buf;
}
