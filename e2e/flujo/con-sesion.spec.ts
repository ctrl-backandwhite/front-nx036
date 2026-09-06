import { Page, expect, test } from '@playwright/test';
import { ANGULAR, REACT, abre } from '../util/comparador';

/**
 * Certificación con SESIÓN, recorriendo la aplicación como lo haría una persona.
 *
 * <p>Es la parte que ninguna prueba de componente puede dar: aquí no hay dobles. La sesión se abre por
 * el formulario de verdad, el backend es el mismo que sirve al frontend React, y los datos que se ven
 * son los que hay en la base. Un fallo aquí es un fallo que le pasaría a alguien.
 *
 * <p>Se ejecuta contra los DOS frontends con el mismo recorrido, y lo que se compara es el
 * comportamiento: si el React deja hacer algo y el Angular no —o al revés—, es un defecto del porte.
 *
 * <p>Las cuentas son las de certificación del proyecto, creadas en la base local y desechables. No se
 * pueden dar de alta por la API porque el registro exige resolver un CAPTCHA.
 */
const CLIENTE = { correo: 'cert-cliente@local.test', clave: 'CertLocal2026!' };
const ADMIN = { correo: 'cert-admin@local.test', clave: 'CertLocal2026!' };

/** Busca el primer identificador de producto que aparezca en la respuesta, sea cual sea su forma. */
function buscaSlug(dato: unknown, profundidad = 0): string | undefined {
  if (profundidad > 4 || dato === null || typeof dato !== 'object') {
    return undefined;
  }
  if (Array.isArray(dato)) {
    for (const elemento of dato.slice(0, 5)) {
      const encontrado = buscaSlug(elemento, profundidad + 1);
      if (encontrado) {
        return encontrado;
      }
    }
    return undefined;
  }
  const objeto = dato as Record<string, unknown>;
  if (typeof objeto['slug'] === 'string') {
    return objeto['slug'];
  }
  for (const valor of Object.values(objeto)) {
    const encontrado = buscaSlug(valor, profundidad + 1);
    if (encontrado) {
      return encontrado;
    }
  }
  return undefined;
}

const FRONTS = [
  { nombre: 'React', base: REACT },
  { nombre: 'Angular', base: ANGULAR },
] as const;

/**
 * Abre sesión por la pantalla de acceso, no por la API.
 *
 * <p>Es deliberado y cuesta unos segundos más: entrar por la API certificaría el backend, que no es lo
 * que se está portando. Lo que hay que comprobar es que el formulario recoge las credenciales, las
 * manda, guarda la sesión y lleva a donde toca — que son cuatro cosas que se pueden romper por separado.
 */
async function entra(page: Page, base: string, cuenta: { correo: string; clave: string }): Promise<void> {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });

  // Los dos frontends etiquetan igual los campos, pero no comparten marcado: se busca por tipo, que es
  // lo estable, y se cae al identificador si hiciera falta.
  await page.locator('input[type="email"]').first().fill(cuenta.correo);
  await page.locator('input[type="password"]').first().fill(cuenta.clave);
  await page.locator('button[type="submit"]').first().click();

  // La entrada termina cuando la dirección deja de ser la de acceso. Se espera a eso y no a un texto
  // concreto: el destino depende del papel de la cuenta.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

for (const front of FRONTS) {
  test.describe(`${front.nombre} · recorrido con sesión`, () => {
    test('entra con la cuenta de cliente y llega a su zona', async ({ page }) => {
      await entra(page, front.base, CLIENTE);

      // A quien no es personal interno se le lleva al catálogo, que es su zona de trabajo.
      expect(new URL(page.url()).pathname).not.toBe('/login');
      await expect(page.locator('body')).not.toContainText(/credenciales|invalid|incorrect/i);
    });

    test('el catálogo enseña productos de verdad', async ({ page }) => {
      await entra(page, front.base, CLIENTE);
      await abre(page, `${front.base}/catalog`);

      const texto = await page.locator('body').innerText();
      expect(texto.length, 'el catálogo llega vacío').toBeGreaterThan(500);
      // Un catálogo sin un solo importe es un catálogo que no ha cargado.
      expect(texto, 'no se ve ni un precio en el catálogo').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
    });

    test('la ficha de un producto abre con su precio', async ({ page, request }) => {
      // El listado del catálogo exige sesión —es el muro del proyecto— y desde `request` no la hay,
      // así que el producto de ejemplo se saca de las secciones de la portada, que sí son públicas.
      // Pedirlo al endpoint privado devolvía 401 y la prueba se SALTABA en silencio, que es la peor
      // forma de fallar: un hueco de cobertura disfrazado de verde.
      const respuesta = await request.get(`${front.base}/api/catalog/home/sections`);
      const slug = buscaSlug(await respuesta.json().catch(() => null));
      test.skip(!slug, 'la base local no tiene productos: no se puede certificar la ficha');

      await entra(page, front.base, CLIENTE);
      await abre(page, `${front.base}/catalog/${slug}`);

      const texto = await page.locator('body').innerText();
      expect(texto.length, 'la ficha llega vacía').toBeGreaterThan(500);
      expect(texto, 'la ficha no enseña precio').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
    });

    /**
     * Las cuatro pantallas de la zona de cliente. No se afirma qué dicen —dependen de los datos de la
     * cuenta— sino que ABREN: que la sesión llega, que la ruta resuelve y que no revientan.
     */
    for (const ruta of ['/orders', '/wallet', '/profile', '/favorites']) {
      test(`${ruta} abre con sesión`, async ({ page }) => {
        const errores: string[] = [];
        page.on('pageerror', (e) => errores.push(e.message));

        await entra(page, front.base, CLIENTE);
        await abre(page, `${front.base}${ruta}`);

        expect(new URL(page.url()).pathname, `${ruta} rebota a la pantalla de acceso con sesión abierta`)
          .not.toBe('/login');
        const texto = await page.locator('body').innerText();
        expect(texto.trim().length, `${ruta} llega en blanco`).toBeGreaterThan(100);
        expect(errores, `${ruta} lanza errores: ${errores.slice(0, 2).join(' · ')}`).toEqual([]);
      });
    }

    test('sin sesión, la zona de cliente manda a la pantalla de acceso', async ({ page }) => {
      await abre(page, `${front.base}/orders`);
      expect(page.url(), 'deja ver los pedidos sin haber entrado').toContain('/login');
    });

    test('el panel abre con la cuenta de administración', async ({ page }) => {
      await entra(page, front.base, ADMIN);
      await abre(page, `${front.base}/admin`);

      expect(new URL(page.url()).pathname, 'el panel rebota con una cuenta de administración')
        .not.toBe('/login');
      const texto = await page.locator('body').innerText();
      expect(texto.trim().length, 'el panel llega en blanco').toBeGreaterThan(200);
    });

    test('el panel NO abre con una cuenta de cliente', async ({ page }) => {
      await entra(page, front.base, CLIENTE);
      await abre(page, `${front.base}/admin`);

      // Da igual adónde le mande —cada front elige— mientras no le enseñe el panel.
      const texto = await page.locator('body').innerText();
      expect(texto, 'una cuenta de cliente ve el panel de administración')
        .not.toMatch(/panel de control|dashboard|gestión de usuarios/i);
    });
  });
}
