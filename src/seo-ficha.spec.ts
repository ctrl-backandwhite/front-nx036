import {
  direccionCanonica,
  escapa,
  etiquetas,
  imagenPrincipal,
  inyecta,
  limpia,
  recorta,
} from '../seo-ficha.js';

/**
 * Las etiquetas para compartir que la PASARELA mete en el HTML de una ficha.
 *
 * <p>Este fichero es njs —JavaScript dentro de nginx—, vive fuera de `src/` y hasta ahora no lo probaba
 * nadie: se verificaba a mano con `curl` y un guion de usar y tirar. Y es de lo más delicado que tiene
 * el proyecto, porque se ejecuta en TODAS las peticiones de ficha y compone marcado a base de sustituir
 * texto. Lo que puede salir mal no da error: da una vista previa rota, un canónico que apunta a otro
 * dominio, o una página sin estilos.
 *
 * <p>Se prueban las funciones puras. `ficha()` orquesta subpeticiones de nginx y lecturas de disco; su
 * comportamiento —que nunca puede tumbar una ficha— se verifica contra la pasarela de verdad.
 *
 * <p>Esta batería vive bajo `src/` y el fichero que prueba está en la raíz del proyecto. No es un
 * descuido: el constructor de pruebas busca los `*.spec.ts` a partir de `src/`, así que una batería en
 * la raíz sencillamente no se ejecutaría — y una batería que no se ejecuta es peor que ninguna, porque
 * parece cobertura.
 */
