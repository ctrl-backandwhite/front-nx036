import { Injectable, computed, inject, signal } from '@angular/core';
import { ALMACEN_LOCAL } from '../storage/almacen.port';

const CLAVE_ACCESO = 'nx-access-token';
const CLAVE_REFRESCO = 'nx-refresh-token';

/**
 * El par de credenciales (acceso + refresco) que identifica la sesión.
 *
 * <p>Autenticación por token y no por cookie de sesión porque la interfaz y el backend pueden vivir en
 * dominios distintos: sin cookies no hay falsificación de peticiones entre sitios ni el enredo de las
 * cookies de terceros. El token de acceso dura poco y se renueva con el de refresco.
 *
 * <p>Va en el almacenamiento del navegador a través del puerto, no tocando `localStorage`: al
 * prerenderizar no existe, y en modo privado hasta leer lanza.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly almacen = inject(ALMACEN_LOCAL);

  private readonly _acceso = signal<string | null>(this.almacen.lee(CLAVE_ACCESO));
  private readonly _refresco = signal<string | null>(this.almacen.lee(CLAVE_REFRESCO));

  readonly acceso = this._acceso.asReadonly();
  readonly refresco = this._refresco.asReadonly();

  /** Hay sesión mientras haya token de acceso. Que siga siendo válido lo dice el backend. */
  readonly haySesion = computed(() => this._acceso() !== null);

  guarda(acceso: string, refresco?: string | null): void {
    this.almacen.guarda(CLAVE_ACCESO, acceso);
    this._acceso.set(acceso);
    if (refresco) {
      this.almacen.guarda(CLAVE_REFRESCO, refresco);
      this._refresco.set(refresco);
    }
  }

  limpia(): void {
    this.almacen.borra(CLAVE_ACCESO);
    this.almacen.borra(CLAVE_REFRESCO);
    this._acceso.set(null);
    this._refresco.set(null);
  }
}
