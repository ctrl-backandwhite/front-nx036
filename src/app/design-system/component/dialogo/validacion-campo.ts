import { CampoDialogo } from './dialogo.store';

/**
 * Comprueba un campo y devuelve la CLAVE del error, o nulo si vale.
 *
 * <p>Se valida con el diálogo abierto y todos los datos a la vista, no al enviar: así el fallo se ve
 * junto al campo que lo causa y no se pierde lo tecleado en los demás.
 */
export function errorDeCampo(campo: CampoDialogo, bruto: string): string | null {
  const valor = bruto.trim();
  if (campo.obligatorio && !valor) {
    return 'dialog.field.required';
  }
  if (!valor) {
    return null;
  }
  if (campo.tipo === 'number') {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      return 'dialog.field.number';
    }
    if (campo.min !== undefined && numero < campo.min) {
      return 'dialog.field.min';
    }
  }
  return null;
}
