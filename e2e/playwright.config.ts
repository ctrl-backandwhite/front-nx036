import { defineConfig, devices } from '@playwright/test';

/**
 * Certificación del escaparate y el panel, contra sus propios requisitos.
 *
 * <p>Nació como COMPARACIÓN contra el frontend React: los dos corrían a la vez contra el mismo
 * backend y cualquier diferencia no declarada era un defecto del porte. El 9-sep-2026 el React se
 * retiró del repositorio, y con él la mitad de esta certificación dejó de EJECUTARSE —no de fallar—,
 * que es la forma más silenciosa de perder cobertura: 78 pruebas en verde sin correr.
 *
 * <p>Al quitar la comparación, dos defectos que estaba excusando pasaron a verse: la capa del
 * asistente que impide pulsar nada al entrar desde un móvil, y el aspa del menú del panel, intocable
 * porque la cabecera se le pone encima. Los dos llevaban anotados como «no es defecto, el original
 * hace lo mismo».
 *
 * <p>Ahora el listón es el requisito. Donde solo tenía sentido comparar —«se pinta igual», «reparte
 * el espacio igual»— la prueba se retiró en vez de reescribirse en falso; donde el original hacía de
 * listón —bytes, tiempos, objetivos táctiles— hay presupuesto absoluto o lista declarada de deuda,
 * que no puede crecer.
 *
 * <p>Dos proyectos, uno por anchura, porque el proyecto es MOBILE FIRST y la certificación tiene que
 * mirar el móvil como caso principal, no como una comprobación de última hora.
 */
export default defineConfig({
  testDir: '.',
  // En serie a propósito. Se comparan tiempos de respuesta, y varias pestañas compitiendo por la CPU
  // convierten esa medida en ruido. Además el backend es uno solo: la carga cruzada falsearía todo.
  workers: 1,
  fullyParallel: false,
  // Un reintento cubre el fallo de red suelto; más reintentos esconderían la inestabilidad de verdad.
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'resultados/certificacion.json' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Idioma fijo en las dos aplicaciones: si cada una resolviera el suyo por su cuenta, la comparación
    // de textos daría diferencias que no son defectos.
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },
  projects: [
    /**
     * El móvil se certifica sobre Chromium a la anchura de un móvil, no sobre Safari.
     *
     * <p>Es una decisión con un hueco declarado, no un descuido. El perfil de iPhone arranca WebKit, y
     * este equipo no tiene las bibliotecas de sistema que necesita: se instala el navegador pero no
     * llega a lanzarse, y con él la mitad de la certificación NO SE EJECUTABA — dando cientos de fallos
     * que no eran del código. Chrome sobre Android es además la mayor parte del tráfico móvil real.
     *
     * <p>Lo que se certifica aquí es el diseño en pantalla estrecha: una columna, sin desplazamiento
     * horizontal, objetivos que se pueden pulsar con el dedo. Eso no depende del motor.
     *
     * <p>HUECO CONOCIDO: las diferencias propias de Safari en iOS no quedan cubiertas. Se cierra con
     * `npx playwright install-deps webkit` y devolviendo aquí el perfil de iPhone.
     */
    { name: 'movil', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
