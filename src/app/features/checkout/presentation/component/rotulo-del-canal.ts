import { OpcionDeEnvio } from '../../domain/model/cotizacion-de-envio';

/** Las claves de traducción de cada clase de línea que se le puede nombrar a quien compra. */
const CLAVE_DE_LINEA: Readonly<Record<string, string>> = {
  ropa: 'checkout.shipping_line.ropa',
  general: 'checkout.shipping_line.general',
  'con-bateria': 'checkout.shipping_line.con_bateria',
};

/**
 * Cómo se nombra un canal a quien compra: «Línea de ropa · YunExpress».
 *
 * <p>El CÓDIGO interno del canal no se enseña nunca. La clase `desconocida` no debería llegar; si llega,
 * se nombra solo al transportista en vez de inventar una clase. Sin transportista tampoco se inventa:
 * se devuelve lo que haya, o nada, y quien pinta decide el respaldo.
 */
export function rotuloDelCanal(
  opcion: Pick<OpcionDeEnvio, 'tipoDeLinea' | 'transportista'> | undefined,
  t: (clave: string) => string,
): string | undefined {
  if (!opcion) {
    return undefined;
  }
  const clave = opcion.tipoDeLinea ? CLAVE_DE_LINEA[opcion.tipoDeLinea] : undefined;
  const partes = [clave ? t(clave) : undefined, opcion.transportista].filter(
    (parte): parte is string => !!parte,
  );
  return partes.length > 0 ? partes.join(' · ') : undefined;
}
