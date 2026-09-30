import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { EMPRESA, GRIS_TEXTO_HEX, VERDE_HEX, VERDE_CLARO_HEX } from "@/lib/empresa";
import { montoALetras } from "@/lib/numeroALetras";
import type { OrdenCompraData } from "@/lib/types";

// Formato con recuadros sobre la hoja membretada de GTO PERU (logo arriba y datos de contacto al pie vienen del membrete)
const GRIS_TEXTO = `#${GRIS_TEXTO_HEX}`;
const VERDE = `#${VERDE_HEX}`;
const VERDE_CLARO = `#${VERDE_CLARO_HEX}`;
const VERDE_OSCURO = "#016B39";
const BORDE = "#8FBFA3";
const GRIS_CAB = VERDE;
const B = "Helvetica-Bold";

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: { paddingTop: 80, paddingBottom: 100, paddingHorizontal: 30, fontSize: 8, fontFamily: "Helvetica", color: "#000000" },
  // título fijo arriba a la derecha (se repite en cada página, junto al logo del membrete)
  top: { position: "absolute", top: 28, right: 30, alignItems: "flex-end" },
  fondo: { position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 },
  titulo: { fontSize: 16, fontFamily: B, color: VERDE, textAlign: "right" },
  subtitulo: { fontSize: 9.5, fontFamily: B, marginTop: 2, textAlign: "right", color: "#333333" },
  numero: { fontSize: 11, fontFamily: B, marginTop: 3, textAlign: "right", color: "#FFFFFF", backgroundColor: VERDE, paddingVertical: 2, paddingHorizontal: 8, alignSelf: "flex-end" },
  refRow: { flexDirection: "row", marginTop: 0, borderBottomWidth: 1.5, borderColor: VERDE, paddingBottom: 5 },
  refLabel: { fontFamily: B, fontSize: 9, width: 86, color: VERDE_OSCURO },
  refValue: { fontSize: 9, width: 110 },
  cajas: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  caja: { borderWidth: 1, borderColor: BORDE, padding: 5, backgroundColor: "#FFFFFF" },
  cajaTitulo: { fontFamily: B, fontSize: 8, marginBottom: 3, color: VERDE },
  fila: { flexDirection: "row", marginBottom: 2.5 },
  lab: { fontFamily: B, width: 78, color: VERDE_OSCURO },
  val: { flex: 1 },
  intro: { marginTop: 12, marginBottom: 6, marginLeft: 4, fontSize: 8.5 },
  tabla: { borderWidth: 1, borderColor: BORDE, borderBottomWidth: 0 },
  th: { flexDirection: "row", backgroundColor: GRIS_CAB, borderBottomWidth: 1, borderColor: VERDE },
  thCell: { fontFamily: B, fontSize: 7.2, padding: 2.5, borderRightWidth: 1, borderColor: "#FFFFFF", color: "#FFFFFF" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDE, backgroundColor: "#FFFFFF" },
  td: { padding: 2.5, borderRightWidth: 1, borderColor: BORDE, fontSize: 7.8 },
  totales: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  son: { width: "56%", fontSize: 8, paddingTop: 4 },
  totBox: { width: "40%", borderWidth: 1, borderColor: BORDE, borderBottomWidth: 0, backgroundColor: "#FFFFFF" },
  totRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDE },
  totLab: { flex: 1, padding: 3, fontFamily: B, fontSize: 8 },
  totVal: { width: "45%", padding: 3, textAlign: "right", fontSize: 8, borderLeftWidth: 1, borderColor: BORDE },
  bloque: { borderWidth: 1, borderColor: BORDE, marginTop: 8, backgroundColor: "#FFFFFF" },
  bloqueTit: { backgroundColor: VERDE_CLARO, color: VERDE_OSCURO, fontFamily: B, fontSize: 8, paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 1, borderColor: BORDE },
  bloqueCuerpo: { padding: 5 },
  linea: { fontSize: 8, marginBottom: 2.5 },
  legal: { fontSize: 7.5, marginBottom: 3, color: "#222222" },
  pie: { position: "absolute", left: 30, right: 30, bottom: 68, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  pieConf: { width: "90%", fontSize: 6.5, fontStyle: "italic", color: VERDE_OSCURO },
  piePagina: { fontSize: 8, color: GRIS_TEXTO, textAlign: "right" }
});

