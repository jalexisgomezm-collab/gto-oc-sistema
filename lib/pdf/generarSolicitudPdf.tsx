import React from "react";
import { Document, Page, View, Text, Image, Link, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_TEXTO_HEX } from "@/lib/empresa";

const VERDE = `#${VERDE_HEX}`;
const GRIS_TEXTO = `#${GRIS_TEXTO_HEX}`;
const BORDE = "#000000";
const GRIS_CAB = "#D9D9D9";
const B = "Helvetica-Bold";

export interface SolicitudPdfData {
  numero: number;
  area: string;
  solicitante: string;
  fecha: string;
  prioridad: string;
  estado: string;
  proyecto: string;
  cliente: string | null;
  ocCliente: string | null;
  referenciaOrden: string | null;
  observaciones: string | null;
  generadoPor: string;
  generadoEl: string;
  items: {
    cantidad: number;
    um: string;
    descripcion: string;
    observacion: string | null;
    fotos: { data: Buffer; format: "png" | "jpg"; nombre: string }[];
    fotosNoMostradas: number;
    enlaces: { url: string; nombre: string }[];
  }[];
}

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 92, paddingHorizontal: 30, fontSize: 8, fontFamily: "Helvetica", color: "#000000" },
  // cabecera
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titulo: { fontSize: 15, fontFamily: B },
  subtitulo: { fontSize: 10, fontFamily: B, marginTop: 1 },
  logo: { width: 128, height: 36.2 },
  refRow: { flexDirection: "row", marginTop: 10 },
  refLabel: { fontFamily: B, fontSize: 9, width: 86 },
  refValue: { fontSize: 9, width: 110 },
  refNota: { fontFamily: B, fontSize: 9 },
  // recuadros
  cajas: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  caja: { borderWidth: 1, borderColor: BORDE, padding: 5 },
  fila: { flexDirection: "row", marginBottom: 2.5 },
  lab: { fontFamily: B, width: 72 },
  val: { flex: 1 },
  intro: { marginTop: 12, marginBottom: 6, marginLeft: 4, fontSize: 8.5 },
  // tabla
  tabla: { borderWidth: 1, borderColor: BORDE, borderBottomWidth: 0 },
  th: { flexDirection: "row", backgroundColor: GRIS_CAB, borderBottomWidth: 1, borderColor: BORDE },
  thCell: { fontFamily: B, fontSize: 7.2, padding: 2.5, borderRightWidth: 1, borderColor: BORDE },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDE },
  td: { padding: 2.5, borderRightWidth: 1, borderColor: BORDE, fontSize: 7.8 },
  box: { width: 10, height: 10, borderWidth: 1, borderColor: BORDE, alignSelf: "center", marginTop: 2 },
  // referencias
  refTitulo: { fontFamily: B, fontSize: 9, marginTop: 14, paddingBottom: 3, borderBottomWidth: 1, borderColor: BORDE },
  refBloque: { marginTop: 6 },
  refItem: { fontFamily: B, fontSize: 8 },
  refFotos: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  refFoto: { width: 170, marginRight: 8, marginBottom: 6, borderWidth: 0.5, borderColor: "#BFBFBF", padding: 3 },
  refImg: { width: 162, height: 122, objectFit: "contain" },
  refPie: { fontSize: 6.5, color: GRIS_TEXTO, marginTop: 2 },
  refAviso: { fontSize: 7, color: GRIS_TEXTO, marginTop: 2 },
  refEnlace: { fontSize: 7.5, marginTop: 2, color: "#1F4E79" },
  // firmas
  firmas: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  firma: { width: "30%", alignItems: "center" },
  firmaLinea: { borderTopWidth: 0.8, borderColor: BORDE, width: "100%", marginBottom: 3 },
  // pie
  pie: { position: "absolute", left: 30, right: 30, bottom: 18 },
  pieLinea: { borderTopWidth: 0.8, borderColor: BORDE, marginBottom: 4 },
  pieEmpresa: { fontSize: 7, textAlign: "right", lineHeight: 1.25 },
  pieConf: { fontSize: 7, fontStyle: "italic", color: "#4A6B2A", marginTop: 4 },
  piePagina: { fontSize: 7.5, fontFamily: B, textAlign: "right", marginTop: 2 }
});

