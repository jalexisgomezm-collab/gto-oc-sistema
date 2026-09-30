"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AREAS } from "@/lib/solicitudes";
import { ROL_LABEL } from "@/lib/perfil";
import { fechaLima } from "@/lib/fechas";

interface Usuario {
  id: string;
  email: string;
  nombre_completo: string | null;
  rol: string | null;
  area: string | null;
  creado: string;
  ultimo_ingreso: string | null;
}

function fecha(v: string | null) {
  if (!v) return "Nunca";
  return fechaLima(v);
}

export default function UsuariosLista({ usuarios, miId }: { usuarios: Usuario[]; miId: string }) {
  const router = useRouter();
  const [cambios, setCambios] = useState<Record<string, { rol: string; area: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; ok: boolean } | null>(null);

  function valor(u: Usuario) {
    const rolBase = u.rol === "admin" || u.rol === "usuario" ? "compras" : u.rol || "solicitante";
    return cambios[u.id] || { rol: rolBase, area: u.area || "" };
  }

  function cambiar(u: Usuario, campo: "rol" | "area", v: string) {
    setCambios((prev) => ({ ...prev, [u.id]: { ...valor(u), [campo]: v } }));
  }

  async function guardar(u: Usuario) {
    const v = valor(u);
    if (v.rol === "solicitante" && !v.area) {
      setMensaje({ id: u.id, texto: "Elige el área del solicitante", ok: false });
      return;
    }
    setGuardando(u.id);
    setMensaje(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("asignar_rol_usuario", { p_id: u.id, p_rol: v.rol, p_area: v.area || null });
    setGuardando(null);
    if (error) {
      setMensaje({ id: u.id, texto: error.message, ok: false });
      return;
    }
    setMensaje({ id: u.id, texto: "Guardado", ok: true });
    setCambios((prev) => {
      const c = { ...prev };
      delete c[u.id];
      return c;
    });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2">Usuario</th>
            <th className="text-left px-4 py-2">Rol</th>
            <th className="text-left px-4 py-2">Área</th>
            <th className="text-left px-4 py-2">Último ingreso</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {usuarios.map((u) => {
            const v = valor(u);
            const soyYo = u.id === miId;
            const modificado = !!cambios[u.id];
            return (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  <p className="font-medium">{u.nombre_completo || "—"}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-2">
                  {soyYo ? (
                    <span className="text-xs text-gray-500">{ROL_LABEL[u.rol || ""] || u.rol} (tú)</span>
                  ) : (
                    <select
                      value={v.rol}
                      onChange={(e) => cambiar(u, "rol", e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="solicitante">Solicitante de área</option>
                      <option value="compras">Compras (acceso total)</option>
                      <option value="administracion">Administración (todo menos Maestro)</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-2">
                  {soyYo ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <select
                      value={v.area}
                      onChange={(e) => cambiar(u, "area", e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="">{v.rol === "compras" ? "(no aplica)" : "Sin asignar"}</option>
                      {AREAS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">{fecha(u.ultimo_ingreso)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {!soyYo && (
                    <button
                      type="button"
                      onClick={() => guardar(u)}
                      disabled={!modificado || guardando === u.id}
                      className="text-sm bg-verde text-white px-3 py-1 rounded-md hover:bg-verde-oscuro disabled:opacity-40"
                    >
                      {guardando === u.id ? "Guardando..." : "Guardar"}
                    </button>
                  )}
                  {mensaje?.id === u.id && (
                    <p className={`text-xs mt-1 ${mensaje.ok ? "text-verde" : "text-red-600"}`}>{mensaje.texto}</p>
                  )}
                </td>
              </tr>
            );
          })}
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No hay usuarios registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