function Fila({ l, v }: { l: string; v: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.lab}>{l}</Text>
      <Text style={s.val}>{v || "—"}</Text>
    </View>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.bloque} wrap={false}>
      <Text style={s.bloqueTit}>{titulo}</Text>
      <View style={s.bloqueCuerpo}>{children}</View>
    </View>
  );
}

function OrdenDocumento({ data, fondoDataUri }: { data: OrdenCompraData; fondoDataUri: string | null }) {
  const esServicio = data.tipo === "SERVICIO";
  const numeroPadded = String(data.numero).padStart(6, "0");
  const prov = data.proveedor;
  const moneda = data.moneda || "SOLES";
  const monedaSym = moneda.toUpperCase().startsWith("DOLAR") || moneda.toUpperCase().startsWith("USD") ? "US$" : "S/";
  const monedaTexto = monedaSym === "US$" ? "DÓLARES" : "SOLES";

  const items = data.items;
  const incluirCodigo = items.some((it) => (it.codigo || "").toString().trim() !== "");

  let opGravadas = 0;
  const filas = items.map((item, idx) => {
    const cant = Number(item.cantidad);
    const vunit = Number(item.valor_unitario);
    const vtotal = Math.round(cant * vunit * 100) / 100;
    opGravadas += vtotal;
    return {
      idx,
      cant,
      vunit,
      vtotal,
      entrega: item.entrega || data.fecha_entrega || "Por coordinar",
      um: item.um || "UND",
      descripcion: item.descripcion,
      codigo: item.codigo || ""
    };
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

  // anchos en pt (ancho útil 535)
  const W = incluirCodigo
    ? { item: 34, cod: 46, desc: 179, cant: 40, um: 36, ent: 58, vu: 66, imp: 76 }
    : { item: 34, cod: 0, desc: 225, cant: 40, um: 36, ent: 58, vu: 66, imp: 76 };

  const cuentas = prov.cuentas_bancarias || [];
  const condicionesExtra = data.condiciones_especiales || [];
  const observaciones = (data.observaciones || "").trim();
  const lugar = data.lugar_entrega || (data.origen || data.destino ? `${data.origen || ""} → ${data.destino || ""}` : "");
  const correoFact = EMPRESA.correos.split(" | ")[1] || EMPRESA.correos.split(" | ")[0];

  return (
    <Page size="A4" style={s.page}>
      {fondoDataUri ? <Image src={fondoDataUri} style={s.fondo} fixed /> : null}
      <View style={s.top} fixed>
        <View>
          <Text style={s.titulo}>{esServicio ? "ORDEN DE SERVICIO" : "ORDEN DE COMPRA"}</Text>
          <Text style={s.subtitulo}>GTO PERU S.A.C. · R.U.C. {EMPRESA.ruc}</Text>
          <Text style={s.numero}>N° {numeroPadded}</Text>
        </View>
      </View>

      <View style={s.refRow}>
        <View>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.refLabel}>{esServicio ? "Orden Servicio:" : "Orden Compra:"}</Text>
            <Text style={s.refValue}>{numeroPadded}</Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 1 }}>
            <Text style={s.refLabel}>Fecha emisión:</Text>
            <Text style={s.refValue}>{data.fecha_emision || ""}</Text>
          </View>
        </View>
        <View style={{ marginLeft: 18 }}>
          <Text style={{ fontFamily: B, fontSize: 9 }}>Moneda: {moneda === "DOLARES" ? "USD - Dólar americano" : "PEN - Sol peruano"}</Text>
          <Text style={{ fontSize: 9, marginTop: 1 }}>Forma de pago: {data.forma_pago || "Por coordinar"}</Text>
        </View>
      </View>

      <View style={s.cajas}>
        <View style={{ width: "54%" }}>
          <View style={s.caja}>
            <Text style={s.cajaTitulo}>PROVEEDOR</Text>
            {prov.codigo_proveedor ? <Fila l="Código:" v={prov.codigo_proveedor} /> : null}
            <Fila l="Razón social:" v={prov.razon_social || ""} />
            <Fila l="R.U.C. / DNI:" v={prov.ruc || ""} />
            <Fila l="Dirección:" v={prov.direccion || ""} />
            <Fila l="ATT:" v={prov.contacto || ""} />
            <Fila l="Teléfono:" v={prov.telefono || ""} />
            <Fila l="Email:" v={prov.email || ""} />
          </View>
          <View style={[s.caja, { marginTop: 6 }]}>
            <Fila l="Lugar de entrega:" v={lugar || `Sede operativa GTO PERU\n${EMPRESA.sedeOperativa}`} />
            <Fila l="Fecha requerida:" v={data.fecha_entrega || "Por coordinar"} />
            <Fila l="Centro de costos:" v={data.centro_costos || ""} />
          </View>
        </View>
        <View style={{ width: "43%" }}>
          <View style={s.caja}>
            <Fila l="Comprador:" v={data.comprador || "Área de Compras / Logística"} />
            <Fila l="E:" v={EMPRESA.correos.split(" | ")[0]} />
            <Fila l="T:" v={EMPRESA.celulares} />
          </View>
          <View style={[s.caja, { marginTop: 6 }]}>
            <Fila l="Ref. cotización:" v={data.doc_relacionado || ""} />
            <Fila l="Tipo proveedor:" v="Nacional" />
            <Fila l="Facturar a:" v={`${EMPRESA.nombreLegal}\nR.U.C. ${EMPRESA.ruc}`} />
          </View>
        </View>
      </View>

      <Text style={s.intro}>
        Sírvase atender los {esServicio ? "servicios" : "materiales"} detallados a continuación, en las condiciones indicadas:
      </Text>

      <View style={s.tabla}>
        <View style={s.th} fixed>
          <Text style={[s.thCell, { width: W.item }]}>{"Ítem\nNo."}</Text>
          {incluirCodigo ? <Text style={[s.thCell, { width: W.cod }]}>Código</Text> : null}
          <Text style={[s.thCell, { width: W.desc }]}>Descripción</Text>
          <Text style={[s.thCell, { width: W.cant, textAlign: "right" }]}>Cantidad</Text>
          <Text style={[s.thCell, { width: W.um }]}>{"Unidad\nMedida"}</Text>
          <Text style={[s.thCell, { width: W.ent }]}>{"Fecha de\nentrega"}</Text>
          <Text style={[s.thCell, { width: W.vu, textAlign: "right" }]}>{`V. Unitario\n(sin IGV) ${monedaSym}`}</Text>
          <Text style={[s.thCell, { width: W.imp, textAlign: "right", borderRightWidth: 0 }]}>{`Importe\n(sin IGV) ${monedaSym}`}</Text>
        </View>
        {filas.map((f) => (
          <View key={f.idx} style={s.tr} wrap={false}>
            <Text style={[s.td, { width: W.item }]}>{String((f.idx + 1) * 10).padStart(5, "0")}</Text>
            {incluirCodigo ? <Text style={[s.td, { width: W.cod }]}>{f.codigo}</Text> : null}
            <Text style={[s.td, { width: W.desc, fontFamily: B }]}>{f.descripcion}</Text>
            <Text style={[s.td, { width: W.cant, textAlign: "right" }]}>{String(f.cant)}</Text>
            <Text style={[s.td, { width: W.um }]}>{f.um}</Text>
            <Text style={[s.td, { width: W.ent, fontSize: 7.2 }]}>{f.entrega}</Text>
            <Text style={[s.td, { width: W.vu, textAlign: "right" }]}>{money(f.vunit)}</Text>
            <Text style={[s.td, { width: W.imp, textAlign: "right", borderRightWidth: 0 }]}>{money(f.vtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={s.totales} wrap={false}>
        <Text style={s.son}>
          <Text style={{ fontFamily: B }}>SON: </Text>
          {son}.
        </Text>
        <View style={s.totBox}>
          {totales.map(([label, val, dest], i) => (
            <View key={i} style={[s.totRow, dest ? { backgroundColor: VERDE } : {}]}>
              <Text style={[s.totLab, dest ? { color: "#FFFFFF" } : {}]}>{label}</Text>
              <Text style={[s.totVal, dest ? { fontFamily: B, color: "#FFFFFF" } : {}]}>
                {monedaSym} {money(val)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Bloque titulo="CONDICIONES COMERCIALES">
        <Text style={s.linea}>
          <Text style={{ fontFamily: B }}>Forma de pago: </Text>
          {data.forma_pago || "Por coordinar."}
        </Text>
        <Text style={s.linea}>
          <Text style={{ fontFamily: B }}>Plazo de entrega: </Text>
          {data.fecha_entrega || "Por coordinar con el proveedor."}
        </Text>
        {lugar ? (
          <Text style={s.linea}>
            <Text style={{ fontFamily: B }}>Lugar de recojo y entrega: </Text>
            {lugar}
          </Text>
        ) : null}
        {data.garantia ? (
          <Text style={s.linea}>
            <Text style={{ fontFamily: B }}>Garantía: </Text>
            {data.garantia}
          </Text>
        ) : null}
        {data.penalidad ? (
          <Text style={s.linea}>
            <Text style={{ fontFamily: B }}>Penalidad por retraso en la entrega: </Text>
            {data.penalidad}
          </Text>
        ) : null}
      </Bloque>

      <Bloque titulo="CUENTAS BANCARIAS DEL PROVEEDOR">
        {cuentas.length === 0 ? <Text style={s.linea}>(Pendiente de proporcionar por el proveedor)</Text> : null}
        {cuentas.map((c, i) => (
          <Text key={i} style={s.linea}>
            {c.banco}: {c.cuenta}
            {c.cci ? `   |   CCI: ${c.cci}` : ""}
          </Text>
        ))}
        {prov.detraccion ? (
          <Text style={s.linea}>
            <Text style={{ fontFamily: B }}>Detracción: </Text>
            {prov.detraccion}
          </Text>
        ) : null}
      </Bloque>

      <View style={s.bloque}>
        <Text style={s.bloqueTit}>OBSERVACIONES Y CONDICIONES</Text>
        <View style={s.bloqueCuerpo}>
          {condicionesExtra.map((linea, i) => (
            <Text key={i} style={s.linea}>
              {linea}
            </Text>
          ))}
          {observaciones ? <Text style={s.linea}>{observaciones}</Text> : null}
          <Text style={s.legal}>
            <Text style={{ fontFamily: B }}>Aceptación de la orden: </Text>
            El proveedor deberá confirmar la recepción y aceptación de esta orden dentro de un plazo máximo de dos (2) días
            calendario contados desde su envío. Si no comunica observaciones o rechazo dentro de dicho plazo, la orden se
            considerará aceptada tácitamente.
          </Text>
          <Text style={s.legal}>
            <Text style={{ fontFamily: B }}>Documentos para facturación: </Text>
            Consignar el número de esta orden y adjuntar factura, guía de remisión o constancia del servicio y conformidad,
            cuando corresponda. Enviar a: {correoFact}
          </Text>
          {data.incluir_anticorrupcion !== false ? (
            <Text style={s.legal}>
              <Text style={{ fontFamily: B }}>Cumplimiento: </Text>
              El proveedor declara conocer y cumplir la legislación peruana e internacional en materia anticorrupción y
              antisoborno, absteniéndose de ofrecer o entregar cualquier beneficio indebido en el marco de esta orden.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={s.pie} fixed>
        <Text style={s.pieConf}>
          Este documento es confidencial y está dirigido únicamente al proveedor indicado. Si lo recibió por error, por favor
          notifíquelo a {EMPRESA.correos.split(" | ")[0]} y elimínelo.
        </Text>
        <Text style={s.piePagina} render={({ pageNumber, totalPages }) => `${pageNumber} | ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function generarOrdenPdf(data: OrdenCompraData): Promise<Buffer> {
  const fs = await import("node:fs");
  // Hoja membretada GTO PERU (fondo de página completa: logo arriba, contactos y gráfico al pie)
  const fondoPath = path.join(process.cwd(), "public", "membrete-gto.jpg");
  let fondoDataUri: string | null = null;
  if (fs.existsSync(fondoPath)) {
    const b64 = fs.readFileSync(fondoPath).toString("base64");
    fondoDataUri = `data:image/jpeg;base64,${b64}`;
  }

  const buf = await renderToBuffer(
    <Document title={`${data.tipo === "SERVICIO" ? "Orden de servicio" : "Orden de compra"} ${data.numero}`}>
      <OrdenDocumento data={data} fondoDataUri={fondoDataUri} />
    </Document>
  );
  return buf;
}
