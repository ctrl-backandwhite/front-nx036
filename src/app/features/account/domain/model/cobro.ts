/** Cómo paga la cuenta: una tarjeta guardada o una cuenta de PayPal. */
export type TipoDeMetodo = 'TARJETA' | 'PAYPAL';

/**
 * Un método de pago guardado.
 *
 * <p>Aquí NUNCA hay datos de tarjeta. El navegador se los manda directamente a la pasarela y de vuelta
 * solo llega una referencia y los cuatro últimos dígitos; el número completo no pasa por nuestro código
 * ni por nuestro servidor, que es justo lo que evita tener que cumplir PCI-DSS de nivel comerciante.
 */
export interface MetodoDePago {
  /** Referencia unificada: `pm_…` para tarjeta, `paypal:<uuid>` para PayPal. */
  readonly referencia: string;
  readonly tipo: TipoDeMetodo;
  /** Solo PayPal, y enmascarado por el servidor (`j***@dominio`). */
  readonly correoPaypal?: string;
  readonly marca?: string;
  readonly ultimosCuatro?: string;
  readonly mesDeCaducidad?: number;
  readonly anioDeCaducidad?: number;
  readonly porDefecto: boolean;
}

/** Si el cobro con tarjeta está disponible y con qué clave pública se habla con la pasarela. */
export interface ConfiguracionDeCobro {
  readonly clavePublicable: string;
  readonly activo: boolean;
  /** La prueba gratis es de un solo uso por cuenta: gastada, el plan gratis ya no se puede elegir. */
  readonly pruebaGratisGastada: boolean;
}

/** Sin clave pública no hay pasarela que montar, y la sección entera deja de pintarse. */
export function cobroConTarjetaDisponible(config: ConfiguracionDeCobro | null): boolean {
  return !!config && config.activo && config.clavePublicable.trim() !== '';
}

/** «07/2028». Devuelve cadena vacía si el método no es una tarjeta. */
export function caducidadDeTarjeta(metodo: MetodoDePago): string {
  if (!metodo.mesDeCaducidad || !metodo.anioDeCaducidad) {
    return '';
  }
  return `${String(metodo.mesDeCaducidad).padStart(2, '0')}/${metodo.anioDeCaducidad}`;
}

/**
 * El titular es OBLIGATORIO: sin él no se crea el método de pago.
 *
 * <p>Viaja a la pasarela junto con la tarjeta y es lo que miran sus controles antifraude; una tarjeta
 * guardada sin titular acaba rechazada en el primer cobro, cuando ya no hay nadie delante.
 */
export function titularDeTarjetaValido(titular: string): boolean {
  return titular.trim() !== '';
}

/** Dar de baja un método de pago se confirma con un código de seis dígitos enviado al correo. */
export function codigoDeBajaDeMetodoCompleto(codigo: string): boolean {
  return /^\d{6}$/.test(codigo.trim());
}

/** Solo dígitos: el campo del código descarta cualquier otra cosa mientras se teclea. */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}
