import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { EjeDeVariacion } from '../../../../domain/catalogo/model/eje-de-variacion';
import { ImagenDeProducto } from '../../../../domain/catalogo/model/imagen-de-producto';
import { GaleriaDeFicha } from './galeria-de-ficha';

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
  it('sin fotos se dice que la galería está vacía', async () => {
    await render(GaleriaDeFicha, { inputs: { imagenes: [], titulo: 'Auricular' } });

    expect(screen.getByText('admin.catalog.detail.gallery_empty')).toBeInTheDocument();
  });

  /** El primero es la imagen principal: cambia con qué foto sale el producto en el escaparate. */
  it('marca la primera foto como principal', async () => {
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [imagen('i1', 'https://a.jpg'), imagen('i2', 'https://b.jpg')] },
    });

    expect(screen.getAllByText('admin.catalog.images.main').length).toBe(1);
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

    expect(screen.getByText('admin.catalog.images.from_variants')).toBeInTheDocument();
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

    expect(screen.queryByText('admin.catalog.images.from_variants')).toBeNull();
  });

  it('el botón de añadir se enciende solo cuando hay direcciones válidas', async () => {
    const anadidas: string[][] = [];
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [] },
      on: { anade: (urls: readonly string[]) => anadidas.push([...urls]) },
    });
    const campo = screen.getByLabelText('admin.catalog.images.url_ph');
    const boton = screen.getByRole('button', { name: /admin.catalog.images.add_url/ });

    expect(boton).toBeDisabled();

    await userEvent.type(campo, 'https://a.jpg https://b.jpg');
    await userEvent.click(screen.getByRole('button', { name: /admin.catalog.images.add_url/ }));

    expect(anadidas).toEqual([['https://a.jpg', 'https://b.jpg']]);
  });

  it('marcar fotos ofrece borrarlas juntas', async () => {
    const borradas: string[][] = [];
    await render(GaleriaDeFicha, {
      inputs: { imagenes: [imagen('i1', 'https://a.jpg'), imagen('i2', 'https://b.jpg')] },
      on: { elimina: (ids: readonly string[]) => borradas.push([...ids]) },
    });

    const casillas = screen.getAllByLabelText('admin.catalog.images.select');
    await userEvent.click(casillas[0]);
    await userEvent.click(casillas[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /admin.catalog.images.delete_selected/ }),
    );

    expect(borradas[0].sort()).toEqual(['i1', 'i2']);
  });
});
