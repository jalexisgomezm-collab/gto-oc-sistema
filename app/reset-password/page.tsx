"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setListo(true);
        setVerificando(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setListo(true);
      setVerificando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setAviso("Contraseña actualizada. Redirigiendo...");
      setTimeout(() => {
        router.push("/ordenes");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar la contraseña");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-lg font-semibold text-verde mb-1">GTO PERU</h1>
        <p className="text-sm text-gray-500 mb-6">Restablecer contraseña</p>

        {verificando ? (
          <p className="text-sm text-gray-500">Verificando enlace...</p>
        ) : !listo ? (
          <div>
            <p className="text-sm text-red-600 mb-4">
              Este enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </p>
            <a href="/login" className="text-sm text-verde hover:underline">
              Volver a iniciar sesión
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {aviso && <p className="text-sm text-verde">{aviso}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-verde text-white text-sm font-medium py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
            >
              {cargando ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}