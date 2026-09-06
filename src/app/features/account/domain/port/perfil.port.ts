import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CambioDeContrasena, DatosDePerfil } from '../model/perfil';
import { FicheroDescargable } from './descarga.port';

/**
 * Editar los datos personales de la cuenta.
 *
 * <p>¿Por qué un puerto propio si «auth» ya tiene uno para el usuario actual? Porque el suyo solo sabe
 * de cuatro campos —nombre visible, empresa, país e idioma— y aquí se editan nombre, apellidos y
 * teléfono. Ensanchar el puerto ajeno obligaría a «auth» a cargar con campos que no usa; declarar el
 * propio con lo que de verdad hace falta cuesta un fichero y no ata los dos contextos.
 */
export interface PerfilPort {
  actualiza(datos: DatosDePerfil): Promise<Result<void, AppError>>;
  cambiaContrasena(cambio: CambioDeContrasena): Promise<Result<void, AppError>>;
}

export const PERFIL_PORT = new InjectionToken<PerfilPort>('PerfilPort');

/**
 * Dar de baja la cuenta.
 *
 * <p>«Baja» y no «borrado»: el backend ANONIMIZA los datos y apunta la fecha. Los pedidos, las facturas
 * y los apuntes contables tienen que sobrevivir por obligación legal, así que lo que desaparece es la
 * persona, no el rastro. Se confirma con un código enviado al correo para que un descuido —o alguien
 * con la sesión abierta un minuto— no pueda cerrar una cuenta ajena.
 */
export interface BajaDeCuentaPort {
  solicita(): Promise<Result<void, AppError>>;
  confirma(codigo: string): Promise<Result<void, AppError>>;
}

export const BAJA_DE_CUENTA_PORT = new InjectionToken<BajaDeCuentaPort>('BajaDeCuentaPort');

/**
 * Llevarse una copia de los datos personales (artículo 20 del RGPD, portabilidad).
 *
 * <p>La política de privacidad promete literalmente que se puede descargar desde el perfil. El endpoint
 * existía desde el principio y no había pantalla que lo llamara: la promesa estaba escrita y no se podía
 * cumplir.
 */
export interface PortabilidadPort {
  exporta(): Promise<Result<FicheroDescargable, AppError>>;
}

export const PORTABILIDAD_PORT = new InjectionToken<PortabilidadPort>('PortabilidadPort');

/**
 * Terminar la sesión de este equipo.
 *
 * <p>Es un puerto de UNA línea y propio del contexto a propósito: al confirmar la baja hay que echar
 * fuera a quien acaba de cerrar su cuenta, y el caso de uso que lo hace vive en «auth», que es
 * territorio ajeno. Lo que «account» necesita no es la maquinaria de sesión entera, es esta frase.
 */
export interface FinDeSesionPort {
  termina(): Promise<void>;
}

export const FIN_DE_SESION_PORT = new InjectionToken<FinDeSesionPort>('FinDeSesionPort');
