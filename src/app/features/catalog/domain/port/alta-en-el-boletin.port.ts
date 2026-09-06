import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Apuntarse al boletín DESDE LA PORTADA.
 *
 * <p>«notifications» tiene su propio puerto del boletín, más grande —también da de baja— y registrado
 * en su ruta. Desde la portada no se puede usar por dos motivos a la vez: sus proveedores no existen en
 * el inyector del catálogo, y el aislamiento entre contextos impide importar sus adaptadores para
 * registrarlos aquí. Así que «catalog» declara la ÚNICA capacidad que necesita —dar de alta un
 * correo—, que además es lo que pide la segregación de interfaces: un puerto pequeño y por capacidad,
 * no uno grande del que se usa un método.
 */
export interface AltaEnElBoletin {
  /** Si ya estaba apuntado. El backend NO falla en ese caso: lo dice, y el texto cambia. */
  readonly yaEstaba: boolean;
}

export interface AltaEnElBoletinPort {
  suscribe(correo: string): Promise<Result<AltaEnElBoletin, AppError>>;
}

export const ALTA_EN_EL_BOLETIN_PORT = new InjectionToken<AltaEnElBoletinPort>(
  'AltaEnElBoletinPort',
);
