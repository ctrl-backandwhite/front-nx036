import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';
import pt from '@shared/i18n/dictionary/pt';
import zh from '@shared/i18n/dictionary/zh';
import fr from '@shared/i18n/dictionary/fr';
import de from '@shared/i18n/dictionary/de';
import italiano from '@shared/i18n/dictionary/it';
import nl from '@shared/i18n/dictionary/nl';
import { COLOR_DE_CATEGORIA, COLOR_DE_ESTADO, claveDeEstado, nombreDelSuceso } from './colores-del-buzon';
import { Categoria } from '../../domain/model/aviso';

/**
 * Los colores y los nombres de las etiquetas del buzón.
 *
 * <p>La tabla está aquí y no repartida por las plantillas para que la lista y el panel de lectura no
 * puedan pintar el mismo estado de dos colores distintos. Lo que se comprueba es que no falte ninguna
 * entrada: una categoría sin color se pinta sin fondo y parece un fallo de estilos.
 */
describe('colores y nombres del buzón', () => {
  const CATEGORIAS: readonly Categoria[] = [
    'support',
    'affiliate',
    'order',
    'billing',
    'newsletter',
    'system',
    'general',
  ];

  it('todas las categorías tienen color', () => {
    for (const categoria of CATEGORIAS) {
      expect(COLOR_DE_CATEGORIA[categoria], `«${categoria}» se quedaría sin fondo`).toBeTruthy();
    }
  });

  it('todos los estados de gestión tienen color', () => {
    for (const estado of ['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'RESOLVED']) {
      expect(COLOR_DE_ESTADO[estado]).toBeTruthy();
    }
  });

  describe('claveDeEstado', () => {
    it('compone la clave en minúsculas', () => {
      expect(claveDeEstado('IN_PROGRESS')).toBe('notif.status.in_progress');
    });

    /** Un aviso viejo sin estado sigue siendo nuevo: sin este respaldo saldría con la etiqueta vacía. */
    it('sin estado cae en el de partida', () => {
      expect(claveDeEstado(undefined)).toBe('notif.status.new');
      expect(claveDeEstado('')).toBe('notif.status.new');
    });
  });

  describe('nombreDelSuceso', () => {
    const traduce = (clave: string) =>
      clave === 'notif.type.ORDER_SHIPPED' ? 'Pedido enviado' : clave;

    it('usa la traducción cuando la hay', () => {
      expect(nombreDelSuceso(traduce, 'ORDER_SHIPPED')).toBe('Pedido enviado');
    });

    /**
     * El backend añade sucesos nuevos sin avisar al front. Ver `ORDER_FORWARDED` en pantalla es peor que
     * ver «Order forwarded»: lo segundo se entiende, lo primero parece una avería.
     */
    it('sin traducción humaniza el código en vez de enseñarlo crudo', () => {
      expect(nombreDelSuceso(traduce, 'ORDER_FORWARDED')).toBe('Order forwarded');
    });

    it('sin código no inventa nada', () => {
      expect(nombreDelSuceso(traduce, '')).toBe('');
    });
  });

  it('los ocho sucesos de seguimiento del contrato tienen nombre traducido en los ocho idiomas', () => {
    const sucesos = [
      'ORDER_SHIPPED',
      'ORDER_IN_CUSTOMS',
      'ORDER_IN_DESTINATION',
      'ORDER_OUT_FOR_DELIVERY',
      'ORDER_READY_FOR_PICKUP',
      'ORDER_DELIVERED',
      'ORDER_SHIPMENT_INCIDENT',
      'ORDER_RETURNED',
    ];
    const diccionarios: Record<string, Record<string, string>> = { es, en, pt, zh, fr, de, it: italiano, nl };
    for (const [idioma, diccionario] of Object.entries(diccionarios)) {
      for (const suceso of sucesos) {
        expect(diccionario['notif.type.' + suceso], `${idioma} sin ${suceso}`).toBeTruthy();
        expect(nombreDelSuceso((c) => diccionario[c] ?? c, suceso)).not.toMatch(/_/);
      }
    }
  });
});
