import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lo que está cerrado no se indexa, y se dice en los TRES sitios que hacen falta.
 *
 * <p><b>Qué se rompía.</b> Nada visible, otra vez. El 28-sep-2026, al cotejar lo que anuncia el sitio
 * con lo que de verdad está abierto en internet, salieron dos familias de direcciones que responden
 * 200 a cualquiera y no llevan a ningún sitio:
 *
 * <ul>
 * <li>Los trece atajos de la raíz que redirigen al panel —`/academy`, `/productos`, `/usuarios`…—. El
 *     build los escribe como páginas «Redirecting» vacías, sin una línea de descripción, así que lo
 *     único indexable en ellas era el MAPA del back-office.
 * <li>Las pantallas que exigen sesión —el listado, los favoritos, el perfil, la cesta, los pedidos,
 *     el monedero, los tickets—. Su HTML lo monta el navegador, de modo que lo que un buscador lee en
 *     TODAS es el `index.html` de relleno: una veintena de direcciones distintas compitiendo entre sí
 *     con el título y la descripción de la portada, y ninguna abrible sin cuenta.
 * </ul>
 *
 * <p><b>Por qué tres capas y no una.</b> `robots.txt` impide el rastreo pero no el indexado de lo ya
 * rastreado; la cabecera `X-Robots-Tag` de nginx sí, y llega a quien no ejecuta JavaScript; la
 * etiqueta `<meta name="robots">` que pone Angular es la única que se ve en el documento y la única
 * que sigue valiendo al navegar dentro de la aplicación. Las tres tienen que decir lo MISMO: lo que
 * falló la primera vez fue precisamente eso, que la lista de `robots.txt` estaba partida en dos
 * bloques y divergió —el de Google dejaba abiertos `/login`, `/activate` y `/password-reset`—.
 */
