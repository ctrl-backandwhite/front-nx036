---
description: Las cuatro trampas que se repiten al escribir componentes aquí, con lo que costó cada una
globs: ["src/app/**/presentation/**", "src/app/design-system/**"]
---

# Componentes

Ninguna de estas da un error claro. Todas se han pagado varias veces.

- **Una comilla invertida dentro de una plantilla la rompe.** La plantilla ya vive dentro de un
  literal de plantilla, así que un backtick en el texto la cierra antes de tiempo. Ha pasado 7
  veces. Si hace falta el carácter, va escapado o fuera de la plantilla.
- **Un componente propio nace `inline`.** El navegador no sabe qué es `<nx-loquesea>` y le da
  `display: inline`: se pinta estrecho, ignora alto y márgenes, y parece un fallo de CSS. Hay que
  darle `display` explícito en el propio componente. Ha pasado 5 veces.
- **`[value]` en un `<select>` pinta la primera opción**, no la que le pasas: compara por
  referencia. Va con `[ngValue]`, o comparando por identidad.
- **Un parche de color escrito sobre la variante de estado no se ve.** El tema oscuro se resuelve
  por tokens; pintar un color a mano encima lo gana el token y queda ilegible en uno de los dos
  temas. Se cambia el token, no el color.

Y lo que no es una trampa sino la norma: **mobile first**, siempre. Se escribe la pantalla estrecha
y se amplía hacia arriba. El detalle está en `CLAUDE.md`.
