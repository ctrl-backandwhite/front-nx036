---
description: Las cuatro trampas que se repiten al escribir componentes aquí, con lo que costó cada una
globs: ["src/app/**/presentation/**", "src/app/design-system/**"]
---

# Componentes

Ninguna de estas da un error claro. Todas se han pagado varias veces.

- **Una comilla invertida dentro de una plantilla la rompe.** La plantilla ya vive dentro de un
  literal de plantilla, así que un backtick en el texto la cierra antes de tiempo. Ha pasado 8
  veces. Si hace falta el carácter, va escapado o fuera de la plantilla.
  La octava fue en un COMENTARIO HTML, no en texto visible —citando nombres de clase entre
  backticks, como se escribe en los comentarios de TypeScript—, y el error que salió no menciona
  la comilla: dice «Argument expression expected» y señala el cierre del decorador, 130 líneas más
  abajo. Y van dos trampas en el mismo comentario, porque un comentario HTML tampoco puede ir
  DENTRO de una etiqueta, entre atributos.
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
