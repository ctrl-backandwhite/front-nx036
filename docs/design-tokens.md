# Lenguaje visual — tokens de diseño

La paleta, la tipografía y los componentes de NX036. **La fuente de verdad es
[`front-nx036/src/styles.css`](../front-nx036/src/styles.css)**; este documento la explica, no la
sustituye. Si los dos discrepan, manda el CSS.

> Reescrito el 25-sep-2026 contra el código. La versión anterior daba doce colores en `oklch` de una
> paleta pastel que ya no existe, decía que la tipografía era Inter —es Roboto— y apuntaba a
> `frontend/src/index.css`, un fichero de un proyecto retirado.

---

## Cuidado con el nombre del tema

Los temas se llaman **`nx036-pastel`** y **`nx036-pastel-dark`**, pero **ya no son ni pastel ni
"Aduana/Cargo"**. El 23-oct-2026 el diseño se rehízo a una identidad de **comercio electrónico con
color**: **primario gris-azulado** (`primary`) + acento **violeta** (`accent`), sobre neutros
gris-azulados para texto y superficies, y semánticos vivos (esmeralda/ámbar/rojo/azul). El gris es
solo el fondo; el color lo llevan la marca y los estados. El nombre del tema se mantuvo solo por
compatibilidad con `data-theme` y con `theme.ts`. No te fíes del nombre.

daisyUI registra **cuatro** temas: `nx036-pastel` (por defecto), `nx036-pastel-dark` (el del sistema
en oscuro), y `corporate` y `business`, que existen aunque no se usen en el producto.

## Paleta — tema claro

| Token | Valor | Para qué |
|---|---|---|
| `--color-base-100` | `#ffffff` | fondo de tarjetas y superficies |
| `--color-base-200` | `#f6f7f9` | fondo de página |
| `--color-base-300` | `#ebedf2` | bordes y divisores |
| `--color-base-content` | `#1f2937` | el texto (gris-azulado) |
| `--color-primary` | `#1f2937` | **gris-azulado** — llamadas a la acción, enlaces, activo |
| `--color-primary-content` | `#ffffff` | texto sobre primary |
| `--color-secondary` | `#636d80` | gris medio — botón secundario neutro |
| `--color-accent` | `#8b5cf6` | **violeta** — destaques (IA, recompensas), promociones |
| `--color-info` | `#2563eb` | azul informativo |
| `--color-success` | `#10b981` | esmeralda — hay existencias, operación correcta |
| `--color-warning` | `#f59e0b` | ámbar |
| `--color-error` | `#ef4444` | rojo — error y también rebajas |

El tema oscuro redefine los mismos tokens en su bloque `@plugin "daisyui/theme"` (`nx036-pastel-dark`)
y en el bloque de correcciones marcado `⟦OSCURO⟧` de `styles.css`. **No inventes un color nuevo**: si
necesitas uno, sale de esta lista o se añade al tema.

### La trampa del contraste que ya mordió tres veces

Hay una regla que tiñe de `primary` cualquier `.text-primary-content` dentro de una `.card`, pensada
para los precios del catálogo. Ha dejado invisible tres veces un texto que iba **encima** de un
fondo de color, porque lo pintaba del color exacto de su propio fondo. Está acotada, pero si ves un
icono o un texto que desaparece en oscuro, mira ahí primero.

## Tipografía

**Roboto** para el texto y **Roboto Mono** para cifras monoespaciadas. Van **autoalojadas** en
`front-nx036/src/fonts/*.woff2` con `font-display: swap`, no se piden a ningún servicio externo.

## Escala de grises propia

Además de los tokens de daisyUI hay una escala `--color-ink-*`, de `ink-900` (`#1f2937`) a `ink-50`
(`#f6f7f9`). Es el **gris-azulado neutro** para texto, bordes y superficies; el color de la tienda lo
llevan el `accent` (violeta), los estados y las fotos de producto, no `ink`.

**La escala está completa, y tiene que seguir estándolo.** Durante un tiempo faltaron tres peldaños
—`ink-400`, `ink-600` e `ink-800`— aunque el código los usaba 214 veces. Un peldaño sin declarar no
genera su utilidad, y entonces `color` no se escribe y el texto hereda el del padre; con los bordes
es peor, porque `border-color` cae en `currentColor` y el borde sale al máximo contraste. Y el fallo
se veía **solo en el tema claro**, porque el bloque del oscuro los declara a mano más abajo.

