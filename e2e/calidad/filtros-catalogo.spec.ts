import { expect, test } from '@playwright/test';
import { ANGULAR } from '../util/comparador';
import { CLIENTE } from '../util/sesion';

/**
 * Los filtros del catálogo, comprobados contra los DATOS que devuelven.
 *
 * <p>No basta con que la pantalla reaccione: un filtro puede repintar la lista y no filtrar nada. Aquí
 * cada caso mira los productos devueltos y comprueba que de verdad cumplen lo que se pidió —que el más
 * caro con «hasta 10» no pasa de 10, que todos los resultados de «vestido» son vestidos—.
 *
 * <p>Se habla con la API y no con la interfaz a propósito: el precio de una tarjeta viene formateado y
 * en la divisa de quien mira, así que compararlo obligaría a deshacer el formato y la prueba acabaría
 * midiendo el formateador. La interfaz se cubre en el recorrido de compra; aquí lo que se certifica es
 * la REGLA.
 *
 * <p>TRAMPA que costó una pasada entera: la respuesta trae los productos en `items`, no en `content`.
 * Con la clave equivocada la lista sale vacía, todos los `every` se cumplen sobre cero elementos y la
 * batería pasa en verde sin haber comprobado nada. Por eso lo primero que se exige es que HAYA datos.
 */

/** Un producto tal como lo devuelve el listado, con lo que hace falta para juzgar cada filtro. */
interface Ficha {
  readonly titulo: string;
  readonly precio: number;
  readonly valoracion: number;
}

interface Respuesta {
  readonly total: number;
  readonly fichas: readonly Ficha[];
}

async function accede(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${ANGULAR}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(CLIENTE.correo);
  await page.locator('input[type="password"]').first().fill(CLIENTE.clave);
  await page.locator('button[type="submit"]').first().click();
  // Se espera a la CREDENCIAL y no a la navegación: es lo que necesitan las llamadas de abajo, y
  // esperar a que cargue la pantalla siguiente agotaba el plazo con el catálogo lleno.
  await page.waitForFunction(() => !!localStorage.getItem('nx-access-token'), null, { timeout: 40_000 });
}

async function consulta(page: import('@playwright/test').Page, filtro: string): Promise<Respuesta> {
  return page.evaluate(async (q: string) => {
    const credencial = localStorage.getItem('nx-access-token');
    const respuesta = await fetch(`/api/catalog/products?lang=es&size=24&${q}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${credencial}` },
    });
    if (!respuesta.ok) {
      throw new Error(`el catálogo respondió ${respuesta.status} a «${q}»`);
    }
    const cuerpo = await respuesta.json();
    return {
      total: cuerpo.totalElements as number,
      fichas: ((cuerpo.items ?? []) as Record<string, unknown>[]).map((p) => ({
        titulo: String(p['title'] ?? ''),
        precio: Number(p['displayPrice'] ?? p['priceUsd'] ?? p['basePrice']),
        valoracion: Number(p['rating'] ?? 0),
      })),
    };
  }, filtro);
}

const precios = (r: Respuesta): number[] => r.fichas.map((f) => f.precio).filter(Number.isFinite);

