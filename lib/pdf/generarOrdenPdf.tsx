import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_ZEBRA_HEX, GRIS_TEXTO_HEX } from "@/lib/empresa";
import { montoALetras } from "@/lib/numeroALetras";
import type { OrdenCompraData } from "@/lib/types";

const VERDE = `#${VERDE_HEX}`;
const GRIS_ZEBRA = `#${GRIS_ZEBRA_HEX}`;
const GRIS_TEXTO = `#${GRIS_TEXTO_HEX}`;

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 34, paddingHorizontal: 40, fontSize: 8.5, fontFamily: "Helvetica", color: "#111111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  logo: { width: 150, height: 42.4 },
  headerRight: { alignItems: "flex-end" },
  tituloOC: { fontSize: 20, fontWeight: 700, color: VERDE, textAlign: "right" },
  ocNumero: { fontSize: 13, fontWeight: 700, color: VERDE, marginTop: 4 },
  ocRuc: { fontSize: 9, marginTop: 2, color: "#333333" },
  empresaInfo: { fontSize: 8, marginBottom: 2 },
  empresaLabel: { fontWeight: 700 },
  divider: { borderBottomWidth: 2, borderColor: VERDE, marginTop: 6, marginBottom: 10 },
  infoRow: { flexDirection: "row" },
  infoCellLabel: { padding: 5, fontSize: 8, fontWeight: 700 },
  infoCellValue: { padding: 5, fontSize: 8 },
  sectionBar: { backgroundColor: VERDE, paddingVertical: 5, paddingHorizontal: 8, marginTop: 12, marginBottom: 6 },
  sectionBarText: { fontSize: 9.5, fontWeight: 700, color: "#FFFFFF" },
  itemsHeaderRow: { flexDirection: "row", backgroundColor: VERDE },
  itemsHeaderCell: { padding: 4, fontSize: 7.5, fontWeight: 700, color: "#FFFFFF" },
  itemsRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#D9D9D9" },
  itemsCell: { padding: 4, fontSize: 8 },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalsBox: { width: "48%" },
  totalRow: { flexDirection: "row", backgroundColor: GRIS_ZEBRA, marginBottom: 1 },
  totalRowDestacado: { flexDirection: "row", backgroundColor: VERDE, marginBottom: 1 },
  totalLabel: { flex: 1, padding: 5, fontSize: 8.5, fontWeight: 700 },
  totalValue: { padding: 5, fontSize: 8.5, textAlign: "right" },
  sonPara: { marginTop: 8, marginBottom: 4, fontSize: 8.5, fontStyle: "italic" },
  sonLabel: { fontWeight: 700, fontStyle: "normal" },
  bodyLine: { fontSize: 8.5, marginBottom: 3 },
  labelBold: { fontWeight: 700 },
  legalBlock: { fontSize: 8, marginBottom: 4, color: "#222222" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderColor: "#CCCCCC",
    paddingTop: 4,
    fontSize: 7.5,
    color: GRIS_TEXTO,
    textAlign: "center"
  }
});

