import { Service, computed, inject, signal } from '@angular/core';
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
@Service()
export class TokenStore {
  private readonly almacen = inject(ALMACEN_LOCAL);

  private readonly _acceso = signal<string | null>(this.almacen.lee(CLAVE_ACCESO));
  private readonly _refresco = signal<string | null>(this.almacen.lee(CLAVE_REFRESCO));

  readonly acceso = this._acceso.asReadonly();
  readonly refresco = this._refresco.asReadonly();

  /** Hay sesión mientras haya token de acceso. Que siga siendo válido lo dice el backend. */
  readonly haySesion = computed(() => this._acceso() !== null);

  /**
   * Guarda el par de credenciales. Los DOS, siempre: sin refresco, el que hubiera se BORRA.
   *
   * <p>Antes el refresco solo se escribía `if (refresco)`, así que quien pasara nulo —lo hace el
   * retorno del acceso social cuando el fragmento no trae un refresco con forma de credencial— dejaba
   * un acceso NUEVO emparejado con un refresco VIEJO. Esa pareja funciona exactamente lo que dura el
   * acceso, una hora, y muere en la primera renovación: el backend rechaza el refresco caducado o
   * revocado con un 401, el front lo lee como «la sesión se acabó» y echa a quien estaba navegando.
   *
   * <p>Se vio en el registro de la pasarela el 17-sep-2026: acceso correcto a las 22:10, y a las
   * 23:12:03 —sesenta y dos minutos después— `POST /api/auth/refresh` con 401. A partir de ahí, sin
   * testigos. El rechazo no deja rastro en el servidor (el motivo se escribe a nivel DEBUG y la
   * respuesta es el mismo `SE002` genérico que una contraseña equivocada), así que el fallo solo se
   * puede reconstruir desde fuera.
   *
   * <p>Media sesión no es una sesión: o se guardan las dos credenciales, o no se guarda ninguna.
   */
  guarda(acceso: string, refresco?: string | null): void {
    this.almacen.guarda(CLAVE_ACCESO, acceso);
    this._acceso.set(acceso);
    if (refresco) {
      this.almacen.guarda(CLAVE_REFRESCO, refresco);
      this._refresco.set(refresco);
    } else {
      this.almacen.borra(CLAVE_REFRESCO);
      this._refresco.set(null);
    }
  }

  limpia(): void {
    this.almacen.borra(CLAVE_ACCESO);
    this.almacen.borra(CLAVE_REFRESCO);
    this._acceso.set(null);
    this._refresco.set(null);
  }
}
