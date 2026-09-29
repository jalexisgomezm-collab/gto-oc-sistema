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

  const [motivo, setMotivo] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setListo(true);
        setVerificando(false);
      }
    });

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const code = params.get("code");
      const errorUrl = params.get("error_description") || new URLSearchParams(window.location.hash.slice(1)).get("error_description");

      // 0) Enlace con tokens en el hash (#access_token=...): funciona desde cualquier navegador o celular
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, "", "/reset-password");
        if (!error) {
          setListo(true);
          setVerificando(false);
          return;
        }
        setMotivo("El enlace ya fue usado o venció. Pide uno nuevo.");
      }

      // 1) Enlace con token_hash (funciona desde cualquier navegador o celular)
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (!error) {
          window.history.replaceState(null, "", "/reset-password");
          setListo(true);
          setVerificando(false);
          return;
        }
        setMotivo("El enlace ya fue usado o venció. Pide uno nuevo.");
      }

      // 2) Enlace con code (solo funciona en el mismo navegador donde se pidió)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setListo(true);
      } else if (code && !tokenHash) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setListo(true);
        else setMotivo("Abre el enlace en el mismo navegador donde pediste la recuperación, o pide uno nuevo desde ese navegador.");
      } else if (errorUrl) {
        setMotivo(errorUrl);
      }
      setVerificando(false);
    })();

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
            {motivo && <p className="text-xs text-gray-500 mb-4">{motivo}</p>}
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