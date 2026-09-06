# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo/con-sesion.spec.ts >> Angular · recorrido con sesión >> el catálogo enseña productos de verdad
- Location: e2e/flujo/con-sesion.spec.ts:56:9

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
  39  |   await page.locator('button[type="submit"]').first().click();
  40  | 
  41  |   // La entrada termina cuando la dirección deja de ser la de acceso. Se espera a eso y no a un texto
  42  |   // concreto: el destino depende del papel de la cuenta.
> 43  |   await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
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