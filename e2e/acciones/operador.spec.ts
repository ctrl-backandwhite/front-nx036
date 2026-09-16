import { expect, test } from '@playwright/test';
import { ANGULAR, abre, apartaAlAsistente, descartaElAvisoDeGalletas } from '../util/comparador';
import { OPERADOR, entra } from '../util/sesion';

/**
 * Lo que ve —y lo que NO— quien da soporte.
 *
 * <p>El panel tenía tres listas de permisos escritas por separado: el menú lateral, los guardianes de
 * las rutas y la paleta de búsqueda rápida. El menú estaba bien y las otras dos no: un operador abría
 * dieciocho pantallas que el backend reserva a administración —el catálogo entero con sus costes y
 * proveedores, precios, facturación, carteras, usuarios, socios—. El backend le contestaba 403, así que
 * las tablas salían vacías; pero los rótulos, las columnas y los formularios se pintan ANTES de la
 * primera petición, de modo que lo que se le enseñaba era la estructura del negocio.
 *
 * <p>No había NINGUNA prueba de navegador con este papel: las dos cuentas de certificación eran cliente
 * y administración. Por eso el desfase se descubrió leyendo rutas y no corriendo la batería —y por eso
 * esta prueba existe.
 *
 * <p>La regla la manda el servidor y es exacta: de todo `/api/admin/**` solo `/api/admin/orders/**` y
 * `/api/admin/operator/**` admiten OPERATOR. Ojo con `operators` en plural, que es el informe de
 * operadores y es de administración.
 */

/** Lo suyo: pedidos, sus ganancias y su perfil. */
const SUYAS = ['/admin/orders', '/admin/operator/earnings', '/admin/profile'];

/** Una muestra de lo que NO es suyo, una por área del panel. */
const AJENAS = [
  '/admin/catalog',
  '/admin/suppliers',
  '/admin/pricing',
  '/admin/billing',
  '/admin/wallets',
  '/admin/users',
  '/admin/purchases',
  '/admin/warehouses',
  '/admin/taxes',
  '/admin/operators',
];

test.describe('lo que ve quien da soporte', () => {
  // Solo a la anchura de escritorio: el panel es una herramienta de escritorio y su menú lateral se
  // pliega por debajo. Es el mismo criterio que la batería de administración.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'el panel es de escritorio');

  test.beforeEach(async ({ page }) => {
    await entra(page, ANGULAR, OPERADOR);
    await descartaElAvisoDeGalletas(page);
    await apartaAlAsistente(page);
  });

  /**
   * Al entrar se manda a `/admin` a todo el personal, así que cerrar el panel de control sin dar salida
   * habría devuelto al operador al escaparate en CADA acceso: una regresión creada por el propio
   * arreglo de seguridad. Aquí acaba en sus pedidos.
   */
  test('entrar por /admin le deja en sus pedidos, no en el escaparate', async ({ page }) => {
    await abre(page, `${ANGULAR}/admin`);

    await expect(page).toHaveURL(/\/admin\/orders$/);
  });

  for (const ruta of SUYAS) {
    test(`abre lo suyo: ${ruta}`, async ({ page }) => {
      await abre(page, `${ANGULAR}${ruta}`);

      await expect(page).toHaveURL(new RegExp(`${ruta.replace(/\//g, '\\/')}$`));
    });
  }

  for (const ruta of AJENAS) {
    test(`no entra en ${ruta}`, async ({ page }) => {
      await abre(page, `${ANGULAR}${ruta}`);

      // Al negar se le manda al catálogo, que es su zona: mandarle a la portada se leía como un fallo
      // de navegación y no como una negativa.
      await expect(page).toHaveURL(/\/catalog$/);
    });
  }

  test('el menú del panel no le ofrece ninguna puerta que le vaya a rebotar', async ({ page }) => {
    await abre(page, `${ANGULAR}/admin/orders`);

    for (const ruta of AJENAS) {
      await expect(
        page.locator(`nav a[href="${ruta}"], aside a[href="${ruta}"]`),
        `el menú ofrece ${ruta}, que le está cerrada`,
      ).toHaveCount(0);
    }
    // Y no puede quedarse sin menú: sin lo suyo tampoco podría trabajar.
    await expect(page.locator('a[href="/admin/orders"]').first()).toBeVisible();
  });

  /**
   * La misma fuga por otra puerta. La paleta (Ctrl/⌘+K) es una SEGUNDA lista de destinos del panel y no
   * filtraba por papel: ofrecía precios, facturación, carteras, usuarios y socios.
   */
  test('la búsqueda rápida tampoco le ofrece lo que no puede abrir', async ({ page }) => {
    await abre(page, `${ANGULAR}/admin/orders`);
    await page.keyboard.press('Control+k');

    const paleta = page.getByRole('dialog');
    await expect(paleta).toBeVisible();

    for (const ruta of AJENAS) {
      await expect(paleta.locator(`a[href="${ruta}"]`), `la paleta ofrece ${ruta}`).toHaveCount(0);
    }
    await expect(paleta.locator('a[href="/admin/orders"]').first()).toBeVisible();
  });
});
