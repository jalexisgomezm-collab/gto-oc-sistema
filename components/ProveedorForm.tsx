"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CuentaBancaria } from "@/lib/types";

interface Props {
  proveedorId?: string;
  inicial?: {
    razon_social: string;
    ruc: string;
    contacto: string;
    telefono: string;
    email: string;
    direccion: string;
    codigo_proveedor: string;
    detraccion: string;
    activo: boolean;
    cuentas_bancarias: CuentaBancaria[];
  };
}

const vacio = {
  razon_social: "",
  ruc: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  codigo_proveedor: "",
  detraccion: "",
  activo: true,
  cuentas_bancarias: [] as CuentaBancaria[]
};

export default function ProveedorForm({ proveedorId, inicial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(inicial || vacio);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [avisoRuc, setAvisoRuc] = useState<string | null>(null);

  async function buscarPorRuc() {
    const numero = form.ruc.trim();
    if (!/^\d{11}$/.test(numero)) {
      setAvisoRuc("El RUC debe tener 11 dígitos");
      return;
    }
    setBuscandoRuc(true);
    setAvisoRuc(null);
    try {
      const res = await fetch(`/api/ruc?numero=${numero}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar el RUC");
      setForm((f) => ({
        ...f,
        razon_social: data.razon_social || f.razon_social,
        direccion: data.direccion || f.direccion
      }));
      if (data.estado && data.estado !== "ACTIVO") {
        setAvisoRuc(`Atención: SUNAT indica estado "${data.estado}"${data.condicion ? ` / condición "${data.condicion}"` : ""}`);
      } else {
        setAvisoRuc("Datos completados desde SUNAT ✓");
      }
    } catch (err: any) {
      setAvisoRuc(err.message || "No se pudo consultar el RUC");
    } finally {
      setBuscandoRuc(false);
    }
  }

  function actualizar<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function actualizarCuenta(idx: number, campo: keyof CuentaBancaria, valor: string) {
    setForm((f) => {
      const cuentas = [...f.cuentas_bancarias];
      cuentas[idx] = { ...cuentas[idx], [campo]: valor };
      return { ...f, cuentas_bancarias: cuentas };
    });
  }

  function agregarCuenta() {
    setForm((f) => ({ ...f, cuentas_bancarias: [...f.cuentas_bancarias, { banco: "", cuenta: "", cci: "" }] }));
  }

  function quitarCuenta(idx: number) {
    setForm((f) => ({ ...f, cuentas_bancarias: f.cuentas_bancarias.filter((_, i) => i !== idx) }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const payload = {
        razon_social: form.razon_social,
        ruc: form.ruc,
        contacto: form.contacto || null,
        telefono: form.telefono || null,
        email: form.email || null,
        direccion: form.direccion || null,
        codigo_proveedor: form.codigo_proveedor || null,
        detraccion: form.detraccion || null,
        activo: form.activo
      };

      let id = proveedorId;
      if (id) {
        const { error } = await supabase.from("proveedores").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("cuentas_bancarias").delete().eq("proveedor_id", id);
      } else {
        const { data, error } = await supabase.from("proveedores").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      const cuentasValidas = form.cuentas_bancarias.filter((c) => c.banco || c.cuenta);
      if (cuentasValidas.length > 0) {
        const { error } = await supabase
          .from("cuentas_bancarias")
          .insert(cuentasValidas.map((c) => ({ proveedor_id: id, banco: c.banco, cuenta: c.cuenta, cci: c.cci || null })));
        if (error) throw error;
      }

      router.push("/proveedores");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el proveedor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Razón social" required value={form.razon_social} onChange={(v) => actualizar("razon_social", v)} span2 />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">RUC</label>
            <a
              href="https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-verde hover:underline"
            >
              Ver en SUNAT ↗
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              maxLength={11}
              value={form.ruc}
              onChange={(e) => actualizar("ruc", e.target.value.replace(/\D/g, ""))}
              onBlur={() => form.ruc.trim().length === 11 && buscarPorRuc()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
            />
            <button
              type="button"
              onClick={buscarPorRuc}
              disabled={buscandoRuc}
              className="shrink-0 border border-verde text-verde text-sm px-3 rounded-md hover:bg-verde-claro disabled:opacity-60"
            >
              {buscandoRuc ? "..." : "Buscar"}
            </button>
          </div>
          {avisoRuc && <p className="text-xs text-gray-500 mt-1">{avisoRuc}</p>}
        </div>
        <Campo label="Código de proveedor" value={form.codigo_proveedor} onChange={(v) => actualizar("codigo_proveedor", v)} />
        <Campo label="Contacto" value={form.contacto} onChange={(v) => actualizar("contacto", v)} />
        <Campo label="Teléfono" value={form.telefono} onChange={(v) => actualizar("telefono", v)} />
        <Campo label="Correo" value={form.email} onChange={(v) => actualizar("email", v)} />
        <Campo label="Dirección" value={form.direccion} onChange={(v) => actualizar("direccion", v)} span2 />
        <Campo label="Código de detracción" value={form.detraccion} onChange={(v) => actualizar("detraccion", v)} />
        <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
          <input type="checkbox" checked={form.activo} onChange={(e) => actualizar("activo", e.target.checked)} />
          Proveedor activo
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Cuentas bancarias</h3>
          <button type="button" onClick={agregarCuenta} className="text-xs text-verde hover:underline">
            + Agregar cuenta
          </button>
        </div>
        <div className="space-y-2">
          {form.cuentas_bancarias.map((c, i) => (
            <div key={i} className="grid grid-cols-8 gap-2 items-center">
              <input
                placeholder="Banco"
                value={c.banco}
                onChange={(e) => actualizarCuenta(i, "banco", e.target.value)}
                className="col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
              <input
                placeholder="N.º de cuenta"
                value={c.cuenta}
                onChange={(e) => actualizarCuenta(i, "cuenta", e.target.value)}
                className="col-span-3 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
              <input
                placeholder="CCI"
                value={c.cci || ""}
                onChange={(e) => actualizarCuenta(i, "cci", e.target.value)}
                className="col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
              <button type="button" onClick={() => quitarCuenta(i)} className="text-red-500 text-xs hover:underline">
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={cargando} className="bg-verde text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
          {cargando ? "Guardando..." : "Guardar proveedor"}
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  value,
  onChange,
  required,
  span2
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
      />
    </div>
  );
}