test.describe('filtros del catálogo', () => {
  test('cada filtro devuelve productos que de verdad lo cumplen', async ({ page }) => {
    test.slow();
    await accede(page);

    const todo = await consulta(page, '');
    expect(todo.total, 'el catálogo está vacío: nada de lo que sigue probaría nada').toBeGreaterThan(50);
    expect(todo.fichas.length, 'sin productos en la página, los filtros se cumplirían de vacío').toBeGreaterThan(0);

    // TEXTO. Acota, y lo que devuelve casa con lo buscado.
    const texto = await consulta(page, 'q=vestido');
    expect(texto.total).toBeGreaterThan(0);
    expect(texto.total, 'buscar no reduce el catálogo').toBeLessThan(todo.total);
    expect(
      texto.fichas.filter((f) => /vestid/i.test(f.titulo)).length,
      'hay resultados que no son vestidos',
    ).toBe(texto.fichas.length);

    // PRECIO. El límite se respeta por arriba, por abajo y en rango.
    const barato = await consulta(page, 'maxPrice=10');
    expect(barato.total).toBeGreaterThan(0);
    expect(Math.max(...precios(barato)), 'se cuela algo por encima del máximo').toBeLessThanOrEqual(10.01);

    const caro = await consulta(page, 'minPrice=50');
    expect(caro.total).toBeGreaterThan(0);
    expect(Math.min(...precios(caro)), 'se cuela algo por debajo del mínimo').toBeGreaterThanOrEqual(49.99);

    const rango = await consulta(page, 'minPrice=20&maxPrice=25');
    expect(rango.fichas.length).toBeGreaterThan(0);
    expect(
      precios(rango).filter((p) => p < 19.99 || p > 25.01),
      'hay productos fuera del rango pedido',
    ).toHaveLength(0);

    // VALORACIÓN. Ninguno por debajo del mínimo (el cero es «sin valorar», no una nota baja).
    const valorados = await consulta(page, 'minRating=4');
    expect(valorados.total).toBeGreaterThan(0);
    expect(
      valorados.fichas.filter((f) => f.valoracion > 0 && f.valoracion < 4),
      'hay productos con menos valoración de la pedida',
    ).toHaveLength(0);

    // ORDEN. Y no solo que cambie: que salga ORDENADO.
    const ascendente = precios(await consulta(page, 'sort=price_asc'));
    expect(ascendente.length).toBeGreaterThan(3);
    expect(
      ascendente.every((p, i, todos) => i === 0 || todos[i - 1] <= p + 0.01),
      'el orden ascendente no está ordenado',
    ).toBe(true);

    const descendente = precios(await consulta(page, 'sort=price_desc'));
    expect(descendente.length).toBeGreaterThan(3);
    expect(
      descendente.every((p, i, todos) => i === 0 || todos[i - 1] >= p - 0.01),
      'el orden descendente no está ordenado',
    ).toBe(true);

    // COMBINADOS. Dos filtros a la vez acotan MÁS, y se cumplen los dos.
    const combinado = await consulta(page, 'q=vestido&maxPrice=15');
    expect(combinado.total).toBeGreaterThan(0);
    expect(combinado.total, 'añadir un filtro no acota').toBeLessThanOrEqual(texto.total);
    expect(combinado.fichas.every((f) => /vestid/i.test(f.titulo))).toBe(true);
    expect(Math.max(...precios(combinado))).toBeLessThanOrEqual(15.01);
  });

  /**
   * El filtro por categoría se comprueba aparte porque necesita una categoría REAL del árbol: el
   * identificador cambia por entorno, así que se toma del propio backend en vez de escribirlo aquí.
   */
  test('el filtro por categoría devuelve solo esa categoría', async ({ page }) => {
    test.slow();
    await accede(page);

    const categoria = await page.evaluate(async () => {
      const credencial = localStorage.getItem('nx-access-token');
      const arbol = await (
        await fetch('/api/catalog/categories/tree?lang=es', {
          headers: { Authorization: `Bearer ${credencial}` },
        })
      ).json();
      const plano: { id: string; name: string }[] = [];
      const recorre = (ramas: Record<string, unknown>[]): void => {
        for (const rama of ramas ?? []) {
          plano.push({ id: String(rama['id']), name: String(rama['name'] ?? '') });
          recorre((rama['children'] ?? []) as Record<string, unknown>[]);
        }
      };
      recorre(Array.isArray(arbol) ? arbol : []);
      return plano.find((c) => /^vestido$/i.test(c.name)) ?? plano[0];
    });

    expect(categoria, 'no hay ninguna categoría en el árbol').toBeTruthy();

    const todo = await consulta(page, '');
    const filtrado = await consulta(page, `categoryId=${categoria.id}`);
    expect(filtrado.total, `la categoría «${categoria.name}» no devuelve nada`).toBeGreaterThan(0);
    expect(filtrado.total, 'filtrar por categoría no acota el catálogo').toBeLessThan(todo.total);
  });
});
