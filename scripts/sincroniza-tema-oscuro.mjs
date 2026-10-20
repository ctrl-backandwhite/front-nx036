#!/usr/bin/env node
/**
 * Copia el bloque del tema oscuro de la rama ELEGIDA a la rama del SISTEMA.
 *
 * Las correcciones del modo oscuro tienen que estar en dos sitios, porque daisyUI publica la
 * paleta bajo dos selectores: `[data-theme="nx036-pastel-dark"]` para quien eligió el tema, y
 * `:root:not([data-theme])` dentro de `prefers-color-scheme: dark` para quien no eligió nada y
 * trae el equipo en oscuro. `app.ts` quita el atributo en ese segundo caso, a propósito.
 *
 * `src/styles-contraste.spec.ts` comprueba que las dos ramas son idénticas, pero solo DETECTA la
 * desincronización. Esto la evita: se edita la rama de arriba —la del atributo, que es la que se
 * lee al trabajar— y esto regenera la de abajo.
 *
 *   node scripts/sincroniza-tema-oscuro.mjs            comprueba y dice si hay que sincronizar
 *   node scripts/sincroniza-tema-oscuro.mjs --escribe  sincroniza
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RUTA = new URL('../src/styles.css', import.meta.url);
const ESCRIBE = process.argv.includes('--escribe');

const INICIO_ELEGIDO = '/* ⟦OSCURO:ELEGIDO:INICIO⟧ */';
const FIN_ELEGIDO = '/* ⟦OSCURO:ELEGIDO:FIN⟧ */';
const INICIO_SISTEMA = '/* ⟦OSCURO:SISTEMA:INICIO⟧ */';
const FIN_SISTEMA = '/* ⟦OSCURO:SISTEMA:FIN⟧ */';

const css = readFileSync(RUTA, 'utf8');

/** El texto entre dos marcadores, sin los marcadores. */
function entre(inicio, fin) {
  const a = css.indexOf(inicio);
  const b = css.indexOf(fin);
  if (a < 0 || b < a) {
    console.error(`No encuentro los marcadores ${inicio} … ${fin} en src/styles.css`);
    process.exit(2);
  }
  return css.slice(a + inicio.length, b);
}

/**
 * El cuerpo de dentro de `profundidad` envoltorios, emparejando llaves.
 *
 * Con expresiones regulares no sale: la rama del sistema cierra DOS llaves —la regla y la media
 * query— y la del atributo una, así que recortar «la última» deja una de más en un lado.
 */
function cuerpo(texto, profundidad) {
  let desde = 0;
  let hasta = texto.length;
  for (let nivel = 0; nivel < profundidad; nivel++) {
    desde = texto.indexOf('{', desde) + 1;
    let abiertas = 1;
    let i = desde;
    while (i < texto.length && abiertas > 0) {
      if (texto[i] === '{') abiertas++;
      else if (texto[i] === '}') abiertas--;
      i++;
    }
    hasta = i - 1;
  }
  return texto.slice(desde, hasta);
}

const deElegido = cuerpo(entre(INICIO_ELEGIDO, FIN_ELEGIDO), 1);
const deSistema = cuerpo(entre(INICIO_SISTEMA, FIN_SISTEMA), 2);

const igual = (a, b) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

if (igual(deElegido, deSistema)) {
  console.log('Las dos ramas del tema oscuro ya están sincronizadas.');
  process.exit(0);
}

if (!ESCRIBE) {
  console.error('Las dos ramas del tema oscuro DIFIEREN.');
  console.error('Edita siempre la rama del atributo y luego:');
  console.error('  node scripts/sincroniza-tema-oscuro.mjs --escribe');
  process.exit(1);
}

// La rama del sistema va un nivel más adentro, así que el cuerpo se sangra dos espacios más.
const sangrado = deElegido
  .split('\n')
  .map((linea) => (linea.trim() ? `  ${linea}` : linea))
  .join('\n');

const bloqueNuevo = `${INICIO_SISTEMA}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {${sangrado}  }
}
${FIN_SISTEMA}`;

const a = css.indexOf(INICIO_SISTEMA);
const b = css.indexOf(FIN_SISTEMA) + FIN_SISTEMA.length;
writeFileSync(RUTA, css.slice(0, a) + bloqueNuevo + css.slice(b));
console.log('Rama del sistema regenerada desde la del atributo.');
