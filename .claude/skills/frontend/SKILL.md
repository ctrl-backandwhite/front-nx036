---
name: frontend
description: Trabajo en el escaparate y el panel NX036 (Angular, Vitest, Playwright, Tailwind). Cubre cómo se lanzan las pruebas, qué abarca el lint, las ocho traducciones obligatorias y las trampas del renderizado en servidor, que dan fallos sin mencionar su causa. Actívalo ante peticiones sobre el escaparate, el catálogo, la ficha de producto, el panel de administración, un componente o una pantalla.
---

# Frontend NX036

Las NORMAS (arquitectura hexagonal, SOLID, mobile first, CSS centralizado, qué se usa de Angular)
están en `CLAUDE.md`, 396 líneas que se cargan solas. Esto es lo PROCEDIMENTAL.

## Comandos

`npm test` y `npm run lint` están en `README.md` y no se repiten aquí. Lo que allí no está:

```bash
npm test -- --include src/ruta/fichero.spec.ts    # UN fichero: 35 s en vez de 290
npx eslint e2e/                                   # el lint de ng NO mira esa carpeta
```

**NUNCA `npx vitest run`.** Falla en 397 de 421 ficheros con `Need to call
TestBed.initTestEnvironment() first`, porque el entorno de Angular lo monta el constructor de
`ng test`, no vitest. La pista está en el resumen: **`setup 0ms`** en vez de varios segundos. No es
un fallo del código ni de la versión de Node, y se pierde un buen rato buscándolo donde no está.

**`ng lint` solo abarca `src/**`** (`lintFilePatterns` en `angular.json`): un error de estilo en
`e2e/` no rompe la construcción pero sí salta al pasar eslint a mano.

## Trampas

Las del **navegador** —hidratación que vacía formularios, el velo del asistente, el primer listado
sin XHR y el parpadeo del contador— están en `.claude/rules/pruebas-e2e.md`, que se carga solo al
tocar `e2e/`. Las de **escribir componentes** —la comilla invertida, el elemento que nace inline,
`[value]` en un `<select>`, los estilos por JS— en `.claude/rules/componentes.md`.

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
