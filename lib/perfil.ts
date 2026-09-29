export interface Perfil {
  id: string;
  nombre_completo: string | null;
  rol: string;
  area: string | null;
  es_compras: boolean;
}

/** Perfil del usuario con sesión (rol y área). Si no tiene perfil se trata como solicitante. */
export async function obtenerPerfil(supabase: any): Promise<Perfil | null> {
  const { data, error } = await supabase.rpc("mi_perfil");
  if (error) return null;
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) return null;
  return { ...fila, es_compras: !!fila.es_compras };
}

export const ROL_LABEL: Record<string, string> = {
  admin: "Compras / Administrador",
  usuario: "Compras / Administrador",
  compras: "Compras",
  solicitante: "Solicitante de área"
};
