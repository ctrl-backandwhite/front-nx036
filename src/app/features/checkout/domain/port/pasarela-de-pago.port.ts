import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * La pasarela de pago, vista por el dominio.
 *
 * <p>NINGUNA pantalla sabe que detrás hay Stripe. Eso es lo que compra este puerto: el día que entre otra
 * pasarela —o que la actual cambie de biblioteca— se escribe otro adaptador y no se toca ni una plantilla.
 * En el front anterior la pantalla del pago importaba la biblioteca del proveedor directamente, y por eso
 * cambiarla obligaba a reescribir la pantalla entera.
 *
 * <p>Tres capacidades, que son las tres cosas que el cobro necesita del navegador:
 *
 * <ol>
 *   <li><b>Prepararse</b> con la clave pública que da el backend. La clave NO se escribe en el código: es
 *       distinta por entorno y llega en la configuración de facturación.</li>
 *   <li><b>Completar la autenticación reforzada</b> que el banco exige sobre una tarjeta ya guardada. El
 *       servidor inicia el cobro y devuelve un secreto; el navegador es quien tiene que enseñar el reto,
 *       porque es donde está la persona.</li>
 *   <li><b>Salir a la página de la pasarela</b> cuando el cobro se aprueba fuera del sitio.</li>
 * </ol>
 *
 * <p>NO hay formulario de tarjeta en este puerto, y es deliberado: los datos de la tarjeta no pasan por
 * nuestro front en ningún flujo. Con tarjeta nueva se sale a la página alojada del proveedor y con tarjeta
 * guardada el cobro es del lado del servidor. Mantenerlo así deja el ámbito de cumplimiento de tarjetas
 * fuera de este código. El día que haga falta pintar el formulario aquí, se añade una capacidad más a
 * este puerto —un `montaFormularioDeTarjeta` que devuelva cómo confirmarlo y cómo retirarlo— y la pantalla
 * sigue sin enterarse de quién lo pinta.
 */
export interface PasarelaDePagoPort {
  /** Deja la pasarela lista. Idempotente: llamarlo dos veces no vuelve a descargar nada. */
  prepara(clavePublica: string): Promise<Result<void, AppError>>;

  /**
   * Enseña el reto de autenticación reforzada y espera a que se resuelva. Un fallo aquí es que la persona
   * no ha podido autenticarse: NO es un error técnico y se le cuenta como tal.
   */
  autentica(secretoDeCliente: string): Promise<Result<void, AppError>>;

  /** Sale del sitio hacia la página de aprobación de la pasarela. */
  abre(url: string): void;
}

export const PASARELA_DE_PAGO_PORT = new InjectionToken<PasarelaDePagoPort>('PasarelaDePagoPort');
