# Lenguaje visual — tokens de diseño

La paleta, la tipografía y los componentes de NX036. **La fuente de verdad es
[`front-nx036/src/styles.css`](../front-nx036/src/styles.css)**; este documento la explica, no la
sustituye. Si los dos discrepan, manda el CSS.

> Reescrito el 25-sep-2026 contra el código. La versión anterior daba doce colores en `oklch` de una
> paleta pastel que ya no existe, decía que la tipografía era Inter —es Roboto— y apuntaba a
> `frontend/src/index.css`, un fichero de un proyecto retirado.

---

## Cuidado con el nombre del tema

Los temas se llaman **`nx036-pastel`** y **`nx036-pastel-dark`**, pero **ya no son pastel**. El
diseño se rehízo a una identidad «Aduana / Cargo» —cobalto, marino y latón— y el nombre se mantuvo
solo por compatibilidad con `data-theme` y con `theme.ts`. No te fíes del nombre.

daisyUI registra **cuatro** temas: `nx036-pastel` (por defecto), `nx036-pastel-dark` (el del sistema
en oscuro), y `corporate` y `business`, que existen aunque no se usen en el producto.

## Paleta — tema claro

| Token | Valor | Para qué |
|---|---|---|
| `--color-base-100` | `#fcfdfe` | fondo de tarjetas y superficies |
| `--color-base-200` | `#f4f6f9` | fondo de página |
| `--color-base-300` | `#e3e8ef` | bordes y divisores |
| `--color-base-content` | `#14212e` | el texto |
| `--color-primary` | `#0c4a97` | **cobalto profundo** — llamadas a la acción, enlaces, activo |
| `--color-primary-content` | `#eef4fc` | texto sobre cobalto |
| `--color-secondary` | `#123246` | marino acero — botón secundario |
| `--color-accent` | `#c0862d` | **latón** — distintivos y acento premium |
| `--color-info` | `#2e6e8e` | |
| `--color-success` | `#1e6b52` | pino — hay existencias, operación correcta |
| `--color-warning` | `#d9962b` | ámbar |
| `--color-error` | `#b4472e` | ladrillo — error y también rebajas |

El tema oscuro redefine los mismos tokens a partir de la línea 952 de `styles.css`. **No inventes un
color nuevo**: si necesitas uno, sale de esta lista o se añade al tema.

### La trampa del contraste que ya mordió tres veces

Hay una regla que tiñe de `primary` cualquier `.text-primary-content` dentro de una `.card`, pensada
para los precios del catálogo. Ha dejado invisible tres veces un texto que iba **encima** de un
fondo de color, porque lo pintaba del color exacto de su propio fondo. Está acotada, pero si ves un
icono o un texto que desaparece en oscuro, mira ahí primero.

## Tipografía

**Roboto** para el texto y **Roboto Mono** para cifras monoespaciadas. Van **autoalojadas** en
`front-nx036/src/fonts/*.woff2` con `font-display: swap`, no se piden a ningún servicio externo.

## Escala de grises propia

Además de los tokens de daisyUI hay una escala `--color-ink-*`, de `ink-900` (`#14212e`) a `ink-50`
(`#f4f7f9`). **No es gris puro**: lleva un tinte marino para acompañar a la paleta.

Y `--color-brand-*`, que se usa sobre todo en el foco: el `:focus-visible` general del sitio es
`outline: 2px solid var(--color-brand-400)` con dos píxeles de separación.

## Componentes con tratamiento propio

- **Alertas** con borde lateral de 3 px, en sus cuatro variantes.
- **Tablas cebra**, con un tratamiento distinto en oscuro para que la franja no se coma el texto.
- **`badge-trustpass`**, el distintivo de proveedor verificado.
- `bg-brand-50` se invierte en oscuro a `primary` al 22 %.

Hay una página viva con todo esto en **`/admin/styleguide`**; es el sitio más rápido para ver un
cambio de tema aplicado.

## Al tocar `styles.css`

- **Todo el CSS vive ahí.** Ningún componente declara `styles`, `styleUrl` ni `styleUrls`: el lint
  lo impide. Lo que se repite se convierte en una utilidad de `styles.css`, que es donde se corrige
  una sola vez.
- **Los ficheros de datos están fuera del escaneo** de Tailwind (`@source not` sobre `shared/i18n`,
  `shared/data` y `shared/content`). Son prosa en ocho idiomas y Tailwind confundía palabras sueltas
  con utilidades: la hoja pasaba de 58 kB a 105 kB de reglas muertas.
- **El CSS crítico en línea está apagado a propósito** en las cuatro configuraciones que compilan.
  Volver a encenderlo provoca un parpadeo con la maqueta rota; el porqué está en
  `../CLAUDE.md`.
