# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo/con-sesion.spec.ts >> Angular · recorrido con sesión >> el panel NO abre con una cuenta de cliente
- Location: e2e/flujo/con-sesion.spec.ts:115:9

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e6]:
    - link [ref=e9] [cursor=pointer]:
      - /url: /
    - generic [ref=e13]:
      - heading "Importa bestsellers transfronterizos con una sola API." [level=2] [ref=e14]
      - paragraph [ref=e15]: Conecta tu tienda, elige productos ganadores y deja que los proveedores se encarguen del resto.
      - list [ref=e16]:
        - listitem [ref=e17]:
          - generic [ref=e22]: Proveedores verificados con KPIs de entrega
        - listitem [ref=e23]:
          - generic [ref=e28]: Tracking en tiempo real + fulfilment automático
        - listitem [ref=e29]:
          - generic [ref=e34]: Almacenes globales en varias regiones
    - figure [ref=e35]:
      - generic [ref=e36]:
        - blockquote [ref=e40]: «Sustituimos tres herramientas de sourcing por NX036 y redujimos un 9% el COGS en el primer trimestre.»
        - generic [ref=e41]: — Laura M., vendedora DTC
  - generic [ref=e44]:
    - link [ref=e45] [cursor=pointer]:
      - /url: /
    - heading "Inicia sesión" [level=1] [ref=e49]
    - alert [ref=e50]:
      - generic [ref=e54]: No se pudo iniciar sesión.
    - generic [ref=e55]:
      - button "Google" [ref=e56] [cursor=pointer]
      - button "GitHub" [ref=e61] [cursor=pointer]
    - generic [ref=e66]: o con email
    - generic [ref=e67]:
      - generic [ref=e68]:
        - generic [ref=e69]: Email
        - textbox "Email" [ref=e70]:
          - /placeholder: tu@email.com
          - text: cert-cliente@local.test
      - generic [ref=e71]:
        - generic [ref=e72]: Contraseña
        - generic [ref=e73]:
          - textbox "Contraseña" [ref=e74]: CertLocal2026!
          - button "Mostrar contraseña" [ref=e75]
      - link "¿Olvidaste tu contraseña?" [ref=e80] [cursor=pointer]:
        - /url: /password-reset
      - button [ref=e81] [cursor=pointer]
    - generic [ref=e85]:
      - text: ¿No tienes cuenta?
      - link "Regístrate" [ref=e86] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1   | import { Page, expect, test } from '@playwright/test';
  2   | import { ANGULAR, REACT } from '../util/comparador';
  3   | 
  4   | /**
  5   |  * Certificación con SESIÓN, recorriendo la aplicación como lo haría una persona.
  6   |  *
  7   |  * <p>Es la parte que ninguna prueba de componente puede dar: aquí no hay dobles. La sesión se abre por
  8   |  * el formulario de verdad, el backend es el mismo que sirve al frontend React, y los datos que se ven
  9   |  * son los que hay en la base. Un fallo aquí es un fallo que le pasaría a alguien.
  10  |  *
  11  |  * <p>Se ejecuta contra los DOS frontends con el mismo recorrido, y lo que se compara es el
  12  |  * comportamiento: si el React deja hacer algo y el Angular no —o al revés—, es un defecto del porte.
  13  |  *
  14  |  * <p>Las cuentas son las de certificación del proyecto, creadas en la base local y desechables. No se
  15  |  * pueden dar de alta por la API porque el registro exige resolver un CAPTCHA.
  16  |  */
  17  | const CLIENTE = { correo: 'cert-cliente@local.test', clave: 'CertLocal2026!' };
  18  | const ADMIN = { correo: 'cert-admin@local.test', clave: 'CertLocal2026!' };
  19  | 
  20  | /** Busca el primer identificador de producto que aparezca en la respuesta, sea cual sea su forma. */
  21  | function buscaSlug(dato: unknown, profundidad = 0): string | undefined {
  22  |   if (profundidad > 4 || dato === null || typeof dato !== 'object') {
  23  |     return undefined;
  24  |   }
  25  |   if (Array.isArray(dato)) {
  26  |     for (const elemento of dato.slice(0, 5)) {
  27  |       const encontrado = buscaSlug(elemento, profundidad + 1);
  28  |       if (encontrado) {
  29  |         return encontrado;
  30  |       }
  31  |     }
  32  |     return undefined;
  33  |   }
  34  |   const objeto = dato as Record<string, unknown>;
  35  |   if (typeof objeto['slug'] === 'string') {
  36  |     return objeto['slug'];
  37  |   }
  38  |   for (const valor of Object.values(objeto)) {
  39  |     const encontrado = buscaSlug(valor, profundidad + 1);
  40  |     if (encontrado) {
  41  |       return encontrado;
  42  |     }
> 43  |   }
      |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  44  |   return undefined;
  45  | }
  46  | 
  47  | const FRONTS = [
  48  |   { nombre: 'React', base: REACT },
  49  |   { nombre: 'Angular', base: ANGULAR },
  50  | ] as const;
  51  | 
  52  | /**
  53  |  * Abre sesión por la pantalla de acceso, no por la API.
  54  |  *
  55  |  * <p>Es deliberado y cuesta unos segundos más: entrar por la API certificaría el backend, que no es lo
  56  |  * que se está portando. Lo que hay que comprobar es que el formulario recoge las credenciales, las
  57  |  * manda, guarda la sesión y lleva a donde toca — que son cuatro cosas que se pueden romper por separado.
  58  |  */
  59  | async function entra(page: Page, base: string, cuenta: { correo: string; clave: string }): Promise<void> {
  60  |   await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  61  | 
  62  |   // Los dos frontends etiquetan igual los campos, pero no comparten marcado: se busca por tipo, que es
  63  |   // lo estable, y se cae al identificador si hiciera falta.
  64  |   await page.locator('input[type="email"]').first().fill(cuenta.correo);
  65  |   await page.locator('input[type="password"]').first().fill(cuenta.clave);
  66  |   await page.locator('button[type="submit"]').first().click();
  67  | 
  68  |   // La entrada termina cuando la dirección deja de ser la de acceso. Se espera a eso y no a un texto
  69  |   // concreto: el destino depende del papel de la cuenta.
  70  |   await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  71  | }
  72  | 
  73  | for (const front of FRONTS) {
  74  |   test.describe(`${front.nombre} · recorrido con sesión`, () => {
  75  |     test('entra con la cuenta de cliente y llega a su zona', async ({ page }) => {
  76  |       await entra(page, front.base, CLIENTE);
  77  | 
  78  |       // A quien no es personal interno se le lleva al catálogo, que es su zona de trabajo.
  79  |       expect(new URL(page.url()).pathname).not.toBe('/login');
  80  |       await expect(page.locator('body')).not.toContainText(/credenciales|invalid|incorrect/i);
  81  |     });
  82  | 
  83  |     test('el catálogo enseña productos de verdad', async ({ page }) => {
  84  |       await entra(page, front.base, CLIENTE);
  85  |       await page.goto(`${front.base}/catalog`, { waitUntil: 'networkidle' });
  86  | 
  87  |       const texto = await page.locator('body').innerText();
  88  |       expect(texto.length, 'el catálogo llega vacío').toBeGreaterThan(500);
  89  |       // Un catálogo sin un solo importe es un catálogo que no ha cargado.
  90  |       expect(texto, 'no se ve ni un precio en el catálogo').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
  91  |     });
  92  | 
  93  |     test('la ficha de un producto abre con su precio', async ({ page, request }) => {
  94  |       // El listado del catálogo exige sesión —es el muro del proyecto— y desde `request` no la hay,
  95  |       // así que el producto de ejemplo se saca de las secciones de la portada, que sí son públicas.
  96  |       // Pedirlo al endpoint privado devolvía 401 y la prueba se SALTABA en silencio, que es la peor
  97  |       // forma de fallar: un hueco de cobertura disfrazado de verde.
  98  |       const respuesta = await request.get(`${front.base}/api/catalog/home/sections`);
  99  |       const slug = buscaSlug(await respuesta.json().catch(() => null));
  100 |       test.skip(!slug, 'la base local no tiene productos: no se puede certificar la ficha');
  101 | 
  102 |       await entra(page, front.base, CLIENTE);
  103 |       await page.goto(`${front.base}/catalog/${slug}`, { waitUntil: 'networkidle' });
  104 | 
  105 |       const texto = await page.locator('body').innerText();
  106 |       expect(texto.length, 'la ficha llega vacía').toBeGreaterThan(500);
  107 |       expect(texto, 'la ficha no enseña precio').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
  108 |     });
  109 | 
  110 |     /**
  111 |      * Las cuatro pantallas de la zona de cliente. No se afirma qué dicen —dependen de los datos de la
  112 |      * cuenta— sino que ABREN: que la sesión llega, que la ruta resuelve y que no revientan.
  113 |      */
  114 |     for (const ruta of ['/orders', '/wallet', '/profile', '/favorites']) {
  115 |       test(`${ruta} abre con sesión`, async ({ page }) => {
  116 |         const errores: string[] = [];
  117 |         page.on('pageerror', (e) => errores.push(e.message));
  118 | 
  119 |         await entra(page, front.base, CLIENTE);
  120 |         await page.goto(`${front.base}${ruta}`, { waitUntil: 'networkidle' });
  121 | 
  122 |         expect(new URL(page.url()).pathname, `${ruta} rebota a la pantalla de acceso con sesión abierta`)
  123 |           .not.toBe('/login');
  124 |         const texto = await page.locator('body').innerText();
  125 |         expect(texto.trim().length, `${ruta} llega en blanco`).toBeGreaterThan(100);
  126 |         expect(errores, `${ruta} lanza errores: ${errores.slice(0, 2).join(' · ')}`).toEqual([]);
  127 |       });
  128 |     }
  129 | 
  130 |     test('sin sesión, la zona de cliente manda a la pantalla de acceso', async ({ page }) => {
  131 |       await page.goto(`${front.base}/orders`, { waitUntil: 'networkidle' });
  132 |       expect(page.url(), 'deja ver los pedidos sin haber entrado').toContain('/login');
  133 |     });
  134 | 
  135 |     test('el panel abre con la cuenta de administración', async ({ page }) => {
  136 |       await entra(page, front.base, ADMIN);
  137 |       await page.goto(`${front.base}/admin`, { waitUntil: 'networkidle' });
  138 | 
  139 |       expect(new URL(page.url()).pathname, 'el panel rebota con una cuenta de administración')
  140 |         .not.toBe('/login');
  141 |       const texto = await page.locator('body').innerText();
  142 |       expect(texto.trim().length, 'el panel llega en blanco').toBeGreaterThan(200);
  143 |     });
```