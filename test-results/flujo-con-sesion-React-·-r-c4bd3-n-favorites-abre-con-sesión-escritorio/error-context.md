# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo/con-sesion.spec.ts >> React · recorrido con sesión >> /favorites abre con sesión
- Location: e2e/flujo/con-sesion.spec.ts:85:11

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]').first()
    - locator resolved to <button type="submit" class="btn btn-primary w-full">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  3 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <path fill="currentColor" d="M0 24C0 10.7 10.7 0 24 0L69.5 0c22 0 41.5 12.8 50.6 32l411 0c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3l-288.5 0 5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5L488 336c13.3 0 24 10.7 24 24s-10.7 24-24 24l-288.3 0c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5L24 48C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"></path> from <div role="status" class="cart-splash " aria-label="Cargando">…</div> subtree intercepts pointer events
  110 × retrying click action
        - waiting 500ms
        - waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <a data-discover="true" href="/legal/cookies" class="link link-primary">Política de cookies</a> from <div class="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e7]:
    - paragraph [ref=e8]:
      - text: "En NX036 usamos cookies y almacenamiento en tu equipo para que la web funcione y recuerde tus preferencias. Hoy no cargamos analítica ni publicidad: si algún día lo hacemos, no se activará sin tu permiso. Puedes aceptar todas, rechazarlas o configurar tus preferencias."
      - link "Política de cookies" [ref=e9] [cursor=pointer]:
        - /url: /legal/cookies
      - text: .
    - generic [ref=e10]:
      - button "Aceptar todas" [ref=e11] [cursor=pointer]
      - button "Rechazar todas" [ref=e12] [cursor=pointer]
      - button "Personalizar" [ref=e13] [cursor=pointer]
  - generic [ref=e15]:
    - complementary [ref=e16]:
      - link "NX036" [ref=e19] [cursor=pointer]:
        - /url: /
      - generic [ref=e21]:
        - heading "Importa bestsellers transfronterizos con una sola API." [level=2] [ref=e22]
        - paragraph [ref=e23]: Conecta tu tienda, elige productos ganadores y deja que los proveedores se encarguen del resto.
        - list [ref=e24]:
          - listitem [ref=e25]:
            - generic [ref=e29]: Proveedores verificados con KPIs de entrega
          - listitem [ref=e30]:
            - generic [ref=e34]: Tracking en tiempo real + fulfilment automático
          - listitem [ref=e35]:
            - generic [ref=e39]: 2 almacenes en CN, ES
      - figure [ref=e40]:
        - generic [ref=e41]:
          - blockquote [ref=e44]: «Sustituimos tres herramientas de sourcing por NX036 y redujimos un 9% el COGS en el primer trimestre.»
          - generic [ref=e45]: — Laura M., vendedora DTC
    - generic [ref=e48]:
      - link "Volver a la tienda" [ref=e49] [cursor=pointer]:
        - /url: /
      - generic [ref=e52]:
        - heading "Inicia sesión" [level=1] [ref=e53]
        - generic [ref=e54]:
          - button "Sign in with google" [ref=e55] [cursor=pointer]:
            - generic [ref=e58]: Google
          - button "Sign in with github" [ref=e59] [cursor=pointer]:
            - generic [ref=e62]: GitHub
        - generic [ref=e63]: o con email
        - generic [ref=e64]:
          - generic [ref=e65]:
            - generic [ref=e66]: Email
            - textbox "Email" [ref=e67]:
              - /placeholder: tu@email.com
          - generic [ref=e68]:
            - generic [ref=e69]: Contraseña
            - generic [ref=e70]:
              - textbox "Contraseña" [active] [ref=e71]: CertLocal2026!
              - button "Mostrar contraseña" [ref=e72]
          - link "¿Olvidaste tu contraseña?" [ref=e75] [cursor=pointer]:
            - /url: /password-reset
          - button "Entrar" [ref=e76] [cursor=pointer]
        - generic [ref=e79]:
          - text: ¿No tienes cuenta?
          - link "Regístrate" [ref=e80] [cursor=pointer]:
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
  20  | const FRONTS = [
  21  |   { nombre: 'React', base: REACT },
  22  |   { nombre: 'Angular', base: ANGULAR },
  23  | ] as const;
  24  | 
  25  | /**
  26  |  * Abre sesión por la pantalla de acceso, no por la API.
  27  |  *
  28  |  * <p>Es deliberado y cuesta unos segundos más: entrar por la API certificaría el backend, que no es lo
  29  |  * que se está portando. Lo que hay que comprobar es que el formulario recoge las credenciales, las
  30  |  * manda, guarda la sesión y lleva a donde toca — que son cuatro cosas que se pueden romper por separado.
  31  |  */
  32  | async function entra(page: Page, base: string, cuenta: { correo: string; clave: string }): Promise<void> {
  33  |   await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  34  | 
  35  |   // Los dos frontends etiquetan igual los campos, pero no comparten marcado: se busca por tipo, que es
  36  |   // lo estable, y se cae al identificador si hiciera falta.
  37  |   await page.locator('input[type="email"]').first().fill(cuenta.correo);
  38  |   await page.locator('input[type="password"]').first().fill(cuenta.clave);
> 39  |   await page.locator('button[type="submit"]').first().click();
      |                                                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
  40  | 
  41  |   // La entrada termina cuando la dirección deja de ser la de acceso. Se espera a eso y no a un texto
  42  |   // concreto: el destino depende del papel de la cuenta.
  43  |   await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  44  | }
  45  | 
  46  | for (const front of FRONTS) {
  47  |   test.describe(`${front.nombre} · recorrido con sesión`, () => {
  48  |     test('entra con la cuenta de cliente y llega a su zona', async ({ page }) => {
  49  |       await entra(page, front.base, CLIENTE);
  50  | 
  51  |       // A quien no es personal interno se le lleva al catálogo, que es su zona de trabajo.
  52  |       expect(new URL(page.url()).pathname).not.toBe('/login');
  53  |       await expect(page.locator('body')).not.toContainText(/credenciales|invalid|incorrect/i);
  54  |     });
  55  | 
  56  |     test('el catálogo enseña productos de verdad', async ({ page }) => {
  57  |       await entra(page, front.base, CLIENTE);
  58  |       await page.goto(`${front.base}/catalog`, { waitUntil: 'networkidle' });
  59  | 
  60  |       const texto = await page.locator('body').innerText();
  61  |       expect(texto.length, 'el catálogo llega vacío').toBeGreaterThan(500);
  62  |       // Un catálogo sin un solo importe es un catálogo que no ha cargado.
  63  |       expect(texto, 'no se ve ni un precio en el catálogo').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
  64  |     });
  65  | 
  66  |     test('la ficha de un producto abre con su precio', async ({ page, request }) => {
  67  |       const respuesta = await request.get(`${front.base}/api/catalog/products?size=1`);
  68  |       const cuerpo = await respuesta.json().catch(() => null);
  69  |       const slug = cuerpo?.content?.[0]?.slug ?? cuerpo?.items?.[0]?.slug;
  70  |       test.skip(!slug, 'la base local no tiene productos: no se puede certificar la ficha');
  71  | 
  72  |       await entra(page, front.base, CLIENTE);
  73  |       await page.goto(`${front.base}/catalog/${slug}`, { waitUntil: 'networkidle' });
  74  | 
  75  |       const texto = await page.locator('body').innerText();
  76  |       expect(texto.length, 'la ficha llega vacía').toBeGreaterThan(500);
  77  |       expect(texto, 'la ficha no enseña precio').toMatch(/[€$£¥]\s?\d|\d[\d.,]*\s?(?:€|EUR|USD)/);
  78  |     });
  79  | 
  80  |     /**
  81  |      * Las cuatro pantallas de la zona de cliente. No se afirma qué dicen —dependen de los datos de la
  82  |      * cuenta— sino que ABREN: que la sesión llega, que la ruta resuelve y que no revientan.
  83  |      */
  84  |     for (const ruta of ['/orders', '/wallet', '/profile', '/favorites']) {
  85  |       test(`${ruta} abre con sesión`, async ({ page }) => {
  86  |         const errores: string[] = [];
  87  |         page.on('pageerror', (e) => errores.push(e.message));
  88  | 
  89  |         await entra(page, front.base, CLIENTE);
  90  |         await page.goto(`${front.base}${ruta}`, { waitUntil: 'networkidle' });
  91  | 
  92  |         expect(new URL(page.url()).pathname, `${ruta} rebota a la pantalla de acceso con sesión abierta`)
  93  |           .not.toBe('/login');
  94  |         const texto = await page.locator('body').innerText();
  95  |         expect(texto.trim().length, `${ruta} llega en blanco`).toBeGreaterThan(100);
  96  |         expect(errores, `${ruta} lanza errores: ${errores.slice(0, 2).join(' · ')}`).toEqual([]);
  97  |       });
  98  |     }
  99  | 
  100 |     test('sin sesión, la zona de cliente manda a la pantalla de acceso', async ({ page }) => {
  101 |       await page.goto(`${front.base}/orders`, { waitUntil: 'networkidle' });
  102 |       expect(page.url(), 'deja ver los pedidos sin haber entrado').toContain('/login');
  103 |     });
  104 | 
  105 |     test('el panel abre con la cuenta de administración', async ({ page }) => {
  106 |       await entra(page, front.base, ADMIN);
  107 |       await page.goto(`${front.base}/admin`, { waitUntil: 'networkidle' });
  108 | 
  109 |       expect(new URL(page.url()).pathname, 'el panel rebota con una cuenta de administración')
  110 |         .not.toBe('/login');
  111 |       const texto = await page.locator('body').innerText();
  112 |       expect(texto.trim().length, 'el panel llega en blanco').toBeGreaterThan(200);
  113 |     });
  114 | 
  115 |     test('el panel NO abre con una cuenta de cliente', async ({ page }) => {
  116 |       await entra(page, front.base, CLIENTE);
  117 |       await page.goto(`${front.base}/admin`, { waitUntil: 'networkidle' });
  118 | 
  119 |       // Da igual adónde le mande —cada front elige— mientras no le enseñe el panel.
  120 |       const texto = await page.locator('body').innerText();
  121 |       expect(texto, 'una cuenta de cliente ve el panel de administración')
  122 |         .not.toMatch(/panel de control|dashboard|gestión de usuarios/i);
  123 |     });
  124 |   });
  125 | }
  126 | 
```