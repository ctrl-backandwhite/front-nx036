# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo/con-sesion.spec.ts >> React · recorrido con sesión >> sin sesión, la zona de cliente manda a la pantalla de acceso
- Location: e2e/flujo/con-sesion.spec.ts:100:9

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3003/orders", waiting until "networkidle"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
  - generic [ref=e14]:
    - banner [ref=e15]:
      - link "NX036" [ref=e17] [cursor=pointer]:
        - /url: /
      - list [ref=e22]:
        - listitem [ref=e23]:
          - link "Inicio" [ref=e24] [cursor=pointer]:
            - /url: /
      - generic [ref=e27]:
        - button "Switch to dark theme" [ref=e28] [cursor=pointer]
        - button "Carrito" [ref=e32] [cursor=pointer]
        - button "🇺🇸 USD · EN" [ref=e37]:
          - generic [ref=e38]: 🇺🇸
          - generic [ref=e39]: USD
          - generic [ref=e40]: ·
          - generic [ref=e41]: EN
        - link "Iniciar sesión" [ref=e44] [cursor=pointer]:
          - /url: /login
    - main [ref=e47]:
      - navigation "Breadcrumb" [ref=e48]:
        - link "Inicio" [ref=e49] [cursor=pointer]:
          - /url: /
        - generic [ref=e55]: Pedidos
    - contentinfo [ref=e57]:
      - complementary [ref=e58]:
        - link "NX036" [ref=e59] [cursor=pointer]:
          - /url: /
        - paragraph [ref=e62]: Una plataforma de comercio transfronterizo que conecta vendedores, proveedores y almacenes en todo el mundo.
      - navigation [ref=e63]:
        - heading "Plataforma" [level=6] [ref=e64]
        - link "Catálogo" [ref=e65] [cursor=pointer]:
          - /url: /catalog
      - navigation [ref=e66]:
        - heading "Empresa" [level=6] [ref=e67]
        - link "Sobre nosotros" [ref=e68] [cursor=pointer]:
          - /url: /about
        - link "Privacidad" [ref=e69] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Términos" [ref=e70] [cursor=pointer]:
          - /url: /legal/terms
        - link "Cookies" [ref=e71] [cursor=pointer]:
          - /url: /legal/cookies
        - link "Aviso legal" [ref=e72] [cursor=pointer]:
          - /url: /legal/notice
        - link "Devoluciones y desistimiento" [ref=e73] [cursor=pointer]:
          - /url: /legal/withdrawal
        - link "Contacto" [ref=e74] [cursor=pointer]:
          - /url: /contact
      - navigation [ref=e75]:
        - heading "Newsletter" [level=6] [ref=e76]
        - paragraph [ref=e77]: Novedades de producto, ofertas y consejos de dropshipping.
        - generic [ref=e78]:
          - textbox "Tu email" [ref=e79]
          - button "Suscribirse" [ref=e80] [cursor=pointer]
    - contentinfo [ref=e83]:
      - complementary [ref=e84]:
        - paragraph [ref=e85]:
          - generic [ref=e86]: © 2026 NX036. Hecho para vendedores transfronterizos.
          - generic [ref=e87]: ·
          - generic [ref=e88]:
            - link "GitHub" [ref=e89] [cursor=pointer]:
              - /url: https://github.com/nx036
            - link "X" [ref=e92] [cursor=pointer]:
              - /url: https://x.com/nx036
            - link "LinkedIn" [ref=e95] [cursor=pointer]:
              - /url: https://linkedin.com/company/nx036
            - link "Discord" [ref=e98] [cursor=pointer]:
              - /url: https://discord.gg/nx036
          - generic [ref=e101]: ·
          - button "Preferencias de cookies" [ref=e102] [cursor=pointer]
          - generic [ref=e103]: ·
          - generic [ref=e104]: v0.1.0
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
> 101 |       await page.goto(`${front.base}/orders`, { waitUntil: 'networkidle' });
      |                  ^ Error: page.goto: Test timeout of 60000ms exceeded.
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