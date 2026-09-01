Proceso de pensamiento
Proceso de pensamiento
Bien, siguiente tanda:

Archivo 4 — ruta: app/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/ordenes");
        router.refresh();
      } else if (modo === "registro") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre_completo: nombre } }
        });
        if (error) throw error;
        setAviso("Cuenta creada. Si tu correo requiere confirmación, revisa tu bandeja de entrada antes de iniciar sesión.");
        setModo("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        setAviso("Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-lg font-semibold text-verde mb-1">GTO PERU</h1>
        <p className="text-sm text-gray-500 mb-6">Órdenes de Compra para Proveedores</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === "registro" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
            />
          </div>
          {modo !== "recuperar" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">Contraseña</label>
                {modo === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModo("recuperar");
                      setError(null);
                      setAviso(null);
                    }}
                    className="text-xs text-gray-400 hover:text-verde hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {aviso && <p className="text-sm text-verde">{aviso}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-verde text-white text-sm font-medium py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
          >
            {cargando
              ? "Procesando..."
              : modo === "login"
              ? "Ingresar"
              : modo === "registro"
              ? "Crear cuenta"
              : "Enviar enlace de recuperación"}
          </button>
        </form>

        {modo === "recuperar" ? (
          <button
            onClick={() => {
              setModo("login");
              setError(null);
              setAviso(null);
            }}
            className="mt-4 text-xs text-gray-500 hover:text-verde underline"
          >
            Volver a iniciar sesión
          </button>
        ) : (
          <button
            onClick={() => {
              setModo(modo === "login" ? "registro" : "login");
              setError(null);
              setAviso(null);
            }}
            className="mt-4 text-xs text-gray-500 hover:text-verde underline"
          >
            {modo === "login" ? "¿Nuevo en el equipo? Crear una cuenta" : "Ya tengo una cuenta"}
          </button>
        )}
      </div>
    </div>
  );
}