import React from "react";
import { Document, Page, View, Text, Image, Link, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { EMPRESA, VERDE_HEX, GRIS_TEXTO_HEX, VERDE_CLARO_HEX } from "@/lib/empresa";

const VERDE = `#${VERDE_HEX}`;
const GRIS_TEXTO = `#${GRIS_TEXTO_HEX}`;
const VERDE_CLARO = `#${VERDE_CLARO_HEX}`;
const VERDE_OSCURO = "#016B39";
const BORDE = "#8FBFA3";
const BLANCO = "#FFFFFF";
// Formato sobre la hoja membretada de GTO PERU (logo arriba y contactos al pie vienen del membrete)
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
    /** situación del ítem (ej. "Parcial: 6 de 10 · OC N° 276 (6)"); null si aún no se atiende */
    atencion?: string | null;
  }[];
}

const s = StyleSheet.create({
  page: { paddingTop: 80, paddingBottom: 100, paddingHorizontal: 30, fontSize: 8, fontFamily: "Helvetica", color: "#000000" },
  // cabecera
  fondo: { position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 },
  top: { position: "absolute", top: 28, right: 30, alignItems: "flex-end" },
  titulo: { fontSize: 16, fontFamily: B, color: VERDE, textAlign: "right" },
  subtitulo: { fontSize: 9.5, fontFamily: B, marginTop: 2, textAlign: "right", color: "#333333" },
  numero: { fontSize: 11, fontFamily: B, marginTop: 3, color: BLANCO, backgroundColor: VERDE, paddingVertical: 2, paddingHorizontal: 8 },
  refRow: { flexDirection: "row", borderBottomWidth: 1.5, borderColor: VERDE, paddingBottom: 5 },
  refLabel: { fontFamily: B, fontSize: 9, width: 86, color: VERDE_OSCURO },
  refValue: { fontSize: 9, width: 110 },
  refNota: { fontFamily: B, fontSize: 9, color: VERDE_OSCURO },
  // recuadros
  cajas: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  caja: { borderWidth: 1, borderColor: BORDE, padding: 5, backgroundColor: BLANCO },
  fila: { flexDirection: "row", marginBottom: 2.5 },
  lab: { fontFamily: B, width: 72, color: VERDE_OSCURO },
  val: { flex: 1 },
  intro: { marginTop: 12, marginBottom: 6, marginLeft: 4, fontSize: 8.5 },
  // tabla
  tabla: { borderWidth: 1, borderColor: BORDE, borderBottomWidth: 0 },
  th: { flexDirection: "row", backgroundColor: VERDE, borderBottomWidth: 1, borderColor: VERDE },
  thCell: { fontFamily: B, fontSize: 7.2, padding: 2.5, borderRightWidth: 1, borderColor: BLANCO, color: BLANCO },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDE, backgroundColor: BLANCO },
  td: { padding: 2.5, borderRightWidth: 1, borderColor: BORDE, fontSize: 7.8 },
  box: { width: 10, height: 10, borderWidth: 1, borderColor: BORDE, alignSelf: "center", marginTop: 2 },
  // referencias
  refTitulo: { fontFamily: B, fontSize: 9, marginTop: 14, paddingVertical: 3, paddingHorizontal: 5, backgroundColor: VERDE_CLARO, color: VERDE_OSCURO, borderBottomWidth: 1, borderColor: VERDE },
  refBloque: { marginTop: 6 },
  refItem: { fontFamily: B, fontSize: 8, color: VERDE_OSCURO },
  refFotos: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  refFoto: { width: 170, marginRight: 8, marginBottom: 6, borderWidth: 0.5, borderColor: BORDE, padding: 3, backgroundColor: BLANCO },
  refImg: { width: 162, height: 122, objectFit: "contain" },
  refPie: { fontSize: 6.5, color: GRIS_TEXTO, marginTop: 2 },
  refAviso: { fontSize: 7, color: GRIS_TEXTO, marginTop: 2 },
  refEnlace: { fontSize: 7.5, marginTop: 2, color: "#1F4E79" },
  // firmas
  firmas: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  firma: { width: "30%", alignItems: "center" },
  firmaLinea: { borderTopWidth: 0.8, borderColor: VERDE, width: "100%", marginBottom: 3 },
  // pie
  pie: { position: "absolute", left: 30, right: 30, bottom: 68, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  pieConf: { width: "90%", fontSize: 6.5, fontStyle: "italic", color: VERDE_OSCURO },
  piePagina: { fontSize: 8, color: GRIS_TEXTO, textAlign: "right" }
});

