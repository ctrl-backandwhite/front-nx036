import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AltaDeDobleFactor, SesionActiva } from '../../domain/model/seguridad';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from '../../domain/port/seguridad.port';

/** El alta del segundo factor, con el código ya dibujado si se pudo. */
export interface AltaDibujada extends AltaDeDobleFactor {
  /** Imagen embebida lista para pintar. Nula si no se pudo dibujar: entonces se teclea el secreto. */
  readonly qr: string | null;
}

/** Consulta si la cuenta tiene el segundo factor puesto. */
@Injectable()
export class ConsultaDobleFactor {
  private readonly dobleFactor = inject(DOBLE_FACTOR_PORT);

  async ejecuta(): Promise<boolean> {
    const resultado = await this.dobleFactor.estaActivo();
    // Si no se puede consultar se asume que NO lo tiene: pintar el interruptor encendido sin saberlo
    // haría creer que la cuenta está protegida cuando quizá no lo está.
    return resultado.ok ? resultado.valor : false;
  }
}

/**
 * Empieza el alta del segundo factor: pide la semilla y la dibuja.
 *
 * <p>El dibujo va aquí y no en la pantalla porque el dato que se dibuja es el SECRETO: dejar esa
 * decisión suelta es lo que llevó, en su día, a resolverla pidiéndosela a un servicio externo de códigos
 * QR y con ella el segundo factor de todas las cuentas.
 */
@Injectable()
export class ActivaDobleFactor {
  private readonly dobleFactor = inject(DOBLE_FACTOR_PORT);
  private readonly qr = inject(CODIGO_QR_PORT);

  async ejecuta(): Promise<Result<AltaDibujada, AppError>> {
    const alta = await this.dobleFactor.inicia();
    if (!alta.ok) {
      return alta;
    }
    const qr = await this.qr.dibuja(alta.valor.urlOtpauth);
    return exito({ ...alta.valor, qr });
  }
}

/**
 * Verifica el código y termina el alta.
 *
 * <p>Devuelve los códigos de respaldo, que solo se enseñan UNA vez: son la única forma de recuperar la
 * cuenta si se pierde el móvil, y el servidor no los vuelve a mostrar.
 */
@Injectable()
export class ConfirmaDobleFactor {
  private readonly dobleFactor = inject(DOBLE_FACTOR_PORT);

  async ejecuta(codigo: string): Promise<Result<readonly string[], AppError>> {
    return this.dobleFactor.verifica(codigo.trim());
  }
}

/** Quita el segundo factor. Exige la contraseña de la cuenta. */
@Injectable()
export class DesactivaDobleFactor {
  private readonly dobleFactor = inject(DOBLE_FACTOR_PORT);

  async ejecuta(contrasena: string): Promise<Result<void, AppError>> {
    return this.dobleFactor.desactiva(contrasena);
  }
}

/** Los dispositivos con la sesión abierta. */
@Injectable()
export class CargaSesionesActivas {
  private readonly sesiones = inject(SESIONES_ACTIVAS_PORT);

  async ejecuta(): Promise<readonly SesionActiva[]> {
    const resultado = await this.sesiones.lista();
    // Una lista vacía se lee igual que «no hay otros dispositivos»: es información de apoyo y no puede
    // romper la pantalla de seguridad si el servidor no la sirve.
    return resultado.ok ? resultado.valor : [];
  }
}

/** Echa a un dispositivo y devuelve la lista ya sin él. */
@Injectable()
export class RevocaSesion {
  private readonly sesiones = inject(SESIONES_ACTIVAS_PORT);
  private readonly carga = inject(CargaSesionesActivas);

  async ejecuta(id: string): Promise<Result<readonly SesionActiva[], AppError>> {
    const resultado = await this.sesiones.revoca(id);
    return resultado.ok ? exito(await this.carga.ejecuta()) : resultado;
  }
}