describe('seo-ficha', () => {
  describe('escapa', () => {
    /**
     * No es una formalidad. Los títulos vienen de fichas de proveedores chinos, traen comillas y
     * símbolos, y acaban dentro de `content="…"`. Sin escapar, una comilla cierra el atributo y lo que
     * siga se interpreta como marcado: eso es inyección de HTML con datos de un tercero.
     */
    it('neutraliza lo que rompería un atributo', () => {
      expect(escapa('Gorro "premium" <b>& más</b>')).toBe(
        'Gorro &quot;premium&quot; &lt;b&gt;&amp; más&lt;/b&gt;',
      );
    });

    it('escapa el ampersand ANTES que el resto, o se escaparía dos veces', () => {
      /* Si `&` fuera lo último, `&quot;` acabaría como `&amp;quot;` y saldría escrito en pantalla. */
      expect(escapa('a & "b"')).toBe('a &amp; &quot;b&quot;');
    });

    it('un valor ausente no escribe «undefined» en la página', () => {
      expect(escapa(undefined)).toBe('');
      expect(escapa(null)).toBe('');
    });
  });

  describe('recorta', () => {
    it('deja intacto lo que ya cabe', () => {
      expect(recorta('Gorro de lana', 110)).toBe('Gorro de lana');
    });

    it('junta los espacios y saltos de línea de las descripciones de proveedor', () => {
      expect(recorta('  Gorro\n\n  de   lana  ', 110)).toBe('Gorro de lana');
    });

    /** Cortar por la mitad de una palabra se lee como texto corrupto, no como texto recortado. */
    it('corta por un espacio, no por la mitad de una palabra', () => {
      /* A los 20 caracteres el corte caería dentro de «qrstuvwx»; se retrocede al espacio anterior. */
      expect(recorta('abcdefgh ijklmnop qrstuvwx', 20)).toBe('abcdefgh ijklmnop…');
    });

    /**
     * Si el último espacio está muy al principio, cortar ahí dejaría una descripción de dos palabras.
     * En ese caso vale más partir la palabra: se pierde menos información.
     */
    it('si el único espacio está al principio, parte la palabra', () => {
      /* Retroceder hasta ese espacio dejaría «ab…»: se pierde toda la descripción por respetar una
       * palabra. Por debajo del 60% del límite se corta y punto. */
      expect(recorta('ab cdefghijklmnopqrstuvwxyz', 12)).toBe('ab cdefghijk…');
    });
  });

  describe('imagenPrincipal', () => {
    it('prefiere la marcada como principal, no la primera', () => {
      expect(
        imagenPrincipal({
          images: [
            { role: 'GALLERY', cdnUrl: 'https://cdn/otra.jpg' },
            { role: 'MAIN', cdnUrl: 'https://cdn/principal.jpg' },
          ],
        }),
      ).toBe('https://cdn/principal.jpg');
    });

    it('sin ninguna marcada, usa la primera', () => {
      expect(imagenPrincipal({ images: [{ cdnUrl: 'https://cdn/una.jpg' }] })).toBe(
        'https://cdn/una.jpg',
      );
    });

    /** La de origen apunta al proveedor, que puede negarse a servirla y dejar la previa sin foto. */
    it('usa la del CDN antes que la del proveedor', () => {
      expect(
        imagenPrincipal({
          images: [{ role: 'MAIN', cdnUrl: 'https://cdn/x.jpg', sourceUrl: 'https://1688/x.jpg' }],
        }),
      ).toBe('https://cdn/x.jpg');
    });

    it('sin CDN cae a la del proveedor, que es mejor que nada', () => {
      expect(imagenPrincipal({ images: [{ sourceUrl: 'https://1688/x.jpg' }] })).toBe(
        'https://1688/x.jpg',
      );
    });

    it('un producto sin fotos no revienta', () => {
      expect(imagenPrincipal({})).toBe('');
      expect(imagenPrincipal({ images: [] })).toBe('');
    });
  });

  describe('etiquetas', () => {
    const PRODUCTO = {
      metaTitle: 'Gorro de lana',
      metaDescription: 'Abriga de verdad',
      images: [{ role: 'MAIN', cdnUrl: 'https://cdn/gorro.jpg' }],
      displayPrice: '9.90',
      displayCurrency: 'EUR',
    };

    it('compone el bloque que leen los robots', () => {
      const bloque = etiquetas(PRODUCTO, 'https://nx036.com/catalog/gorro');

      expect(bloque).toContain('<title>Gorro de lana · NX036</title>');
      expect(bloque).toContain('<meta property="og:title" content="Gorro de lana">');
      expect(bloque).toContain('<link rel="canonical" href="https://nx036.com/catalog/gorro">');
      expect(bloque).toContain('<meta property="og:image" content="https://cdn/gorro.jpg">');
      expect(bloque).toContain('<meta property="product:price:amount" content="9.90">');
    });

    /** Sin foto, la tarjeta grande deja un hueco gris: se declara la pequeña, que es la que toca. */
    it('sin foto declara la tarjeta PEQUEÑA y no anuncia imagen', () => {
      const bloque = etiquetas({ metaTitle: 'x' }, 'https://nx036.com/catalog/x');

      expect(bloque).toContain('<meta name="twitter:card" content="summary">');
      expect(bloque).not.toContain('og:image');
    });

    it('con foto declara la tarjeta grande', () => {
      expect(etiquetas(PRODUCTO, 'https://nx036.com/x')).toContain(
        '<meta name="twitter:card" content="summary_large_image">',
      );
    });

    it('sin precio no se inventa uno', () => {
      const bloque = etiquetas({ metaTitle: 'x' }, 'https://nx036.com/x');

      expect(bloque).not.toContain('product:price');
    });

    it('cae al título del producto cuando no hay uno de meta', () => {
      expect(etiquetas({ title: 'Gorro' }, 'https://nx036.com/x')).toContain(
        '<title>Gorro · NX036</title>',
      );
    });

    /** El título viene de una ficha de proveedor: si no se escapara, partiría el atributo. */
    it('escapa lo que mete en los atributos', () => {
      const bloque = etiquetas({ metaTitle: 'Gorro "24"' }, 'https://nx036.com/x');

      expect(bloque).toContain('content="Gorro &quot;24&quot;"');
    });
  });

  describe('direccionCanonica', () => {
    const peticion = (host: string) => ({ headersIn: { Host: host } }) as never;

    it('conserva el dominio propio por el que se ha entrado', () => {
      expect(direccionCanonica(peticion('pre.nx036.com'), 'gorro')).toBe(
        'https://pre.nx036.com/catalog/gorro',
      );
    });

    it('en local no inventa un TLS que no hay', () => {
      expect(direccionCanonica(peticion('localhost:3004'), 'gorro')).toBe(
        'http://localhost:3004/catalog/gorro',
      );
    });

    /**
     * La cabecera `Host` la escribe QUIEN PIDE, y la respuesta se cachea cinco minutos en el borde.
     * Sin la lista blanca bastaba una petición con un `Host` inventado para dejar guardada una ficha
     * cuyo canónico apunta a la web de otro: a partir de ahí, todo el que compartiera ese enlace
     * mandaría gente allí, y los buscadores leerían que la página canónica está en ese dominio.
     */
    it('un Host inventado NO se cuela: cae al dominio de producción', () => {
      expect(direccionCanonica(peticion('sitio-ajeno.example'), 'gorro')).toBe(
        'https://nx036.com/catalog/gorro',
      );
    });

    it('sin cabecera Host tampoco', () => {
      expect(direccionCanonica({ headersIn: {} } as never, 'gorro')).toBe(
        'https://nx036.com/catalog/gorro',
      );
    });

    it('el slug viaja codificado', () => {
      expect(direccionCanonica(peticion('nx036.com'), 'gorro de lana')).toContain(
        'gorro%20de%20lana',
      );
    });
  });

  describe('limpia e inyecta', () => {
    const ESQUELETO = '<html><head><title>NX036</title></head><body>hola</body></html>';

    it('sustituye el título en vez de añadir un segundo', () => {
      const salida = inyecta(ESQUELETO, '<title>Gorro · NX036</title>');

      /* Dos títulos en un documento son marcado inválido y cada robot elige uno: la vista previa
       * saldría bien en unos sitios y mal en otros. */
      expect(salida.match(/<title>/g)).toHaveLength(1);
      expect(salida).toContain('<title>Gorro · NX036</title>');
    });

    it('no toca el cuerpo', () => {
      expect(inyecta(ESQUELETO, '<title>x</title>')).toContain('<body>hola</body>');
    });

    /**
     * Desde que hay fichas prerenderizadas, su HTML YA trae estas etiquetas puestas por la aplicación.
     * Sin limpiarlas antes, el documento saldría con cada una dos veces.
     */
    it('quita del head las etiquetas que se van a volver a escribir', () => {
      const cabeza =
        '<title>Viejo</title>' +
        '<meta name="description" content="vieja">' +
        '<meta property="og:image" content="https://cdn/vieja.jpg">' +
        '<link rel="canonical" href="https://otro/x">';

      const limpiada = limpia(cabeza);

      expect(limpiada).not.toContain('Viejo');
      expect(limpiada).not.toContain('vieja');
      expect(limpiada).not.toContain('canonical');
    });

    /**
     * El `<head>` de una ficha prerenderizada lleva decenas de kB de CSS crítico. Lo que hay ahí dentro
     * es TEXTO: si una regla contuviera `<title>` o `<meta …>`, la limpieza se lo comería y la página
     * saldría sin estilos. Se probó con una regla así y en efecto se la comía.
     */
    it('no se come el CSS crítico aunque parezca marcado', () => {
      const cabeza =
        '<style>.x::after{content:"<title>trampa</title>"}</style><title>Viejo</title>';

      const limpiada = limpia(cabeza);

      expect(limpiada).toContain('content:"<title>trampa</title>"');
      expect(limpiada).not.toContain('>Viejo<');
    });

    it('un documento sin head se devuelve intacto en vez de romperse', () => {
      const suelto = '<p>sin cabeza</p>';

      expect(inyecta(suelto, '<title>x</title>')).toBe(suelto);
    });
  });
});