| Peldaño | Claro | Contraste sobre `base-100` | Para qué |
|---|---|---:|---|
| `ink-900` | `#1f2937` | 14,7:1 | títulos |
| `ink-800` | `#383e48` | 10,9:1 | |
| `ink-700` | `#404754` | 9,3:1 | texto principal |
| `ink-600` | `#4f5868` | 7,2:1 | |
| `ink-500` | `#636d80` | 5,5:1 | texto de apoyo, enlaces tenues |
| `ink-400` | `#6b7280` | 4,8:1 | texto apagado: pies, rótulos, listas vacías |
| `ink-300` | `#adb4c0` | 1,9:1 | solo decorativo: no llega ni al mínimo no textual |

**`ink-400` es el texto apagado, y su listón es 4,5:1, no 3:1.** Hay **134 usos y los 134 son
`text-ink-400`** —mensajes de lista vacía, rótulos, pies de tabla—. Con la identidad gris-azulada
vale `#6b7280` (el `muted-foreground` de Ecomerce): da 4,8:1 sobre `base-100` y sigue más claro que
el `500` (`#636d80`), así que la rampa no se cruza. En el tema oscuro su gemelo va en `oklch(63%)`
por el mismo motivo. Lo vigila `styles-contraste.spec.ts`.

Y `--color-brand-*` —la rampa **gris-azulada** a juego con `primary`—, que se usa sobre todo en el foco:
el `:focus-visible` general del sitio es `outline: 2px solid var(--color-brand-400)` con dos píxeles
de separación.

## Las opacidades se multiplican

Es la causa de casi todo el texto ilegible que quedaba, y no se ve leyendo la plantilla.

El texto apagado llega ya con **alfa en el color** —`base-content/80` en el pie, `/60` en
`stat-desc`, `/50` en una pestaña inactiva— y encima el elemento añade su propia `opacity`. El
navegador las multiplica:

| | alfa del color | × `opacity` | efectivo | medido |
|---|---:|---:|---:|---:|
| pie, `<p class="opacity-70">` | 0,80 | 0,70 | **0,56** | 3,75:1 |
| pie, `h6.footer-title` | 0,80 | 0,60 | **0,48** | 2,98:1 |

Lo que engaña: **`opacity-70` por sí sola no es el problema.** Sobre `base-content` entero da
6,01:1 y pasa de sobra; hay 212 usos en la aplicación y están bien. Lo que falla es el SEGUNDO
apagado sobre algo ya apagado, y el culpable casi nunca es el elemento que la herramienta señala
—hay que mirar la cadena de ancestros con opacidad—.

Las piezas de daisyUI que lo traen de fábrica se corrigen en `styles.css`: se les quita la opacidad
y se les da `ink-500`, que ya está medido en los dos temas.

**Y el caso que se escapa al razonamiento anterior: un contenedor con opacidad que envuelve un
ENLACE.** «`opacity-70` está bien porque sobre `base-content` da 6,01:1» es cierto para el texto, y
falso para el enlace que hay dentro: su color no es `base-content` sino `primary`, que parte de más
abajo. En `/login`, `<div class="text-sm opacity-70">` dejaba «Regístrate» en 4,01:1 mientras el
texto que lo rodea pasaba de sobra.

Cuesta verlo porque los dos elementos comparten contenedor y solo uno falla. Y cuesta MEDIRLO: al
inspeccionar a mano `a.link-primary` en esa página sale el primero, «¿Olvidaste tu contraseña?»,
que no tiene opacidad encima y mide 8,44:1 — con lo que el fallo parece un falso positivo de la
herramienta. No lo era. Si una herramienta señala un elemento, hay que mirar ESE elemento.

La regla: **un contenedor que envuelve un enlace no se apaga con `opacity`.** Se apaga el texto con
su token y el enlace se queda entero.

Y una regla que no admite excepción: **`opacity-40` sobre texto no es recuperable.** Ni con negro
puro sobre la superficie más clara pasa de 2,82:1, ni con blanco puro sobre la oscura de 3,69:1.
No hay token que lo salve: si el texto hay que leerlo, no se apaga al 40 %.

## Superficies que NO se invierten

Un bloque de código es oscuro en una página clara y en una oscura; el botón de un cartel
promocional es claro en las dos. No son escalas invertibles: son **parejas fondo/texto fijas**, y
van con los tokens `scrim` / `scrim-content`, nunca con la escala `ink`.

Escribirlo con `ink` funciona mientras la escala tiene un solo juego de valores y se rompe el día
que se invierte por tema. Pasó: `bg-ink-900 text-ink-50` dejaba el bloque de código CLARO sobre una
página oscura, con sus pestañas a **1,15:1**, y el mismo fallo en el botón de `cartel-promociones`
(`bg-white` no se invierte, `text-ink-900` sí). La utilidad es `superficie-codigo`.

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
