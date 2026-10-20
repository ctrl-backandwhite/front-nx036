import { expect, type Page } from '@playwright/test';

/**
 * Poner el tema como lo pone la aplicación, y comprobar que de verdad se puso.
 *
 * <p>QUÉ SE ROMPÍA. `e2e/calidad/contenido.spec.ts` certificaba el tema oscuro con
 * `page.emulateMedia({ colorScheme: 'dark' })`. Eso enciende la preferencia del sistema, pero NO
 * pone el atributo `data-theme` — y `app.ts` solo lo pone cuando hay una elección guardada. Las
 * correcciones del tema oscuro del proyecto cuelgan de ese atributo, así que la prueba medía una
 * rama sin ninguna de ellas y pasaba. Llevaba meses validando un oscuro que nadie ve.
 *
 * <p>La palanca correcta es la COOKIE `nx036-theme` (`core/preferences/preferencias.ts`), que es
 * donde la aplicación guarda la elección. Tiene además una ventaja sobre pulsar el interruptor:
 * el servidor la lee al renderizar, así que se mide también el primer pintado y no solo lo
 * hidratado.
 */

export const OSCURO = 'nx036-pastel-dark';
export const CLARO = 'nx036-pastel';

/** Deja elegido el tema ANTES de navegar, igual que si el visitante lo hubiera pulsado. */
export async function ponElTema(page: Page, base: string, tema: string): Promise<void> {
  await page.context().addCookies([{ name: 'nx036-theme', value: tema, url: base }]);
}

/**
 * Comprueba que el tema pedido es el que se está pintando. DOS aserciones, no una.
 *
 * <p>La primera dice que el atributo llegó; la segunda, que la hoja de estilos REACCIONÓ a él. Sin
 * la segunda, el día que cambie el nombre de un tema o el de la cookie, la batería seguiría en
 * verde midiendo el tema equivocado — que es exactamente lo que acaba de pasar durante meses.
 *
 * <p>El atributo se espera con `toHaveAttribute`, que reintenta: en una página prerenderizada lo
 * escribe Angular al hidratar, después del primer pintado.
 */
export async function confirmaElTema(page: Page, tema: string): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', tema, { timeout: 15_000 });

  const claridadDelFondo = await page.evaluate(() => {
    const fondo = getComputedStyle(document.body).backgroundColor;
    const [r, g, b] = (fondo.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number);
    // Luminancia relativa, la misma fórmula que usa el contraste.
    const lineal = (c: number): number => {
      const x = c / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
  });

  if (tema === OSCURO) {
    expect(claridadDelFondo, 'el atributo dice oscuro pero el fondo está claro: la hoja no reaccionó')
      .toBeLessThan(0.2);
  } else {
    expect(claridadDelFondo, 'el atributo dice claro pero el fondo está oscuro: la hoja no reaccionó')
      .toBeGreaterThan(0.5);
  }
}

/**
 * Comprueba que lo servido es lo que se acaba de construir.
 *
 * <p>QUÉ SE ROMPÍA. Esta batería midió tres veces el mismo entorno y dio tres resultados
 * distintos: la primera contra la versión anterior —el despliegue terminó mientras corría—, la
 * segunda contra una a medio propagar, y solo la tercera contra la buena. Las dos primeras
 * parecían diagnósticos legítimos; una de ellas me llevó a culpar a la herramienta de medida.
 *
 * <p>El problema no es del día: una batería que no sabe contra qué versión mide no puede
 * distinguir «la aplicación está rota» de «estoy mirando una que ya no existe». Y eso vuelve a
 * pasar cada vez que alguien la lance justo después de entregar.
 *
 * <p>Se compara el nombre del fichero de estilos, que lleva hash del contenido: si el servido no
 * es el construido, no son la misma aplicación. Es un apaño hasta que el entorno exponga su
 * versión —hoy no la expone, y por eso «¿está desplegado lo que probé?» es un acto de fe—.
 */
export async function confirmaLaVersion(page: Page, base: string, hojaEsperada: string): Promise<void> {
  const html = await (await page.request.get(`${base}/?v=${Date.now()}`)).text();
  const servida = html.match(/styles-[A-Z0-9]+\.css/)?.[0];
  expect(
    servida,
    `Lo servido no es lo construido: ${base} sirve ${servida} y en dist hay ${hojaEsperada}. ` +
      'Mide cuando el despliegue haya terminado, o estarás diagnosticando otra versión.',
  ).toBe(hojaEsperada);
}