describe('Lo cerrado no se indexa', () => {
  const raiz = join(__dirname, '..', '..', '..', '..');
  const robots = readFileSync(join(raiz, 'public', 'robots.txt'), 'utf8');
  const nginx = readFileSync(join(raiz, 'nginx.conf'), 'utf8');

  /** Los `Disallow` de un bloque de `User-agent`, en el orden en que aparecen. */
  function vetadoPor(agente: string): string[] {
    const bloques = robots.split(/^User-agent:\s*/m).slice(1);
    const mio = bloques.find((b) => b.split('\n')[0].trim() === agente);
    expect(mio, `no hay bloque para ${agente}`).toBeDefined();
    return (mio ?? '')
      .split('\n')
      .filter((l) => l.startsWith('Disallow:'))
      .map((l) => l.replace('Disallow:', '').trim());
  }

  /**
   * LA prueba de la divergencia. Si algo no se indexa, no se indexa para nadie: tener una lista por
   * buscador es tener dos listas, y la segunda se queda atrás sin que nadie se entere.
   */
  it('veta lo mismo a Google, a Bing y al resto', () => {
    const google = vetadoPor('Googlebot');

    expect(vetadoPor('Bingbot')).toEqual(google);
    expect(vetadoPor('*')).toEqual(google);
    expect(google.length).toBeGreaterThan(30);
  });

  /**
   * La cabecera y el fichero tienen que cubrir lo mismo. Las dos excepciones están documentadas en el
   * propio `nginx.conf`: `/api/` no pasa por este `map` —tiene su propia cabecera, más severa— y
   * `/login` se queda fuera para no tapar el retorno del acceso con Google, que entra por
   * `/login/oauth2/`.
   */
  it('la cabecera de nginx cubre lo mismo que robots.txt', () => {
    const mapa = nginx.slice(nginx.indexOf('map $request_uri $etiqueta_robots'));
    const conCabecera = new Set(
      [...mapa.slice(0, mapa.indexOf('\n}')).matchAll(/\(([a-z0-9|/-]+)\)\(/g)]
        .flatMap((m) => m[1].split('|'))
        .map((p) => `/${p}`),
    );
    const fuera = ['/api/', '/login'];

    for (const ruta of vetadoPor('*')) {
      if (fuera.includes(ruta)) {
        continue;
      }
      expect(conCabecera.has(ruta), `${ruta} está en robots.txt pero no en el map de nginx`).toBe(
        true,
      );
    }
    for (const ruta of conCabecera) {
      expect(vetadoPor('*').includes(ruta), `${ruta} lleva cabecera pero no está en robots.txt`).toBe(
        true,
      );
    }
  });

  /**
   * El `sitemap.xml` no puede pedir que se indexe algo que `robots.txt` prohíbe rastrear: es una
   * contradicción que Google reporta como error y que deja el sitio pidiendo lo que él mismo niega.
   */
  it('no pide indexar nada de lo que veta', () => {
    const sitemap = readFileSync(join(raiz, 'public', 'sitemap.xml'), 'utf8');
    const pedidas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].replace(/^https?:\/\/[^/]+/, ''),
    );
    expect(pedidas.length).toBeGreaterThan(0);

    for (const ruta of pedidas) {
      const vetada = vetadoPor('*').filter((v) => ruta === v || ruta.startsWith(`${v}/`));
      const permitida = ruta.startsWith('/catalog/');
      expect(vetada.length === 0 || permitida, `${ruta} está en el sitemap y vetada por ${vetada}`).toBe(
        true,
      );
    }
  });

  /**
   * Y la tercera capa: toda ruta con guardián declara `privada: true`, ella o un antepasado suyo.
   *
   * <p>Dos excepciones, y las dos a propósito:
   *
   * <ul>
   * <li><b>la ficha de producto</b> — su HTML se prerenderiza con título, foto y precio propios y
   *     nginx le inyecta el `<head>` fresco, todo para que el enlace se pueda compartir. Cerrarla
   *     tiraría por tierra ese montaje entero.
   * <li><b>el alta</b> — `soloSinSesion` no es un cierre: es la página a la que se quiere llegar
   *     desde un buscador.
   * </ul>
   *
   * <p>Lo que cuelga de `/admin` no se comprueba aquí: la marca la lleva la ruta padre en
   * `app.routes.ts` y se hereda hacia las hijas, también a través de la carga en diferido.
   */
  it('toda ruta con guardián se declara privada', () => {
    const excepciones = ["path: 'catalog/:slug'", "path: 'register'"];

    for (const fichero of ficherosDeRutas(join(raiz, 'src', 'app'))) {
      if (fichero.includes(join('features', 'admin'))) {
        continue;
      }
      const texto = readFileSync(fichero, 'utf8');
      for (const guardian of [...texto.matchAll(/canActivate:\s*\[(exigeSesion|exigeRol)/g)]) {
        const propia = objetoQueContiene(texto, guardian.index);
        if (excepciones.some((e) => propia.includes(e))) {
          continue;
        }
        expect(
          declaraPrivado(texto, guardian.index),
          `${fichero}: ruta con guardián sin 'privada: true' → ${primeraRuta(propia)}`,
        ).toBe(true);
      }
    }
  });

  /** Cierto si la ruta que contiene esa posición, o alguna que la envuelva, se declara privada. */
  function declaraPrivado(texto: string, posicion: number): boolean {
    for (const marca of [...texto.matchAll(/privada:\s*true/g)]) {
      // La marca vive dentro de `data: { … }`, que es un objeto con sus propias llaves: el literal
      // más pequeño que la contiene es ESE, no la ruta. Hay que subir un nivel, o la comprobación
      // pasaría a comparar la marca consigo misma y ninguna ruta saldría cubierta.
      const [datos] = limitesDelObjeto(texto, marca.index);
      const [desde, hasta] = limitesDelObjeto(texto, Math.max(datos - 1, 0));
      if (desde <= posicion && posicion <= hasta) {
        return true;
      }
    }
    return false;
  }

  function objetoQueContiene(texto: string, posicion: number): string {
    const [desde, hasta] = limitesDelObjeto(texto, posicion);
    return texto.slice(desde, hasta);
  }

  /** El literal de objeto MÁS PEQUEÑO que contiene esa posición: la ruta, no el fichero. */
  function limitesDelObjeto(texto: string, posicion: number): [number, number] {
    let desde = -1;
    let nivel = 0;
    for (let i = posicion; i >= 0; i--) {
      if (texto[i] === '}') {
        nivel++;
      } else if (texto[i] === '{') {
        if (nivel === 0) {
          desde = i;
          break;
        }
        nivel--;
      }
    }
    let hasta = texto.length;
    nivel = 0;
    for (let i = posicion; i < texto.length; i++) {
      if (texto[i] === '{') {
        nivel++;
      } else if (texto[i] === '}') {
        if (nivel === 0) {
          hasta = i;
          break;
        }
        nivel--;
      }
    }
    return [desde, hasta];
  }

  function primeraRuta(objeto: string): string {
    return /path:\s*'[^']*'/.exec(objeto)?.[0] ?? '(sin path)';
  }

  function ficherosDeRutas(directorio: string): string[] {
    return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
      const camino = join(directorio, entrada.name);
      if (entrada.isDirectory()) {
        return ficherosDeRutas(camino);
      }
      return entrada.name.endsWith('.routes.ts') ? [camino] : [];
    });
  }
});