const COLS = [
  { k: "item", label: "Ítem\nNo.", w: 34 },
  { k: "desc", label: "Descripción", w: 158 },
  { k: "cant", label: "Cantidad", w: 42, right: true },
  { k: "um", label: "Unidad\nMedida", w: 38 },
  { k: "obs", label: "Observación", w: 140 },
  { k: "enl", label: "Enlaces de referencia", w: 123 }
];

/** Texto corto y partido en líneas para mostrar un enlace dentro de una columna angosta (el clic abre la URL completa). */
function etiquetaEnlace(url: string) {
  let t = url.replace(/^https?:\/\/(www\.)?/i, "");
  if (t.length > 60) t = t.slice(0, 59) + "…";
  return t.match(/.{1,30}/g)?.join("\n") || t;
}

function Fila({ l, v }: { l: string; v: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.lab}>{l}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

function Documento({ d, fondo }: { d: SolicitudPdfData; fondo: string | null }) {
  const num = String(d.numero).padStart(6, "0");
  return (
    <Page size="A4" style={s.page}>
      {/* Cabecera */}
      {fondo ? <Image src={fondo} style={s.fondo} fixed /> : null}
      <View style={s.top} fixed>
        <Text style={s.titulo}>SOLICITUD DE PEDIDO</Text>
        <Text style={s.subtitulo}>GTO PERU · Módulo de Logística y Compras</Text>
        <Text style={s.numero}>N° {num}</Text>
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
              style={[s.thCell, { width: c.w, textAlign: "left" }, i === COLS.length - 1 ? { borderRightWidth: 0 } : {}]}
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
              {it.atencion ? <Text style={{ marginTop: 2, color: "#016B39", fontSize: 7 }}>{it.atencion}</Text> : null}
              {it.fotos.length + it.fotosNoMostradas > 0 ? (
                <Text style={{ marginTop: 2, color: GRIS_TEXTO, fontSize: 7 }}>
                  {it.fotos.length + it.fotosNoMostradas} foto(s) de referencia (ver al final)
                </Text>
              ) : null}
            </View>
            <Text style={[s.td, { width: COLS[2].w, textAlign: "right" }]}>{String(it.cantidad)}</Text>
            <Text style={[s.td, { width: COLS[3].w }]}>{it.um}</Text>
            <Text style={[s.td, { width: COLS[4].w, fontSize: 7.5 }]}>{it.observacion || "—"}</Text>
            <View style={[s.td, { width: COLS[5].w, borderRightWidth: 0 }]}>
              {it.enlaces.length === 0 ? (
                <Text style={{ fontSize: 7.5 }}>—</Text>
              ) : (
                it.enlaces.map((e, k) => (
                  <Link key={k} src={e.url} style={{ fontSize: 6.5, color: "#1F4E79", marginBottom: 2 }}>
                    {`${it.enlaces.length > 1 ? `${k + 1}. ` : ""}${etiquetaEnlace(e.url)}`}
                  </Link>
                ))
              )}
            </View>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7, color: GRIS_TEXTO, marginTop: 3 }}>
        Los enlaces de referencia se abren con un clic desde el PDF.
      </Text>

      {/* Referencias: fotos y enlaces de cada ítem */}
      {d.items.some((it) => it.fotos.length + it.fotosNoMostradas > 0) ? (
        <View>
          <Text style={s.refTitulo} minPresenceAhead={60}>
            Fotos de referencia
          </Text>
          {d.items.map((it, i) =>
            it.fotos.length + it.fotosNoMostradas === 0 ? null : (
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
        <Text style={s.pieConf}>
          Documento interno de GTO PERU. Impreso por {d.generadoPor} el {d.generadoEl} desde el Módulo de Logística y Compras; el
          estado vigente es el que figura en el sistema.
        </Text>
        <Text style={s.piePagina} render={({ pageNumber, totalPages }) => `${pageNumber} | ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function generarSolicitudPdf(d: SolicitudPdfData): Promise<Buffer> {
  const fs = await import("node:fs");
  // Hoja membretada GTO PERU como fondo de cada página
  const fondoPath = path.join(process.cwd(), "public", "membrete-gto.jpg");
  let fondo: string | null = null;
  if (fs.existsSync(fondoPath)) fondo = `data:image/jpeg;base64,${fs.readFileSync(fondoPath).toString("base64")}`;
  return await renderToBuffer(
    <Document title={`Solicitud de pedido ${d.numero}`}>
      <Documento d={d} fondo={fondo} />
    </Document>
  );
}
