export type Moneda = "SOLES" | "DOLARES";

export interface CuentaBancaria {
  banco: string;
  cuenta: string;
  cci?: string | null;
}

export interface Proveedor {
  id: string;
  razon_social: string;
  ruc: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  codigo_proveedor: string | null;
  detraccion: string | null;
  activo: boolean;
  cuentas_bancarias?: CuentaBancaria[];
}

export interface OrdenItem {
  posicion: number;
  cantidad: number;
  um: string | null;
  codigo: string | null;
  descripcion: string;
  entrega: string | null;
  valor_unitario: number;
}

export interface OrdenCompraData {
  numero: number;
  fecha_emision: string;
  moneda: Moneda;
  forma_pago: string | null;
  lugar_entrega: string | null;
  origen: string | null;
  destino: string | null;
  fecha_entrega: string | null;
  centro_costos: string | null;
  doc_relacionado: string | null;
  comprador: string | null;
  garantia: string | null;
  penalidad: string | null;
  condiciones_especiales: string[];
  observaciones: string | null;
  incluir_anticorrupcion: boolean;
  subtotal: number | null;
  descuento: number | null;
  igv: number;
  total: number;
  proveedor: Proveedor;
  items: OrdenItem[];
}