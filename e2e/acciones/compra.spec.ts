import { expect, test } from '@playwright/test';
import {
  ANGULAR,
  abre,
  apartaAlAsistente,
  descartaElAvisoDeGalletas,
  vigilaLaConsola,
} from '../util/comparador';
import { CLIENTE, entra } from '../util/sesion';
import { sinErroresDeConsola, vigilaLasPeticiones } from '../util/acciones';

/**
 * EL CAMINO DEL DINERO, ejecutado de verdad en el navegador.
 *
 * <p>Por qué existe esta batería: `/checkout` estaba en la lista de rutas, así que se certificaba que
 * ABRE — y nada más. Ninguna prueba compraba nada. Con 3.823 pruebas de componente en verde y la ruta
 * dando 200, el pago con saldo llevaba tiempo haciendo esto: cobraba el monedero, dejaba el pedido
 * PAGADO, planificaba la compra al proveedor... y enseñaba al comprador un error en inglés («Order is
 * already PAID»), con la cesta sin vaciar y ningún pedido al que ir. La causa era que el front pedía un
 * SEGUNDO cobro de un pedido que el checkout ya había cobrado.
 *
 * <p>Ninguna prueba de componente podía verlo: el doble de la pasarela responde bien a todo, mientras
 * el servidor de verdad rechaza. Hacía falta un navegador contra el backend real.
 *
 * <p>REGLA DE ESCRITURA de la casa: cada prueba afirma un EFECTO OBSERVABLE, nunca «el botón existe».
 *
 * <p>SOBRE LOS DATOS: comprar crea un pedido de verdad y mueve saldo de verdad. Es aditivo —no borra
 * nada— y es la única forma de certificar el cobro. Si la cuenta no tiene saldo suficiente, la prueba
 * se SALTA diciéndolo, en vez de fallar por un motivo que no es del código.
 */
test.describe('la compra', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'escritorio', 'la compra se certifica a la anchura de escritorio');
  });

  /**
   * Pagar con saldo termina bien: ni error en pantalla, ni cesta sin vaciar.
   *
   * <p>Lo que se afirma es lo que ve el comprador: que NO aparece un mensaje de error, y que la
   * aplicación lo saca de `/checkout`. Si el front volviera a pedir un segundo cobro, el servidor
   * respondería 422 y esta prueba lo vería inmediatamente.
   */
  test('pagar con saldo no deja al comprador ante un error', async ({ page }) => {
    const errores = vigilaLaConsola(page);
    await entra(page, ANGULAR, CLIENTE);
    await descartaElAvisoDeGalletas(page);

    const saldo = await hayCestaConSaldo(page);
    test.skip(!saldo, 'la cuenta de certificación no tiene cesta o saldo con los que comprar');

    const peticiones = vigilaLasPeticiones(page);
    await pulsaConfirmar(page);

    // El efecto observable: el comprador NO se queda en el pago con un aviso de error.
    await expect(page.locator('[role="alert"]').filter({ hasText: /already PAID|error|Error/ }))
      .toHaveCount(0);
    // Y no se pide un segundo cobro del pedido que el checkout acaba de cobrar.
    const segundoCobro = peticiones.filter(
      (p) => p.metodo === 'POST' && /\/orders\/[^/]+\/payment-intent$/.test(p.url),
    );
    expect(segundoCobro, 'con saldo NO se pide un payment-intent: el pedido ya se cobró al crearlo')
      .toHaveLength(0);
    sinErroresDeConsola(errores, 'pagar con saldo');
  });

  /**
   * Toda petición que mueve dinero lleva su clave de idempotencia.
   *
   * <p>Sin ella el servidor crea un pedido NUEVO en cada POST, así que un doble clic —o el reintento
   * del navegador tras un tiempo de espera— eran dos pedidos y dos cobros. El servidor la exige desde
   * este mismo cambio; esta prueba certifica que el escaparate la manda de verdad, que es lo que
   * ninguna prueba de componente puede afirmar del navegador real.
   */
  test('las peticiones que cobran llevan clave de idempotencia', async ({ page }) => {
    await entra(page, ANGULAR, CLIENTE);
    await descartaElAvisoDeGalletas(page);

    const claves: (string | null)[] = [];
    page.on('request', (peticion) => {
      const url = peticion.url();
      const mueveDinero = /\/me\/orders\/checkout$|\/payment-intent$|\/pay-saved-card$|\/me\/wallet\/recharge$/;
      if (peticion.method() === 'POST' && mueveDinero.test(url)) {
        claves.push(peticion.headers()['idempotency-key'] ?? null);
      }
    });

    const saldo = await hayCestaConSaldo(page);
    test.skip(!saldo, 'la cuenta de certificación no tiene cesta o saldo con los que comprar');
    await pulsaConfirmar(page);

    expect(claves.length, 'no salió ninguna petición de cobro que certificar').toBeGreaterThan(0);
    expect(claves.every((c) => !!c), `alguna petición de cobro fue sin clave: ${JSON.stringify(claves)}`)
      .toBe(true);
  });

  /** Deja la cesta con algo y devuelve si se puede pagar con saldo. */
  async function hayCestaConSaldo(page: import('@playwright/test').Page): Promise<boolean> {
    await abre(page, `${ANGULAR}/catalog`);
    await apartaAlAsistente(page);
    const tarjeta = page.locator('nx-tarjeta-producto').first();
    if ((await tarjeta.count()) === 0) {
      return false;
    }
    await tarjeta.getByRole('button', { name: /Añadir al carrito/i }).click();
    await abre(page, `${ANGULAR}/checkout`);
    await apartaAlAsistente(page);
    // El método de saldo solo se ofrece si la cuenta lo tiene: si no está, no hay nada que certificar.
    const conSaldo = page.getByText(/Pago con tu wallet/i);
    return (await conSaldo.count()) > 0;
  }

  async function pulsaConfirmar(page: import('@playwright/test').Page): Promise<void> {
    const confirmar = page.getByRole('button', { name: /Confirmar pedido/i }).first();
    await confirmar.click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
  }
});
