import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Un componente propio que cuelga de un contenedor con `space-y` tiene que nacer en BLOQUE.
 *
 * <p>QUÉ SE ROMPE. Un elemento personalizado —`<nx-loquesea>`— nace `display: inline`, y un elemento
 * inline IGNORA los márgenes verticales. En Tailwind 4, `space-y-*` reparte el hueco poniendo MARGEN
 * INFERIOR en cada hijo menos el último, así que si ese hijo es inline el margen no existe y el
 * bloque siguiente se le echa encima.
 *
 * <p>No da error de consola ni rompe nada: solo dos cosas pegadas que hay que ver para descubrir. En
 * la portada, el cartel de rebajas solapaba el título de «Tendencia ahora».
 *
 * <p><b>Es la sexta vez que pasa en este proyecto</b>, con seis componentes distintos y seis
 * comentarios explicándolo por separado. Esta prueba existe para que no haya una séptima: en vez de
 * confiar en que el siguiente se acuerde, se comprueba sola.
 *
 * <p>Solo mira los contenedores con `space-y`. Dentro de un `flex` o un `grid` el navegador convierte
 * a sus hijos en bloques por su cuenta, así que ahí un host inline no molesta y exigirlo sería ruido.
 */
describe('Los componentes bajo un contenedor con space-y nacen en bloque', () => {
  const RAIZ = join(process.cwd(), 'src/app');

  function ficheros(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return ficheros(p);
      return p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
    });
  }

  const fuentes = ficheros(RAIZ).map((p) => ({ ruta: p, texto: readFileSync(p, 'utf8') }));

  /** Qué selector declara cada fichero, si declara alguno. */
  const selectorDe = new Map<string, string>();
  /** Y cuáles nacen ya en bloque —o en `contents`, que también deja pasar el margen al hijo—. */
  const enBloque = new Set<string>();
  /**
   * Y cuáles RENDERIZAN un bloque: su plantilla empieza por `<section>`, `<div>`, `<form>`…
   *
   * <p>Solo esos importan. Un componente cuya raíz es un `<span>` —una insignia, un icono— está bien
   * siendo inline, y exigirle `block` sería ruido que acabaría haciendo ignorar esta prueba entera.
   * Sin este filtro la lista salía de 146 componentes; con él, de 115, y todos eran de verdad.
   */
  const raizDeBloque = new Set<string>();
  const ETIQUETAS_DE_BLOQUE = new Set([
    'section', 'article', 'div', 'form', 'table', 'ul', 'ol', 'nav', 'aside', 'header', 'footer',
    'main', 'p', 'h1', 'h2', 'h3',
  ]);
  for (const { texto } of fuentes) {
    const sel = texto.match(/selector:\s*'(nx-[a-z0-9-]+)'/);
    if (!sel) continue;
    selectorDe.set(sel[1], sel[1]);
    if (/host:\s*\{[^}]*class:\s*'[^']*\b(block|contents|flex|grid|inline-block)\b/.test(texto)) {
      enBloque.add(sel[1]);
    }
    const plantilla = texto.match(/template:\s*`([\s\S]*?)`,\n/);
    if (plantilla) {
      const cuerpo = plantilla[1].replace(/<!--[\s\S]*?-->/g, '').replace(/@\w+\s*\([^)]*\)\s*\{/g, '');
      const primera = cuerpo.match(/<([a-z][a-z0-9-]*)/);
      if (primera && ETIQUETAS_DE_BLOQUE.has(primera[1])) raizDeBloque.add(sel[1]);
    }
  }

  /**
   * Los hijos DIRECTOS de un contenedor con `space-y`, leídos de la plantilla.
   *
   * <p>Se busca la etiqueta de apertura con `space-y` y se recogen los `<nx-…>` que aparecen hasta el
   * cierre de ese contenedor, contando anidamientos para no colarse en uno de dentro.
   */
  function hijosDeContenedoresConSpaceY(texto: string): string[] {
    const salida: string[] = [];
    const re = /<(div|section|aside|main)\b[^>]*\bclass="[^"]*\bspace-y-/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) {
      const etiqueta = m[1];
      let i = texto.indexOf('>', m.index);
      let hondo = 1;
      const abre = new RegExp(`<${etiqueta}\\b`, 'g');
      const cierra = new RegExp(`</${etiqueta}>`, 'g');
      abre.lastIndex = cierra.lastIndex = i;
      while (hondo > 0) {
        const a = abre.exec(texto);
        const c = cierra.exec(texto);
        if (!c) break;
        if (a && a.index < c.index) {
          hondo++;
          cierra.lastIndex = c.index;
        } else {
          hondo--;
          i = c.index;
          abre.lastIndex = i;
        }
      }
      const dentro = texto.slice(m.index, i);
      for (const h of dentro.matchAll(/<(nx-[a-z0-9-]+)/g)) salida.push(h[1]);
    }
    return salida;
  }

  it('ningún componente propio cuelga de un space-y sin declararse bloque', () => {
    const fallos: string[] = [];
    for (const { ruta, texto } of fuentes) {
      for (const hijo of new Set(hijosDeContenedoresConSpaceY(texto))) {
        if (!selectorDe.has(hijo)) continue; // no es nuestro: un elemento del navegador
        if (enBloque.has(hijo)) continue;
        if (!raizDeBloque.has(hijo)) continue; // su raíz es inline: que el host lo sea está bien
        fallos.push(`${hijo} dentro de ${ruta.replace(process.cwd() + '/', '')}`);
      }
    }
    expect(fallos, 'estos componentes ignorarán el margen de su contenedor:\n' + fallos.join('\n'))
      .toEqual([]);
  });

  /** El control: si la prueba no encuentra nada que mirar, no está probando nada. */
  it('la prueba encuentra contenedores con space-y que revisar', () => {
    const total = fuentes.reduce((n, f) => n + hijosDeContenedoresConSpaceY(f.texto).length, 0);
    expect(total, 'sin componentes propios bajo un space-y, esta prueba sería decorativa')
      .toBeGreaterThan(0);
  });
});
