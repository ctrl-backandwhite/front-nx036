# Integración pendiente

Lo que queda por juntar cuando los equipos terminen. Sale de sus informes: cada uno se quedó dentro de
su carpeta, como debía, así que las costuras entre contextos las cose quien coordina.

Estado: **abierto**. Última actualización: 6-sep-2026.

---

## 1. Piezas comunes que faltaban en el núcleo — YA RESUELTAS

Tres huecos que provocaron trabajo duplicado en varios equipos a la vez. Ya están escritos; falta
enchufarlos.

| Pieza | Dónde está | Qué sustituye |
|---|---|---|
| `core/auth/sesion-actual.ts` | núcleo | El estado de sesión que `admin` importaba de las tripas de `auth` |
| `core/auth/sesion.guard.ts` + `recuperador-de-sesion.port.ts` | núcleo | **Ocho** guardianes provisionales, uno por equipo |
| `ApiService.descarga()` | núcleo | El `descarga-binaria.ts` propio de `account` (PDF de factura, volcado RGPD) |

El caso del guardián merece quedar escrito: lo puse dentro de `auth`, pero lo necesitan las rutas de la
cuenta, la cesta, el pago, los pedidos, la cartera, los afiliados y el panel. Como la regla de
dependencia prohíbe —con razón— importar de las tripas de otro contexto, **cada equipo se escribió el
suyo**: ocho guardianes parecidos, ninguno idéntico, y ninguna garantía de que todos redirigieran igual.
El error fue de diseño, no de los equipos, y la regla hizo justo su trabajo al delatarlo.

## 2. Costuras por coser

- [ ] **Guardianes**: sustituir los ocho por `exigeSesion`/`exigeRol` de `@core/auth/sesion.guard`, y
      borrar los provisionales de `orders`, `wallet`, `affiliate`, `account`, `cart`, `checkout` y las
      dos áreas del panel.
- [ ] **Registrar el recuperador**: `auth` implementa `RECUPERADOR_DE_SESION` con su caso de uso
      `RecuperaSesion`, y lo declara en `auth.providers.ts`.
- [ ] **Publicar la sesión**: el `SesionStore` de `auth` alimenta a `SesionActual` del núcleo al entrar
      y al salir. Es la única escritura permitida.
- [ ] **Descargas**: `account` pasa a usar `ApiService.descarga()` y borra su copia.
- [ ] **Rutas del panel**: juntar las tres áreas (`catalogo`, `logistica`, `gestion`) en
      `admin.routes.ts` y `admin.server-routes.ts`, con sus tres ficheros de proveedores.
- [ ] **Captura de referido**: montar `<nx-captura-de-referido />` y `proveeAtribucionDeReferido()` en
      la raíz — un enlace de afiliado puede apuntar a cualquier página.
- [ ] **Boletín en la página de afiliados**: el interruptor de preferencias de correo pertenece a
      `notifications` y lo pinta la pantalla de `affiliate`. Como no pueden importarse entre sí, se
      resuelve componiendo en la ruta o subiendo la pieza al sistema de diseño.

## 3. Violaciones de la regla de dependencia por corregir

Detectadas por el lint en trabajo de equipos en marcha. **No se silencian: se arreglan.**

- [ ] `checkout` importa `@features/cart/cart.providers`.
- [ ] `admin` importa `@features/auth/application/state/sesion.store` → pasa a `@core/auth/sesion-actual`.

## 4. Duplicaciones a unificar

- [ ] `ventana-modal` de `account` contra el `Dialogo` del sistema de diseño.
- [ ] Las piezas mínimas que cada equipo improvisó al no existir aún su equivalente en `@ds`. Cada
      informe las trae anotadas; hay que recorrerlas una a una.
- [ ] `DialogoStore.confirma` no acepta etiquetas de botón, aunque el componente sí sabe pintarlas: por
      eso la elección del destino de un reembolso sale con «Confirmar/Cancelar» en vez de «a mi
      billetera / a mi tarjeta».

## 5. Limpieza

- [ ] Borrar los ficheros de configuración sueltos que los equipos crearon para poder verificarse:
      `features/cart/tsconfig.verificacion.json`, `features/orders/tsconfig.verificacion.json`,
      `features/account/tsconfig.spec.json`.

## 6. Repaso de rendimiento

La norma de rendimiento (apartado 7 de `CLAUDE.md`) se escribió **después** de que los equipos
arrancaran, así que hay que recorrer las pantallas aplicándola:

- [ ] `@defer` en lo que queda bajo el pliegue, con `hydrate on viewport` en las páginas prerenderizadas.
- [ ] `NgOptimizedImage` con `priority` en la imagen principal de cada pantalla.
- [ ] `track` por identificador estable en todo `@for`.
- [ ] `data: { precarga: true }` en las rutas que de verdad se visitan mucho.

## 7. Verificación final, con la máquina libre

Durante el porte la máquina llegó a **carga 74 con 50 procesos de prueba simultáneos**. En esas
condiciones fallaba un subconjunto distinto en cada pasada, siempre por agotarse el plazo y **nunca por
una aserción**: es el patrón de inestabilidad por carga que ya está documentado en el proyecto. Por eso
la pasada que cuenta se hace al final y en solitario.

- [ ] `npx ng lint` — sin errores.
- [ ] `npx ng test` — **mirando el RECUENTO**, no el color. Un verde sin número no prueba nada.
- [ ] `npx ng build` — y comprobar el peso inicial y las rutas prerenderizadas.
- [ ] Cobertura por encima del umbral del proyecto.

## 8. Y entonces, la certificación

Con todo lo anterior cerrado, se ejecuta `docs/CERTIFICACION-E2E.md`: comparación contra el React
corriendo al lado con el mismo backend, en escritorio y en móvil, en las cinco dimensiones.
