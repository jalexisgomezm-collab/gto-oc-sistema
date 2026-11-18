"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Bandeja de avisos de Logística (solo lectura): requerimientos por atender,
// observados y OT registradas esta semana. No guarda nada en la base de datos;
// la marca de "leído" queda en este navegador.

type Aviso = { key: string; grupo: "atender" | "observadas" | "ot"; titulo: string; texto: string; etiqueta: string; href: string; alerta?: boolean; aviso?: boolean };

const VISTOS = "gto_log_avisos_vistos";
const POR_ATENDER = ["pendiente", "en_consulta", "en_cotizacion", "proveedor_elegido"];
const ETIQUETA: Record<string, string> = { pendiente: "Pendiente", en_consulta: "En consulta", en_cotizacion: "En cotización", proveedor_elegido: "Proveedor elegido", observada: "Observada" };
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });
const hoyLima = () => fmtDia.format(new Date());
function lunesLima() {
  const d = new Date(hoyLima() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const ddmm = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
function leerVistos(): string[] {
  try { const v = JSON.parse(localStorage.getItem(VISTOS) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function marcar(keys: string[]) {
  try { localStorage.setItem(VISTOS, JSON.stringify(Array.from(new Set([...leerVistos(), ...keys])).slice(-500))); } catch { /* sin almacenamiento */ }
}
function proyecto(row: any): string {
  const p = Array.isArray(row?.proyectos) ? row.proyectos[0] : row?.proyectos;
  if (!p) return "";
  return [p.numero_orden_trabajo, p.nombre].filter(Boolean).join(" · ");
}

async function consultar(): Promise<Aviso[]> {
  const sb = createClient();
  const lunes = lunesLima();
  const campos = "id, numero, area, solicitante, fecha_solicitud, estado, prioridad, proyectos(nombre, numero_orden_trabajo)";
  const [pend, obs, ots] = await Promise.all([
    sb.from("solicitudes_pedido").select(campos).in("estado", POR_ATENDER).order("numero", { ascending: false }).limit(40),
    sb.from("solicitudes_pedido").select(campos).eq("estado", "observada").order("numero", { ascending: false }).limit(10),
    sb.from("proyectos").select("id, nombre, cliente, numero_orden_trabajo, created_at").gte("created_at", lunes + "T05:00:00Z").order("created_at", { ascending: false }).limit(10)
  ]);
  if (pend.error && obs.error && ots.error) throw new Error("consulta");
  const avisos: Aviso[] = [];
  const pendientes = ((pend.data || []) as any[]).sort((a, b) => (a.prioridad === "ALTA" ? 0 : 1) - (b.prioridad === "ALTA" ? 0 : 1)).slice(0, 8);
  for (const s of pendientes) {
    const nueva = (s.fecha_solicitud || "") >= lunes;
    avisos.push({
      key: `sol-${s.id}-${s.estado}`, grupo: "atender",
      titulo: `Solicitud N° ${s.numero} · ${s.area || "Área"}`,
      texto: [s.solicitante, proyecto(s)].filter(Boolean).join(" · "),
      etiqueta: [ETIQUETA[s.estado] || s.estado, s.prioridad ? `Prioridad ${String(s.prioridad).toLowerCase()}` : "", nueva ? "Nueva esta semana" : `desde el ${ddmm(s.fecha_solicitud)}`].filter(Boolean).join(" · "),
      href: `/solicitudes/${s.id}`, alerta: s.prioridad === "ALTA", aviso: nueva && s.prioridad !== "ALTA"
    });
  }
  for (const s of (obs.data || []) as any[]) {
    avisos.push({
      key: `obs-${s.id}`, grupo: "observadas",
      titulo: `Solicitud N° ${s.numero} · ${s.area || "Área"}`,
      texto: [s.solicitante, proyecto(s)].filter(Boolean).join(" · "),
      etiqueta: "Observada · espera respuesta del área", href: `/solicitudes/${s.id}`, aviso: true
    });
  }
  for (const o of (ots.data || []) as any[]) {
    if (!o.numero_orden_trabajo) continue;
    avisos.push({
      key: `ot-${o.id}`, grupo: "ot",
      titulo: `${o.numero_orden_trabajo} · ${o.nombre || ""}`.trim(),
      texto: o.cliente || "",
      etiqueta: `Registrada el ${ddmm(String(o.created_at || "").slice(0, 10))} · puede necesitar materiales`,
      href: "/proyectos"
    });
  }
  return avisos;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export default function AvisosLogistica() {
  useEffect(() => {
    let cerrado = false;
    let avisos: Aviso[] = [];
    let error = "";
    let cargando = true;

    const boton = el("button", "gto-bit-campana");
    boton.type = "button";
    boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a2 2 0 0 0 3.4 0"/></svg>';
    const contador = el("span", "gto-bit-n");
    boton.append(contador);
    const fondo = el("div", "gto-bit-fondo");
    const panel = el("section", "gto-bit-bandeja");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Avisos de Logística");
    const cab = el("header");
    const cerrar = el("button", "", "Cerrar");
    cerrar.type = "button";
    cab.append(el("h2", "", "Avisos de Logística"), cerrar);
    const lista = el("div", "gto-bit-lista");
    panel.append(cab, lista);
    fondo.hidden = panel.hidden = true;
    document.body.append(fondo, panel);

    function pintar() {
      const vistos = leerVistos();
      const n = avisos.filter((a) => !vistos.includes(a.key)).length;
      contador.textContent = n ? String(n) : "";
      boton.setAttribute("aria-label", `Avisos de Logística, ${n} sin leer`);
      boton.title = "Avisos de Logística";
      if (panel.hidden) return;
      lista.replaceChildren();
      if (cargando && !avisos.length) lista.append(el("p", "gto-bit-vacio", "Consultando solicitudes…"));
      if (error) lista.append(el("p", "gto-bit-error", error));
      const seccion = (titulo: string, filas: Aviso[], vacio: string) => {
        lista.append(el("h3", "", filas.length ? `${titulo} · ${filas.length}` : titulo));
        if (!filas.length) { lista.append(el("p", "gto-bit-vacio", vacio)); return; }
        for (const a of filas) {
          const fila = el("a", "gto-bit-item" + (vistos.includes(a.key) ? "" : " nuevo") + (a.alerta ? " alerta" : a.aviso ? " aviso" : ""));
          fila.href = a.href;
          fila.onclick = () => marcar([a.key]);
          fila.append(el("small", "", a.etiqueta), el("strong", "", a.titulo));
          if (a.texto) fila.append(el("p", "", a.texto));
          lista.append(fila);
        }
      };
      if (!cargando || avisos.length) {
        seccion("Requerimientos por atender", avisos.filter((a) => a.grupo === "atender"), "No hay solicitudes pendientes de atender.");
        seccion("Observadas", avisos.filter((a) => a.grupo === "observadas"), "Ninguna solicitud observada.");
        seccion("OT registradas esta semana", avisos.filter((a) => a.grupo === "ot"), "Aún no se registran OT esta semana.");
      }
      if (avisos.some((a) => !vistos.includes(a.key))) {
        const todos = el("button", "gto-bit-leer", "Marcar todo como leído");
        todos.type = "button";
        todos.onclick = () => { marcar(avisos.map((a) => a.key)); pintar(); };
        lista.append(todos);
      }
    }
    async function actualizar() {
      if (cerrado) return;
      cargando = true; pintar();
      try { const d = await consultar(); if (cerrado) return; avisos = d; error = ""; }
      catch { if (cerrado) return; error = "No se pudieron consultar las solicitudes. Recarga la página para reintentar."; }
      finally { cargando = false; if (!cerrado) pintar(); }
    }
    const ocultar = () => { fondo.hidden = panel.hidden = true; };
    boton.onclick = () => { fondo.hidden = panel.hidden = false; pintar(); actualizar(); };
    cerrar.onclick = ocultar;
    fondo.onclick = ocultar;
    lista.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("a")) ocultar(); });
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !panel.hidden) ocultar(); };
    document.addEventListener("keydown", tecla);

    // La campana va en la barra verde, en lugar de la campana general.
    function ubicar() {
      const barra = document.querySelector(".gto-log-shell .gto-shared-toolbar .barra");
      if (!barra || boton.parentElement === barra) return;
      const general = barra.querySelector(".gto-shared-bell, .gto-status-bell-only");
      const sitio = general ? general.closest(".gto-shared-bell") || general : null;
      if (sitio) sitio.after(boton); else barra.append(boton);
    }
    const obs = new MutationObserver(ubicar);
    obs.observe(document.body, { childList: true, subtree: true });
    ubicar();
    actualizar();
    const timer = setInterval(actualizar, 10 * 60 * 1000);
    return () => {
      cerrado = true; clearInterval(timer); obs.disconnect();
      document.removeEventListener("keydown", tecla);
      boton.remove(); fondo.remove(); panel.remove();
    };
  }, []);
  return null;
}
