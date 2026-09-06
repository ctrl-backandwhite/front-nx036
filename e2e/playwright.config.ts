import { defineConfig, devices } from '@playwright/test';

/**
 * Certificación del porte, por COMPARACIÓN contra el frontend React.
 *
 * <p>Los dos frontends corren a la vez contra el mismo backend, así que las pruebas no afirman contra
 * una lista de requisitos escrita a mano —que envejece y se interpreta— sino contra la aplicación que
 * se está reemplazando. Cualquier diferencia no declarada como esperable es un defecto del porte.
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
    { name: 'movil', use: { ...devices['iPhone 13'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
