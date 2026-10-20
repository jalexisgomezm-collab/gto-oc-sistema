export const EMPRESA = {
  nombreLegal: "GTO PERU SOCIEDAD ANÓNIMA CERRADA",
  nombreComercial: "GTO Electrónica y Eléctrico de Potencia",
  ruc: "20519998786",
  domicilioFiscal:
    "CAL. GERMAN SCHEREIBER NRO. 276 INT. T301 URB. SANTA ANA (ENTRE CUADRA 1 Y 2 DE CANAVAL Y MOREYRA), SAN ISIDRO - LIMA - LIMA",
  sedeOperativa:
    "AV. VARIANTE UCHUMAYO KM. 5.5 LT. 657 INT. A1, SEC. ALTO CURAL, SACHACA - AREQUIPA",
  correos: "servicios@gtoperu.com | administracion@gtoperu.com",
  celulares: "921 502 895 / 932 439 863",
  web: "www.gtoperu.com",
  direccionCorta: "Variante de Uchumayo km 5.5, Sachaca - Arequipa - Perú",
  whatsapp: "(+51) 932 439 863"
};

export const VERDE_HEX = "02934E";
export const GRIS_ZEBRA_HEX = "F2F2F2";
export const VERDE_CLARO_HEX = "EAF7EF";
export const GRIS_TEXTO_HEX = "555555";
export const FUENTE = "Calibri";

/**
 * Orden nacional o internacional según el documento del proveedor:
 * RUC peruano (11 dígitos) o DNI (8 dígitos) → nacional; cualquier otro (Tax ID, VAT, etc.) → internacional.
 * En una orden internacional (importación) el proveedor no factura IGV.
 */
export function tipoOrden(docProveedor: string | null | undefined): "NACIONAL" | "INTERNACIONAL" {
  const d = String(docProveedor || "").replace(/[\s.-]/g, "");
  if (!d) return "NACIONAL";
  return /^\d{8}$/.test(d) || /^\d{11}$/.test(d) ? "NACIONAL" : "INTERNACIONAL";
}
export const ETIQUETA_TIPO_ORDEN = { NACIONAL: "Nacional", INTERNACIONAL: "Internacional (importación)" } as const;
