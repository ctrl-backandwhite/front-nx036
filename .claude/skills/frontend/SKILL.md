---
name: frontend
description: Trabajo en el escaparate y el panel NX036 (Angular, Vitest, Playwright, Tailwind). Cubre cómo se lanzan las pruebas, qué abarca el lint, las ocho traducciones obligatorias y las trampas del renderizado en servidor, que dan fallos sin mencionar su causa. Actívalo ante peticiones sobre el escaparate, el catálogo, la ficha de producto, el panel de administración, un componente o una pantalla.
---

# Frontend NX036

Las NORMAS (arquitectura hexagonal, SOLID, mobile first, CSS centralizado, qué se usa de Angular)
están en `CLAUDE.md`, 396 líneas que se cargan solas. Esto es lo PROCEDIMENTAL.

## Comandos

```bash
npm test                                          # ng test — 411 ficheros, ~3.983 pruebas, ~50 s
npm test -- --include src/ruta/fichero.spec.ts    # UN fichero: 35 s en vez de 290
npm run lint                                      # ng lint
npx eslint e2e/                                   # el lint de ng NO mira aquí (ver abajo)
```

**NUNCA `npx vitest run`.** Falla en 397 de 421 ficheros con `Need to call
TestBed.initTestEnvironment() first`, porque el entorno de Angular lo monta el constructor de
`ng test`, no vitest. La pista está en el resumen: **`setup 0ms`** en vez de varios segundos. No es
un fallo del código ni de la versión de Node, y se pierde un buen rato buscándolo donde no está.

**`ng lint` solo abarca `src/**`** (`lintFilePatterns` en `angular.json`). Lo que hay en `e2e/` no lo
mira nadie en CI: un error de estilo ahí no rompe la construcción pero sí salta al pasar eslint a
mano. Si tocas `e2e/`, pásale eslint tú.

## Toda cadena va en los OCHO idiomas

`src/app/shared/i18n/dictionary/{es,en,pt,fr,it,de,nl,zh}.ts`. Se usan **claves, no textos**, también
en los títulos y descripciones que cada ruta declara para SEO. `t(clave)` devuelve la propia clave
cuando falta: si en pantalla ves `catalog.filters.algo`, es que la traducción no existe.

## Trampas del navegador, todas medidas

Las cuatro dan fallos que **no mencionan su causa**, y las tres primeras están ya resueltas en
`e2e/certificacion/sesion-certificada.ts`:

1. **La hidratación vacía los formularios.** La página llega renderizada del servidor y Angular la
   hidrata después, reiniciando los controles. Rellenar y enviar antes manda el formulario EN
   BLANCO: ni alerta ni navegación, solo tiempo agotado, y de forma intermitente. Escribir y
   *comprobar* que el valor quedó NO basta: la hidratación llega después de esa comprobación. Lo que
   funciona es reintentar el ciclo entero —escribir, enviar, ver si navega— con `toPass`.
2. **La guía de bienvenida del asistente se planta en medio** con un velo a pantalla completa
   (`fixed inset-0`) que intercepta los clics. El fallo sale como «no se pudo pulsar», sin mencionar
   al asistente. Se siembra respondida poniendo `nx036.welcome.v1` en `localStorage`.
3. **El primer listado NO genera petición XHR**: llega renderizado del servidor. Esperar su
   respuesta se agota sin que nada esté roto. El total se lee del contador de la pantalla
   (`data-testid="contador-del-catalogo"`); el de después de pulsar un filtro sí sale de la API.
4. **El contador parpadea a «0 / 0»** medio segundo tras pulsar un filtro. Una espera que solo pida
   «un valor distinto al de partida» captura el parpadeo y acusa al filtro de devolver cero estando
   sano. Pasó, y costó una vuelta de diagnóstico.

Otras que se repiten al escribir componentes:

- **Una comilla invertida dentro de una plantilla la rompe** — ha pasado 7 veces.
- **Un componente propio nace `inline`**: hay que darle `display` o se pinta mal. (5 veces)
- **`[value]` en un `<select>` pinta la primera opción**, no la que crees; va con `[ngValue]` o
  comparando por identidad.
- **Cualquier librería que inyecte estilos por JS rompe el prerenderizado.**

## Certificar en el navegador

```bash
# Desde backend/certificacion — da de alta el comprador, certifica y lo borra
python3 cert_busqueda_navegador.py pre|pro [--spec <ruta>] [--solo <patrón>] [--conserva]
```

El catálogo exige cuenta desde el 11-sep-2026, así que certificar crea y retira un comprador real.

**Los datos sobre los que se apoya una prueba se miden en el entorno donde va a correr.** El catálogo
de producción es seis veces menor que el de preproducción y no tiene las mismas familias: un término
con 51 fichas en PRE puede tener CERO en PRO, y la prueba falla por falta de catálogo mientras
parece que se rompió la funcionalidad.
