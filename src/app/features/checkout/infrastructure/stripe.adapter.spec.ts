import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { StripeAdapter } from './stripe.adapter';

/** La pasarela real no se carga en una prueba: se sustituye la biblioteca entera. */
const cargar = vi.fn();
const confirmar = vi.fn();

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (clave: string) => cargar(clave),
}));

function monta(asignar = vi.fn()) {
  // Lo único que hay que falsear es la salida del sitio (`defaultView.location.assign`). Sustituir el
  // DOCUMENT entero por un objeto inventado deja sin documento a las piezas de la hidratación que
  // aporta `test-providers.ts` —`TransferState` consulta `getElementById`, el modo de render mira
  // `body`— y el inyector revienta antes de llegar al adaptador, con un error que no nombra a Stripe.
  // Con un envoltorio, todo lo demás sigue siendo el documento de verdad. El receptor de `Reflect.get`
  // es el documento real porque los métodos nativos exigen su propio `this`.
  const documento = new Proxy(document, {
    get: (real, propiedad) =>
      propiedad === 'defaultView'
        ? { location: { assign: asignar } }
        : Reflect.get(real, propiedad, real),
  }) as Document;
  TestBed.configureTestingModule({
    providers: [StripeAdapter, { provide: DOCUMENT, useValue: documento }],
  });
  return { adaptador: TestBed.inject(StripeAdapter), asignar };
}

describe('StripeAdapter', () => {
  beforeEach(() => {
    cargar.mockReset();
    confirmar.mockReset();
    cargar.mockResolvedValue({ confirmCardPayment: confirmar });
    confirmar.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });
  });

  it('se prepara con la clave que le dan', async () => {
    const { adaptador } = monta();

    expect((await adaptador.prepara('pk_test_1')).ok).toBe(true);
    expect(cargar).toHaveBeenCalledWith('pk_test_1');
  });

  /** El guion pesa y vigila la página entera: pedirlo dos veces sería descargarlo dos veces. */
  it('con la misma clave no vuelve a descargar la biblioteca', async () => {
    const { adaptador } = monta();

    await adaptador.prepara('pk_test_1');
    await adaptador.prepara('pk_test_1');

    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('al cambiar de clave sí vuelve a cargar: la instancia guarda la clave con la que nació', async () => {
    const { adaptador } = monta();

    await adaptador.prepara('pk_test_1');
    await adaptador.prepara('pk_live_9');

    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('sin clave no se descarga nada y se dice que la petición no vale', async () => {
    const { adaptador } = monta();

    const resultado = await adaptador.prepara('');

    expect(resultado.ok).toBe(false);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('si la biblioteca no se puede descargar, se dice que no hay conexión', async () => {
    const { adaptador } = monta();
    cargar.mockResolvedValue(null);

    expect((await adaptador.prepara('pk_test_1')).ok).toBe(false);
  });

  it('una descarga que lanza tampoco rompe: se traduce a un fallo', async () => {
    const { adaptador } = monta();
    cargar.mockRejectedValue(new Error('bloqueado por el navegador'));

    expect((await adaptador.prepara('pk_test_1')).ok).toBe(false);
  });

  it('autentica el cobro con el secreto del servidor', async () => {
    const { adaptador } = monta();
    await adaptador.prepara('pk_test_1');

    expect((await adaptador.autentica('pi_1_secret')).ok).toBe(true);
    expect(confirmar).toHaveBeenCalledWith('pi_1_secret');
  });

  /**
   * El motivo lo conoce el proveedor —tarjeta caducada, banco que no responde—, así que su mensaje SÍ se
   * conserva: es el único punto de la aplicación donde el texto no lo escribe nuestro backend.
   */
  it('un rechazo del banco conserva el motivo que da el proveedor', async () => {
    const { adaptador } = monta();
    await adaptador.prepara('pk_test_1');
    confirmar.mockResolvedValue({ error: { message: 'Tu tarjeta ha caducado.', code: 'expired_card' } });

    const resultado = await adaptador.autentica('pi_1_secret');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('Tu tarjeta ha caducado.');
      expect(resultado.error.codigo).toBe('expired_card');
    }
  });

  it('sin haber preparado la pasarela no se puede autenticar', async () => {
    const { adaptador } = monta();

    expect((await adaptador.autentica('pi_1_secret')).ok).toBe(false);
  });

  /** Cruzar la frontera lanzando dejaría al caso de uso con una excepción que su firma no anuncia. */
  it('si la biblioteca lanza, vuelve como fallo y no como excepción', async () => {
    const { adaptador } = monta();
    await adaptador.prepara('pk_test_1');
    confirmar.mockRejectedValue(new Error('secreto con forma inválida'));

    const resultado = await adaptador.autentica('mal');

    expect(resultado.ok).toBe(false);
  });

  /** Quien vuelve atrás desde la pasarela sin pagar tiene que aterrizar en el pago, con su cesta. */
  it('sale del sitio sin sustituir la entrada del historial', () => {
    const asignar = vi.fn();
    const { adaptador } = monta(asignar);

    adaptador.abre('https://checkout.stripe.com/c/pay/abc');

    expect(asignar).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/abc');
  });
});
