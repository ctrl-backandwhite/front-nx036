import { Injectable, computed, signal } from '@angular/core';
import { Usuario } from '@features/auth/domain/model/usuario';
import { DatosDePerfil, siembraNombre } from '../../domain/model/perfil';

/**
 * Del usuario al formulario.
 *
 * <p>Sin titular se devuelven los campos vacíos —y no un nulo— para que la pantalla no tenga que
 * distinguir «todavía no se sabe» de «no hay nada escrito»: pinta lo mismo en los dos casos.
 */
function aDatosDePerfil(titular: Usuario | null): DatosDePerfil {
  const usuario: Partial<Usuario> = titular ?? {};
  return {
    nombre: siembraNombre(
      usuario.nombre,
      usuario.primerApellido,
      usuario.segundoApellido,
      usuario.nombreVisible,
    ),
    primerApellido: usuario.primerApellido ?? '',
    segundoApellido: usuario.segundoApellido ?? '',
    empresa: usuario.empresa ?? '',
    pais: usuario.pais ?? '',
    idioma: usuario.idioma ?? 'es',
    telefono: usuario.telefono ?? '',
  };
}

/**
 * Quién es el titular de la cuenta que se está mirando.
 *
 * <p>Solo GUARDA: no llama a nadie. Quien pregunta al backend es el caso de uso.
 *
 * <p>El modelo es el `Usuario` del DOMINIO de «auth»: los modelos y los puertos de otro contexto son su
 * contrato público, y copiarlo aquí obligaría a mantener dos versiones del mismo dato. Lo que no se toca
 * es su maquinaria —su almacén de sesión, sus casos de uso—: eso es privado de aquel contexto.
 */
@Injectable()
export class CuentaStore {
  private readonly _titular = signal<Usuario | null>(null);
  private readonly _resuelta = signal(false);

  readonly titular = this._titular.asReadonly();

  /** Si ya se sabe quién mira. Distinto de «hay titular»: al arrancar todavía no se sabe. */
  readonly resuelta = this._resuelta.asReadonly();

  readonly hayTitular = computed(() => this._titular() !== null);

  /**
   * Solo quien administra puede cambiar el país de la cuenta.
   *
   * <p>Ese país es el de REGISTRO y es el que fija el margen: si el cliente pudiera cambiarlo, cambiaría
   * su propio precio. Tampoco se toca desde las direcciones de envío, por el mismo motivo.
   */
  readonly puedeCambiarElPais = computed(() => this._titular()?.rol === 'ADMIN');

  /** Los datos del formulario, sembrados desde el usuario. Vacíos mientras no se sepa quién es. */
  readonly datosDelFormulario = computed<DatosDePerfil>(() => aDatosDePerfil(this._titular()));

  fija(titular: Usuario | null): void {
    this._titular.set(titular);
    this._resuelta.set(true);
  }
}