const COLS = [
  { k: "item", label: "Ítem\nNo.", w: 34 },
  { k: "desc", label: "Descripción", w: 205 },
  { k: "cant", label: "Cantidad", w: 42, right: true },
  { k: "um", label: "Unidad\nMedida", w: 36 },
  { k: "precio", label: "INDICAR\nPrecio Unitario\n(Inc. IGV)", w: 62 },
  { k: "lugar", label: "INDICAR\nTienda / Proveedor", w: 76 },
  { k: "comp", label: "Com-\nprado", w: 39, center: true },
  { k: "rec", label: "Reci-\nbido", w: 41, center: true }
];

function Fila({ l, v }: { l: string; v: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.lab}>{l}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

function Documento({ d, logo }: { d: SolicitudPdfData; logo: string | null }) {
  const num = String(d.numero).padStart(6, "0");
  return (
    <Page size="A4" style={s.page}>
      {/* Cabecera */}
      <View style={s.top}>
        <View>
          <Text style={s.titulo}>SOLICITUD DE PEDIDO</Text>
          <Text style={s.subtitulo}>GTO PERU · Módulo de Logística y Compras</Text>
        </View>
        {logo ? <Image src={logo} style={s.logo} /> : <View />}
      </View>

      <View style={s.refRow}>
        <View>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.refLabel}>Solic. Pedido:</Text>
            <Text style={s.refValue}>{num}</Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 1 }}>
            <Text style={s.refLabel}>Fecha:</Text>
            <Text style={s.refValue}>{d.fecha}</Text>
          </View>
        </View>
        <View style={{ marginLeft: 18 }}>
          <Text style={s.refNota}>Prioridad: {d.prioridad.toUpperCase()}</Text>
          <Text style={{ fontSize: 9, marginTop: 1 }}>
            Estado: {d.estado}
            {d.referenciaOrden ? ` · ${d.referenciaOrden}` : ""}
          </Text>
        </View>
      </View>

      {/* Recuadros de datos */}
      <View style={s.cajas}>
        <View style={{ width: "54%" }}>
          <View style={s.caja}>
            <Fila l="Área:" v={d.area} />
            <Fila l="Solicitante:" v={d.solicitante || "—"} />
            <Fila l="Proyecto / OT:" v={d.proyecto} />
            {d.cliente ? <Fila l="Cliente:" v={d.cliente} /> : null}
            {d.ocCliente ? <Fila l="OC cliente:" v={d.ocCliente} /> : null}
          </View>
          <View style={[s.caja, { marginTop: 6 }]}>
            <Fila l="Entregar en:" v={`Sede operativa GTO PERU\n${EMPRESA.sedeOperativa}`} />
            <Fila l="Recibe:" v={`${d.solicitante || "—"} (${d.area})`} />
            <Fila l="Observaciones:" v={d.observaciones || "—"} />
          </View>
        </View>
        <View style={{ width: "43%" }}>
          <View style={s.caja}>
            <Fila l="Atiende:" v="Área de Compras / Logística" />
            <Fila l="E:" v={EMPRESA.correos.split("|")[0].trim()} />
            <Fila l="T:" v={EMPRESA.celulares} />
          </View>
          <View style={[s.caja, { marginTop: 6 }]}>
            <Fila l="Empresa:" v="GTO PERU S.A.C." />
            <Fila l="R.U.C.:" v={EMPRESA.ruc} />
            <Fila l="Ítems:" v={String(d.items.length)} />
          </View>
        </View>
      </View>

      <Text style={s.intro}>Favor atender los materiales / servicios mencionados a continuación:</Text>

      {/* Tabla de ítems */}
      <View style={s.tabla}>
        <View style={s.th} fixed>
          {COLS.map((c, i) => (
            <Text
              key={c.k}
              style={[s.thCell, { width: c.w, textAlign: c.center ? "center" : "left" }, i === COLS.length - 1 ? { borderRightWidth: 0 } : {}]}
            >
              {c.label}
            </Text>
          ))}
        </View>
        {d.items.map((it, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={[s.td, { width: COLS[0].w }]}>{String((i + 1) * 10).padStart(5, "0")}</Text>
            <View style={[s.td, { width: COLS[1].w }]}>
              <Text style={{ fontFamily: B }}>{it.descripcion}</Text>
              {it.observacion ? <Text style={{ marginTop: 2 }}>{it.observacion}</Text> : null}
              {it.fotos.length + it.fotosNoMostradas + it.enlaces.length > 0 ? (
                <Text style={{ marginTop: 2, color: GRIS_TEXTO, fontSize: 7 }}>
                  Ref.: {[
                    it.fotos.length + it.fotosNoMostradas ? `${it.fotos.length + it.fotosNoMostradas} foto(s)` : null,
                    it.enlaces.length ? `${it.enlaces.length} enlace(s)` : null
                  ]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  (ver Referencias)
                </Text>
              ) : null}
            </View>
            <Text style={[s.td, { width: COLS[2].w, textAlign: "right" }]}>{String(it.cantidad)}</Text>
            <Text style={[s.td, { width: COLS[3].w }]}>{it.um}</Text>
            <View style={[s.td, { width: COLS[4].w }]} />
            <View style={[s.td, { width: COLS[5].w }]} />
            <View style={[s.td, { width: COLS[6].w }]}>
              <View style={s.box} />
            </View>
            <View style={[s.td, { width: COLS[7].w, borderRightWidth: 0 }]}>
              <View style={s.box} />
            </View>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7, color: GRIS_TEXTO, marginTop: 3 }}>
        Anotar precio y tienda al comprar. Marcar &quot;Comprado&quot; al adquirir cada ítem y &quot;Recibido&quot; cuando el área lo recibe conforme.
      </Text>

      {/* Referencias: fotos y enlaces de cada ítem */}
      {d.items.some((it) => it.fotos.length + it.fotosNoMostradas + it.enlaces.length > 0) ? (
        <View>
          <Text style={s.refTitulo} minPresenceAhead={60}>
            Referencias adjuntas
          </Text>
          {d.items.map((it, i) =>
            it.fotos.length + it.fotosNoMostradas + it.enlaces.length === 0 ? null : (
              <View key={i} style={s.refBloque}>
                <Text style={s.refItem} minPresenceAhead={40}>
                  Ítem {String((i + 1) * 10).padStart(5, "0")} · {it.descripcion}
                </Text>
                {it.fotos.length > 0 ? (
                  <View style={s.refFotos}>
                    {it.fotos.map((f, k) => (
                      <View key={k} style={s.refFoto} wrap={false}>
                        <Image src={{ data: f.data, format: f.format }} style={s.refImg} />
                        <Text style={s.refPie}>{f.nombre}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {it.fotosNoMostradas > 0 ? (
                  <Text style={s.refAviso}>
                    {it.fotosNoMostradas} imagen(es) en un formato que no se puede imprimir; véanse en el sistema.
                  </Text>
                ) : null}
                {it.enlaces.map((e, k) => (
                  <Text key={k} style={s.refEnlace}>
                    Enlace: <Link src={e.url}>{e.url}</Link>
                  </Text>
                ))}
              </View>
            )
          )}
        </View>
      ) : null}

      {/* Firmas */}
      <View style={s.firmas} wrap={false}>
        {[
          ["Solicitado por", d.solicitante || "", d.area],
          ["Comprado / atendido por", "", "Compras / Logística"],
          ["Recibido conforme", "", d.area]
        ].map(([t, n, a]) => (
          <View key={t} style={s.firma}>
            <View style={s.firmaLinea} />
            <Text style={{ fontFamily: B }}>{t}</Text>
            <Text style={{ fontSize: 7, marginTop: 1 }}>{n || "Nombre: ______________________"}</Text>
            <Text style={{ fontSize: 7, color: GRIS_TEXTO, marginTop: 1 }}>{a}</Text>
            <Text style={{ fontSize: 7, color: GRIS_TEXTO, marginTop: 2 }}>Fecha: ____ / ____ / ______</Text>
          </View>
        ))}
      </View>

      {/* Pie de página */}
      <View style={s.pie} fixed>
        <View style={s.pieLinea} />
        <Text style={s.pieEmpresa}>
          {`${EMPRESA.nombreLegal}\nRUC ${EMPRESA.ruc}\n${EMPRESA.direccionCorta}\n${EMPRESA.web}`}
        </Text>
        <Text style={s.pieConf}>
          Documento interno de GTO PERU. Impreso por {d.generadoPor} el {d.generadoEl} desde el Módulo de Logística y Compras; el
          estado vigente es el que figura en el sistema.
        </Text>
        <Text style={s.piePagina} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function generarSolicitudPdf(d: SolicitudPdfData): Promise<Buffer> {
  const fs = await import("node:fs");
  const logoPath = path.join(process.cwd(), "public", "logo-gto.png");
  let logo: string | null = null;
  if (fs.existsSync(logoPath)) logo = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  return await renderToBuffer(
    <Document title={`Solicitud de pedido ${d.numero}`}>
      <Documento d={d} logo={logo} />
    </Document>
  );
}