function TablaInfo({ izquierda, derecha }: { izquierda: [string, string][]; derecha: [string, string][] }) {
  const filas = Math.max(izquierda.length, derecha.length);
  return (
    <View style={{ borderWidth: 0.5, borderColor: "#D9D9D9" }}>
      {Array.from({ length: filas }).map((_, i) => {
        const shaded = i % 2 === 0;
        const [labelI, valorI] = izquierda[i] || ["", ""];
        const [labelD, valorD] = derecha[i] || ["", ""];
        return (
          <View key={i} style={[styles.infoRow, { backgroundColor: shaded ? GRIS_ZEBRA : "#FFFFFF" }]}>
            <Text style={[styles.infoCellLabel, { width: "16%" }]}>{labelI}</Text>
            <Text style={[styles.infoCellValue, { width: "34%" }]}>{valorI}</Text>
            <Text style={[styles.infoCellLabel, { width: "20%" }]}>{labelD}</Text>
            <Text style={[styles.infoCellValue, { width: "30%" }]}>{valorD}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SectionBar({ texto }: { texto: string }) {
  return (
    <View style={styles.sectionBar}>
      <Text style={styles.sectionBarText}>{texto}</Text>
    </View>
  );
}

function OrdenDocumento({ data, logoDataUri }: { data: OrdenCompraData; logoDataUri: string | null }) {
  const numeroPadded = String(data.numero).padStart(6, "0");
  const prov = data.proveedor;
  const moneda = data.moneda || "SOLES";
  const monedaSym = moneda.toUpperCase().startsWith("DOLAR") || moneda.toUpperCase().startsWith("USD") ? "US$" : "S/";
  const monedaTexto = monedaSym === "US$" ? "DÓLARES" : "SOLES";

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
  etiquetas.push(["I.G.V. (18%)", igv, false]);
  etiquetas.push(["IMPORTE TOTAL", total, true]);

  const cuentas = prov.cuentas_bancarias || [];
  const condicionesExtra = data.condiciones_especiales || [];
  const observaciones = (data.observaciones || "").trim();
  const hayObservaciones = condicionesExtra.length > 0 || !!data.garantia || !!data.penalidad || !!observaciones;

  const colDescPct = incluirCodigo ? "32%" : "36%";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerRow}>
        {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : <View />}
        <View style={styles.headerRight}>
          <Text style={styles.tituloOC}>ORDEN DE COMPRA</Text>
          <Text style={styles.ocNumero}>N° {numeroPadded}</Text>
          <Text style={styles.ocRuc}>R.U.C. {EMPRESA.ruc}</Text>
        </View>
      </View>

      <Text style={styles.empresaInfo}>
        <Text style={styles.empresaLabel}>Sede fiscal: </Text>
        {EMPRESA.domicilioFiscal}
      </Text>
      <Text style={styles.empresaInfo}>
        <Text style={styles.empresaLabel}>Sede operativa: </Text>
        {EMPRESA.sedeOperativa}
      </Text>
      <Text style={styles.empresaInfo}>
        Tel: {EMPRESA.celulares}   |   {EMPRESA.correos.split(" | ")[0]}
      </Text>
      <Text style={styles.empresaInfo}>{EMPRESA.web}</Text>

      <View style={styles.divider} />

      <TablaInfo izquierda={izquierda} derecha={derecha} />

      <View style={{ marginTop: 12 }}>
        <View style={styles.itemsHeaderRow}>
          <Text style={[styles.itemsHeaderCell, { width: "6%" }]}>ÍTEM</Text>
          {incluirCodigo && <Text style={[styles.itemsHeaderCell, { width: "9%" }]}>CÓDIGO</Text>}
          <Text style={[styles.itemsHeaderCell, { width: colDescPct }]}>DESCRIPCIÓN</Text>
          <Text style={[styles.itemsHeaderCell, { width: "7%" }]}>CANT.</Text>
          <Text style={[styles.itemsHeaderCell, { width: "7%" }]}>U.M.</Text>
          <Text style={[styles.itemsHeaderCell, { width: "10%" }]}>ENTREGA</Text>
          <Text style={[styles.itemsHeaderCell, { width: "15%", textAlign: "right" }]}>V. UNIT. ({monedaSym})</Text>
          <Text style={[styles.itemsHeaderCell, { width: "16%", textAlign: "right" }]}>IMPORTE ({monedaSym})</Text>
        </View>
        {filasItems.map((f) => (
          <View key={f.idx} style={styles.itemsRow} wrap={false}>
            <Text style={[styles.itemsCell, { width: "6%", textAlign: "center" }]}>{f.idx + 1}</Text>
            {incluirCodigo && <Text style={[styles.itemsCell, { width: "9%", textAlign: "center" }]}>{f.codigo}</Text>}
            <Text style={[styles.itemsCell, { width: colDescPct }]}>{f.descripcion}</Text>
            <Text style={[styles.itemsCell, { width: "7%", textAlign: "center" }]}>{f.cant}</Text>
            <Text style={[styles.itemsCell, { width: "7%", textAlign: "center" }]}>{f.um}</Text>
            <Text style={[styles.itemsCell, { width: "10%", textAlign: "center", fontSize: 7.5 }]}>{f.entrega}</Text>
            <Text style={[styles.itemsCell, { width: "15%", textAlign: "right" }]}>{money(f.vunit)}</Text>
            <Text style={[styles.itemsCell, { width: "16%", textAlign: "right", fontWeight: 700 }]}>{money(f.vtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalsWrap}>
        <View style={styles.totalsBox}>
          {etiquetas.map(([label, val, destacado], i) => (
            <View key={i} style={destacado ? styles.totalRowDestacado : styles.totalRow}>
              <Text style={[styles.totalLabel, destacado ? { color: "#FFFFFF" } : {}]}>{label}</Text>
              <Text style={[styles.totalValue, { width: "50%" }, destacado ? { color: "#FFFFFF", fontWeight: 700 } : {}]}>
                {monedaSym} {money(val)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sonPara}>
        <Text style={styles.sonLabel}>SON: </Text>
        {son}.
      </Text>

      <SectionBar texto="CONDICIONES COMERCIALES" />
      {data.forma_pago && (
        <Text style={styles.bodyLine}>
          <Text style={styles.labelBold}>Forma de pago: </Text>
          {data.forma_pago}
        </Text>
      )}
      {(data.lugar_entrega || data.origen || data.destino) && (
        <Text style={styles.bodyLine}>
          <Text style={styles.labelBold}>Lugar de recojo y entrega: </Text>
          {data.lugar_entrega || `${data.origen || ""} → ${data.destino || ""}`}
        </Text>
      )}
      <Text style={styles.bodyLine}>
        <Text style={styles.labelBold}>Plazo de entrega: </Text>
        {data.fecha_entrega || "Por coordinar con el proveedor."}
      </Text>
      {data.garantia && (
        <Text style={styles.bodyLine}>
          <Text style={styles.labelBold}>Garantía: </Text>
          {data.garantia}
        </Text>
      )}
      {data.penalidad && (
        <Text style={styles.bodyLine}>
          <Text style={styles.labelBold}>Penalidad por retraso en la entrega: </Text>
          {data.penalidad}
        </Text>
      )}

      <SectionBar texto="CUENTAS BANCARIAS" />
      {cuentas.length === 0 && <Text style={styles.bodyLine}>(Pendiente de proporcionar por el proveedor)</Text>}
      {cuentas.map((c, i) => (
        <Text key={i} style={styles.bodyLine}>
          {c.banco}: {c.cuenta}
          {c.cci ? `  |  CCI: ${c.cci}` : ""}
        </Text>
      ))}
      {prov.detraccion && (
        <Text style={styles.bodyLine}>
          <Text style={styles.labelBold}>Detracción: </Text>
          {prov.detraccion}
        </Text>
      )}

      {hayObservaciones && (
        <>
          <SectionBar texto="OBSERVACIONES" />
          {condicionesExtra.map((linea, i) => (
            <Text key={i} style={styles.bodyLine}>
              {linea}
            </Text>
          ))}
          {observaciones && <Text style={styles.bodyLine}>{observaciones}</Text>}
          <Text style={styles.legalBlock}>
            <Text style={styles.labelBold}>Aceptación de la orden: </Text>
            El proveedor deberá confirmar la recepción y aceptación de esta OC dentro de un plazo máximo de dos (2) días
            calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se
            considerará aceptada tácitamente.
          </Text>
          <Text style={styles.legalBlock}>
            <Text style={styles.labelBold}>Documentos para facturación: </Text>
            Consignar el número de esta OC y adjuntar factura, guía de remisión o constancia del servicio y conformidad,
            cuando corresponda.
          </Text>
          {data.incluir_anticorrupcion !== false && (
            <Text style={styles.legalBlock}>
              <Text style={styles.labelBold}>Cumplimiento: </Text>
              El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y
              antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden.
            </Text>
          )}
        </>
      )}

      <SectionBar texto="COMUNICACIÓN" />
      <Text style={styles.bodyLine}>
        Toda comunicación relacionada con facturación y cambios deberá enviarse a:{" "}
        <Text style={styles.labelBold}>{EMPRESA.correos.split(" | ")[1] || EMPRESA.correos.split(" | ")[0]}</Text>
      </Text>

      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `${EMPRESA.nombreComercial}   |   R.U.C. ${EMPRESA.ruc}   |   ${EMPRESA.web}   |   Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  );
}

export async function generarOrdenPdf(data: OrdenCompraData): Promise<Buffer> {
  const fs = await import("node:fs");
  const logoPath = path.join(process.cwd(), "public", "logo-gto.png");
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
