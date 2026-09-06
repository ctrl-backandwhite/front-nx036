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

## 3 bis. Piezas improvisadas que hay que subir al sistema de diseño

Cada equipo, al no existir aún su equivalente en `@ds`, hizo una versión mínima dentro de su contexto y
la dejó marcada. Hay que recorrerlas y unificarlas, o acabarán divergiendo:

- [ ] `paginacion` (panel · logística) → `@ds`.
- [ ] `insignia-estado` (panel · logística y gestión) → una sola, con **un solo** mapa de colores.
- [ ] `rastro-del-envio` (panel · logística) — la misma pieza que usa la ficha del comprador en
      `orders`. Está duplicada.
- [ ] `ventana-modal` (cuenta) contra el `Dialogo` del sistema de diseño.

## 3 ter. Cobertura por debajo del umbral

- [ ] `admin/logistica`: agregado 83,9 % de líneas y 69,3 % de funciones, por debajo del 90 % del
      proyecto. Lo arrastran `regiones-fiscales.ts` (59 %) y `tarjeta-de-compra.ts` (69 %).

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

## 6 bis. La hoja de estilos pesa más que la del React — medirlo, no suponerlo

266 kB en bruto (31 kB comprimidos) frente a los 58 kB (9,6 kB) del React. Se descartaron dos causas
midiendo: no son los ficheros de datos (ya excluidos) ni los de prueba (excluirlos cambió 0,3 kB).

Lo que queda arriba del todo son las variantes `sm:`, `md:` y `lg:` —187 reglas entre las tres— y los
componentes de daisyUI que aquí se usan y allí no. La explicación más probable es que **es el precio de
escribir mobile-first de verdad**: cada elemento lleva su clase base para el móvil y sus ampliaciones,
donde el original resolvía con una sola. Si es eso, no es un defecto: es el requisito, y el coste está
en la parte del CSS que mejor se comprime.

- [ ] Confirmarlo en la certificación con la medida real de bytes transferidos por pantalla, que es lo
      que se nota. Si la diferencia comprimida se sostiene, revisar si daisyUI está emitiendo
      componentes que ninguna pantalla usa.

## 7. Verificación final, con la máquina libre

Durante el porte la máquina llegó a **carga 74 con 50 procesos de prueba simultáneos**. En esas
condiciones fallaba un subconjunto distinto en cada pasada, siempre por agotarse el plazo y **nunca por
una aserción**: es el patrón de inestabilidad por carga que ya está documentado en el proyecto. Por eso
la pasada que cuenta se hace al final y en solitario.

Con un matiz importante que aportó el equipo de logística, y que conviene no olvidar: **no todo
timeout es carga**. En su área, los plazos agotados eran la PRIMERA prueba de cada fichero, que carga
la compilación de la plantilla; se resolvían con un plazo explícito, y detrás había ocho fallos reales
(nombres accesibles duplicados, consultas ambiguas, un proveedor que faltaba). Atribuirlo todo a la
carga habría escondido esos ocho. La regla: un timeout se investiga una vez antes de archivarlo como
ruido.

Y un dato técnico que explica el incidente del fichero compartido: **`ng test --include` filtra qué
pruebas se ejecutan, pero el constructor compila el proyecto ENTERO**. Con varios equipos escribiendo a
la vez, eso significa que la pasada de cualquiera aborta por un fichero a medias de otro. No hay forma
de aislarse sin tocar configuración compartida — por eso la verificación final es de quien coordina, y
por eso ningún equipo debería intentar rodearlo por su cuenta.

- [ ] `npx ng lint` — sin errores.
- [ ] `npx ng test` — **mirando el RECUENTO**, no el color. Un verde sin número no prueba nada.
- [ ] `npx ng build` — y comprobar el peso inicial y las rutas prerenderizadas.
- [ ] Cobertura por encima del umbral del proyecto.

## 8. Y entonces, la certificación

Con todo lo anterior cerrado, se ejecuta `docs/CERTIFICACION-E2E.md`: comparación contra el React
corriendo al lado con el mismo backend, en escritorio y en móvil, en las cinco dimensiones.
