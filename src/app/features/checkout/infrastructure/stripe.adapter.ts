import { InjectionToken, Injectable, inject } from '@angular/core';
import { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { DOCUMENT } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { esNavegador } from '@core/platform/plataforma';
import { PasarelaDePagoPort } from '../domain/port/pasarela-de-pago.port';

/*
 * Se importa `loadStripe` de `@stripe/stripe-js/pure` y NO del módulo principal.
 *
 * El módulo principal mete la etiqueta <script> de Stripe en la página en cuanto se CARGA, sin que
 * nadie llame a `loadStripe`. Basta con que este fichero acabe en un fragmento que el navegador se
 * descargue por cualquier motivo para que Stripe entre en escena. Medido: `/about` y `/pricing`
 * pedían cinco recursos a `js.stripe.com` y `m.stripe.network` —más de 1 MB, un tercio del peso de la
 * página— en dos pantallas donde no hay nada que pagar. El front anterior no pide NADA a Stripe en
 * ninguna de las dos.
 *
 * No es solo peso: `m.stripe.network` es la detección avanzada de fraude, que perfila a quien mira.
 * Cargarla en una página pública la convierte en un tercero que observa a gente que no ha empezado
 * ninguna compra, y eso hay que decidirlo, no heredarlo de un import.
 *
 * Con `/pure` el script se pide la primera vez que se llama a `loadStripe`, que es cuando de verdad
 * hace falta. Lo dice su propia documentación: «Stripe.js will not be loaded until loadStripe is
 * called».
 */

/**
 * Stripe, y el ÚNICO fichero del proyecto que lo nombra.
 *
 * <p>Aquí acaba el aislamiento que da `PasarelaDePagoPort`: ni la pantalla del pago, ni sus casos de uso,
 * ni el dominio importan nada de Stripe. En el front anterior la pantalla del pago cargaba la biblioteca
 * ella misma, y por eso el porte a otra tecnología obligaba a reescribir novecientas líneas: la
 * integración de la pasarela estaba fundida con la interfaz.
 *
 * <p>Se usa la biblioteca AGNÓSTICA (`@stripe/stripe-js`) y no un envoltorio de framework. No es una
 * limitación: el envoltorio de React no tiene equivalente en Angular 22 y el de terceros aún no lo
 * declara, así que el camino que no depende de ninguno de los dos es además el estable.
 *
 * <p>Se descarga BAJO DEMANDA, la primera vez que hace falta autenticar un cobro. El guion de Stripe pesa
 * y vigila la página entera; cargarlo al arrancar lo pagaría todo el mundo, incluido quien solo mira el
 * catálogo. Y no se carga al PRERENDERIZAR: allí no hay navegador y la descarga fallaría al construir.
 */
/**
 * CÓMO se descarga Stripe.
 *
 * <p>El comportamiento en producción no cambia: la fábrica devuelve el `loadStripe` de `/pure`, con su
 * carga perezosa intacta. Lo que aporta el testigo es una costura.
 *
 * <p>Hacía falta una. La prueba del adaptador sustituía el MÓDULO, y esa sustitución solo se aplica
 * cuando el empaquetador deja el import como externo — algo que depende de cómo se esté compilando en
 * esa pasada. Cuando no se aplicaba, la prueba llamaba a la biblioteca de verdad, que se pone a esperar
 * un guion que el DOM simulado nunca descarga: la batería se colgaba hasta agotar el plazo, sin decir
 * en ningún momento que Stripe tenía algo que ver. Con el testigo, quien prueba pone su doble y no hay
 * nada que adivinar.
 */
export const CARGADOR_DE_STRIPE = new InjectionToken<(clave: string) => Promise<Stripe | null>>(
  'CargadorDeStripe',
  { providedIn: 'root', factory: () => loadStripe },
);

@Injectable()
export class StripeAdapter implements PasarelaDePagoPort {
  private readonly documento = inject(DOCUMENT);
  private readonly cargaStripe = inject(CARGADOR_DE_STRIPE);
  private readonly enNavegador = esNavegador();

  /** La carga en curso o ya resuelta. Se guarda la PROMESA, no el resultado: así dos llamadas casi
   * simultáneas comparten una sola descarga en vez de pedir el guion dos veces. */
  private carga: Promise<Stripe | null> | null = null;
  private clave = '';

  async prepara(clavePublica: string): Promise<Result<void, AppError>> {
    if (!clavePublica) {
      return fallo(creaError('peticion-invalida', ''));
    }
    if (!this.enNavegador) {
      // Al prerenderizar no hay quien pague: se responde bien y no se descarga nada.
      return exito(undefined);
    }
    // Cambiar de clave —de pruebas a producción, por ejemplo— obliga a volver a cargar: la instancia
    // guarda la clave con la que nació.
    if (!this.carga || this.clave !== clavePublica) {
      this.clave = clavePublica;
      this.carga = this.cargaStripe(clavePublica).catch(() => null);
    }
    return (await this.carga) ? exito(undefined) : fallo(creaError('sin-conexion', ''));
  }

  /**
   * Enseña el reto del banco y espera.
   *
   * <p>El mensaje que devuelve Stripe cuando la autenticación se rechaza SÍ se conserva: es el único punto
   * de la aplicación donde el texto no lo escribe nuestro backend, porque quien conoce el motivo —tarjeta
   * caducada, banco que no responde, código mal tecleado— es el proveedor. Sin él, quien no puede pagar no
   * sabe qué arreglar.
   */
  async autentica(secretoDeCliente: string): Promise<Result<void, AppError>> {
    const stripe = this.carga ? await this.carga : null;
    if (!stripe) {
      return fallo(creaError('sin-conexion', ''));
    }
    try {
      const respuesta = await stripe.confirmCardPayment(secretoDeCliente);
      return respuesta.error
        ? fallo(creaError('conflicto', respuesta.error.message ?? '', { codigo: respuesta.error.code }))
        : exito(undefined);
    } catch {
      // La biblioteca lanza si el secreto no tiene forma válida. Cruzar la frontera lanzando dejaría al
      // caso de uso con una excepción que su firma no anuncia.
      return fallo(creaError('peticion-invalida', ''));
    }
  }

  /**
   * Sale del sitio hacia la página de aprobación.
   *
   * <p>Se asigna la dirección en vez de sustituir la entrada del historial: quien vuelve atrás desde la
   * pasarela sin haber pagado tiene que aterrizar en el pago, con su cesta intacta.
   */
  abre(url: string): void {
    if (this.enNavegador) {
      this.documento.defaultView?.location.assign(url);
    }
  }
}
