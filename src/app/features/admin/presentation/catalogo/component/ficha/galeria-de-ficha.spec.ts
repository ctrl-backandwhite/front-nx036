import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { EjeDeVariacion } from '../../../../domain/catalogo/model/eje-de-variacion';
import { ImagenDeProducto } from '../../../../domain/catalogo/model/imagen-de-producto';
import { GaleriaDeFicha } from './galeria-de-ficha';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `admin.catalog.images.main` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma
 * cadena de respaldo que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba
 * sigue delatando el día que alguien escriba en la plantilla una clave que no existe.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/** El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor. */
const rx = (clave: string): RegExp =>
  new RegExp(
    t(clave)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{[a-zA-Z]+\\\}/g, '.+'),
  );

const imagen = (id: string, url: string): ImagenDeProducto => ({
  id,
  urlOrigen: url,
  posicion: 0,
  papel: 'GALLERY',
});

const ejeDeColor: EjeDeVariacion = {
  id: 'e1',
  nombre: 'Color',
  nombreZh: '颜色',
  posicion: 0,
  valores: [
    { id: 'v1', valorZh: '白色', valor: 'Blanco', urlImagen: 'https://cdn/O1CN0001.jpg', posicion: 0 },
    { id: 'v2', valorZh: '黑色', valor: 'Negro', urlImagen: 'https://cdn/O1CN0002.jpg', posicion: 1 },
  ],
};

describe('GaleriaDeFicha', () => {
  /**
   * Las pruebas corren en ESPAÑOL: el idioma sale de la cookie de preferencias y, sin ella, el
   * navegador de pruebas pide inglés. Fijarlo aquí deja las comprobaciones contra el diccionario real.
   */
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('sin fotos se dice que la galería está vacía', async () => {
    await render(GaleriaDeFicha, { inputs: { imagenes: [], titulo: 'Auricular' } });

    expect(screen.getByText(t('admin.catalog.detail.gallery_empty'))).toBeInTheDocument();
  });

  /** El primero es la imagen principal: cambia con qué foto sale el producto en el escaparate. */
  it('marca la primera foto como principal', async () => {
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [imagen('i1', 'https://a.jpg'), imagen('i2', 'https://b.jpg')] },
    });

    expect(screen.getAllByText(t('admin.catalog.images.main')).length).toBe(1);
  });

  /**
   * Se comparan por identificador O1CN: la misma foto llega con direcciones distintas según el CDN,
   * y sin eso la galería acababa con la misma imagen dos veces.
   */
  it('solo ofrece las fotos de color que aún no están en la galería', async () => {
    await render(GaleriaDeFicha, {
      inputs: {
        imagenes: [imagen('i1', 'https://otro-cdn/O1CN0001_!!600.jpg')],
        ejes: [ejeDeColor],
      },
    });

    expect(screen.getByText(t('admin.catalog.images.from_variants'))).toBeInTheDocument();
    expect(screen.getByAltText('Negro')).toBeInTheDocument();
    expect(screen.queryByAltText('Blanco')).toBeNull();
  });

  it('un eje que no es de color no aporta fotos arrastrables', async () => {
    await render(GaleriaDeFicha, {
      inputs: {
        imagenes: [],
        ejes: [{ ...ejeDeColor, nombre: 'Talla', nombreZh: '尺码' }],
      },
    });

    expect(screen.queryByText(t('admin.catalog.images.from_variants'))).toBeNull();
  });

  it('el botón de añadir se enciende solo cuando hay direcciones válidas', async () => {
    const anadidas: string[][] = [];
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [] },
      on: { anade: (urls: readonly string[]) => anadidas.push([...urls]) },
    });
    const campo = screen.getByLabelText(t('admin.catalog.images.url_ph'));
    const boton = screen.getByRole('button', { name: rx('admin.catalog.images.add_url') });

    expect(boton).toBeDisabled();

    await userEvent.type(campo, 'https://a.jpg https://b.jpg');
    await userEvent.click(screen.getByRole('button', { name: rx('admin.catalog.images.add_url') }));

    expect(anadidas).toEqual([['https://a.jpg', 'https://b.jpg']]);
  });

  it('marcar fotos ofrece borrarlas juntas', async () => {
    const borradas: string[][] = [];
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [imagen('i1', 'https://a.jpg'), imagen('i2', 'https://b.jpg')] },
      on: { elimina: (ids: readonly string[]) => borradas.push([...ids]) },
    });

    const casillas = screen.getAllByLabelText(t('admin.catalog.images.select'));
    await userEvent.click(casillas[0]);
    await userEvent.click(casillas[1]);
    await userEvent.click(
      screen.getByRole('button', { name: rx('admin.catalog.images.delete_selected') }),
    );

    expect(borradas[0].sort()).toEqual(['i1', 'i2']);
  });
});
