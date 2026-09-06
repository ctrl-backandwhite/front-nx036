import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Cómo se llama y qué correo tiene quien está escribiendo, SI ha entrado.
 *
 * <p>Es un puerto propio de «support» para un dato que también sabe el contexto de acceso, y por el
 * mismo motivo que «auth» declara el suyo para los almacenes: lo que el formulario de contacto necesita
 * son dos cadenas para rellenar dos campos, no el usuario entero con sus permisos, su país de registro y
 * su historial. Depender del puerto grande de otro contexto ataría esta pantalla a cada cambio de aquel
 * y obligaría a cualquier doble de prueba a fingir una cuenta completa para comprobar un campo relleno.
 *
 * <p>Devuelve `null` cuando no hay sesión: el formulario es PÚBLICO y tiene que funcionar igual.
 */
export interface QuienEscribe {
  readonly nombre: string;
  readonly email: string;
}

export interface QuienEscribePort {
  consulta(): Promise<Result<QuienEscribe | null, AppError>>;
}

export const QUIEN_ESCRIBE_PORT = new InjectionToken<QuienEscribePort>('QuienEscribePort');
