import { InjectionToken, Injectable, inject } from '@angular/core';
import { Stripe, StripeCardElement } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  CampoDeTarjeta,
  HuecoDeTarjeta,
  PasarelaDeTarjetaPort,
} from '../domain/port/cobros.port';

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
 * Cómo se trae la biblioteca de la pasarela.
 *
 * <p>Va por token y no llamando a `loadStripe` a pelo para que una prueba pueda darle un doble: el
 * original baja un script del dominio de Stripe, y una prueba unitaria que dependa de la red no es una
 * prueba. Es también el punto donde se vería, de un vistazo, si algún día se sirviera desde otro sitio.
 */
export type CargadorDeStripe = (clavePublicable: string) => Promise<Stripe | null>;

export const CARGADOR_DE_STRIPE = new InjectionToken<CargadorDeStripe>('CargadorDeStripe', {
  providedIn: 'root',
  factory: (): CargadorDeStripe => (clave) => loadStripe(clave),
});

/** El aspecto del campo, copiado del original para que el porte no cambie ni un pixel. */
const ASPECTO_DEL_CAMPO = { hidePostalCode: true, style: { base: { fontSize: '14px' } } } as const;

/**
 * Un campo de tarjeta vivo.
 *
 * <p>Guarda juntos la pasarela y el campo montado porque confirmar el alta necesita los dos, y tenerlos
 * sueltos era justo lo que obligaba al original a envolver el formulario en un componente de React para
 * que no se pudieran usar por separado. Aquí la restricción la sostiene el tipo: sin este objeto no hay
 * forma de confirmar nada.
 */
class CampoDeTarjetaStripe implements CampoDeTarjeta {
  constructor(
    private readonly pasarela: Stripe,
    private readonly campo: StripeCardElement,
  ) {}

  async confirmaAlta(secretoDeCliente: string, titular: string): Promise<Result<void, AppError>> {
    try {
      // El titular viaja a la pasarela en los datos de facturación: aparece en la tarjeta guardada y lo
      // miran sus controles antifraude. Nuestro backend solo guarda el identificador del método.
      const resultado = await this.pasarela.confirmCardSetup(secretoDeCliente, {
        payment_method: { card: this.campo, billing_details: { name: titular.trim() } },
      });
      if (resultado.error) {
        // El mensaje de la pasarela ya viene traducido y es el que hay que enseñar: dice si la tarjeta
        // fue rechazada, si caducó o si falta un dato. Sustituirlo por uno genérico deja a quien paga
        // sin saber qué corregir.
        return fallo(creaError('peticion-invalida', resultado.error.message ?? ''));
      }
      return exito(undefined);
    } catch {
      return fallo(creaError('sin-conexion', ''));
    }
  }

  limpia(): void {
    this.campo.clear();
  }

  destruye(): void {
    this.campo.destroy();
  }
}

/**
 * La pasarela de tarjetas sobre Stripe, montada A MANO.
 *
 * <p>La envoltura de Stripe para React no existe en Angular y la de la comunidad todavía no declara
 * Angular 22, así que se usa la biblioteca agnóstica (`@stripe/stripe-js`) y se controla el ciclo de
 * vida del campo desde aquí. Es el ÚNICO fichero del contexto donde aparece el nombre de Stripe: ni el
 * dominio, ni los casos de uso, ni las pantallas saben quién hay detrás.
 */
@Injectable()
export class StripeTarjetaAdapter implements PasarelaDeTarjetaPort {
  private readonly carga = inject(CARGADOR_DE_STRIPE);

  /**
   * La pasarela se trae UNA vez por clave.
   *
   * <p>El perfil monta el campo dos veces —la sección de métodos de pago y la ventana emergente de
   * contratación—, y bajarse el script en cada montaje añadía medio segundo de espera delante de un
   * formulario de pago.
   */
  private cargada: { clave: string; pasarela: Promise<Stripe | null> } | null = null;

  async monta(
    hueco: HuecoDeTarjeta,
    clavePublicable: string,
  ): Promise<Result<CampoDeTarjeta, AppError>> {
    if (!clavePublicable.trim()) {
      return fallo(creaError('peticion-invalida', ''));
    }
    try {
      const pasarela = await this.pasarelaPara(clavePublicable);
      if (!pasarela) {
        return fallo(creaError('sin-conexion', ''));
      }
      const campo = pasarela.elements().create('card', ASPECTO_DEL_CAMPO);
      campo.mount(hueco);
      return exito(new CampoDeTarjetaStripe(pasarela, campo));
    } catch {
      // Un bloqueador de scripts o una red caída dejan la sección sin campo. Se avisa y no se rompe la
      // pantalla: el resto del perfil sigue siendo utilizable.
      return fallo(creaError('sin-conexion', ''));
    }
  }

  private pasarelaPara(clave: string): Promise<Stripe | null> {
    if (this.cargada?.clave !== clave) {
      this.cargada = { clave, pasarela: this.carga(clave) };
    }
    return this.cargada.pasarela;
  }
}
