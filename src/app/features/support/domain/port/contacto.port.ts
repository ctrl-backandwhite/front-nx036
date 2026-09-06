import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * El formulario público de contacto.
 *
 * <p>No exige sesión y no revela nada: al enviarlo, el backend crea un aviso en la bandeja del personal
 * de la casa. Lleva CAPTCHA, que resuelve el interceptor del núcleo — un formulario abierto sin reto se
 * llena de correo basura en un día.
 */
export interface MensajeDeContacto {
  readonly nombre: string;
  readonly email: string;
  readonly asunto: string;
  readonly mensaje: string;
}

export interface ContactoPort {
  envia(mensaje: MensajeDeContacto): Promise<Result<void, AppError>>;
}

export const CONTACTO_PORT = new InjectionToken<ContactoPort>('ContactoPort');
