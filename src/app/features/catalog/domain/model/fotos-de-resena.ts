import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';

/** Cuántas fotos admite una reseña. Lo mismo exige el backend, que además lo vuelve a comprobar. */
export const FOTOS_MAXIMAS_POR_RESENA = 4;

/** Lo que pesa, como mucho, cada foto una vez reducida. */
export const PESO_MAXIMO_DE_FOTO = 5 * 1024 * 1024;

/** Lado mayor tras reducir en el navegador. */
export const LADO_MAXIMO_DE_FOTO = 1600;

/** Calidad del JPEG que se sube. */
export const CALIDAD_DE_FOTO = 0.85;

export const TIPOS_DE_FOTO_ADMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Códigos propios de la comprobación local; los del backend llegan en el AppError del envío. */
export const FOTO_TIPO_NO_ADMITIDO = 'FOTO_TIPO_NO_ADMITIDO';
export const FOTO_DEMASIADO_GRANDE = 'FOTO_DEMASIADO_GRANDE';

export function esFotoAdmitida(fichero: { type: string }): boolean {
  return TIPOS_DE_FOTO_ADMITIDOS.includes(fichero.type);
}

/** Valida una foto YA reducida: el tipo se mira antes de reducir, el peso después. */
export function validaPesoDeFoto(fichero: File): Result<File, AppError> {
  return fichero.size > PESO_MAXIMO_DE_FOTO
    ? fallo(creaError('peticion-invalida', '', { codigo: FOTO_DEMASIADO_GRANDE }))
    : exito(fichero);
}

/** Cuánto mide la foto una vez escalada para que su lado mayor no pase del tope. */
export function medidasReducidas(ancho: number, alto: number): { ancho: number; alto: number } {
  const escala = Math.min(1, LADO_MAXIMO_DE_FOTO / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}
