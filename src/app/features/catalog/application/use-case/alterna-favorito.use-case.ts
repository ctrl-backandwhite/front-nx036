import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { FAVORITOS_PORT } from '../../domain/port/favoritos.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { FavoritosStore } from '../state/favoritos.store';

/**
 * Marcar y desmarcar un favorito, y traer la lista la primera vez.
 *
 * <p>El cambio se pinta ANTES de que conteste el servidor: un corazón que tarda medio segundo en
 * encenderse se percibe como que no ha funcionado y la gente vuelve a pulsar, con lo que acaba
 * desmarcando lo que quería marcar. Si la llamada falla se DESHACE, que es lo que convierte el
 * optimismo en algo honesto.
 */
@Injectable({ providedIn: 'root' })
export class AlternaFavorito {
  private readonly puerto = inject(FAVORITOS_PORT);
  private readonly estado = inject(FavoritosStore);
  private readonly sesion = inject(SesionActual);

  /** Trae los identificadores una sola vez. Sin sesión no hay favoritos que traer. */
  async carga(): Promise<void> {
    if (!this.sesion.haySesion() || this.estado.cargados()) {
      return;
    }
    const resultado = await this.puerto.identificadores();
    if (resultado.ok) {
      this.estado.fija(resultado.valor);
    }
  }

  async ejecuta(idDelProducto: string): Promise<Result<boolean, AppError>> {
    if (!this.sesion.haySesion()) {
      return fallo(creaError('no-autenticado'));
    }
    const eraFavorito = this.estado.esFavorito(idDelProducto);
    this.estado.alterna(idDelProducto);

    const resultado = eraFavorito
      ? await this.puerto.quita(idDelProducto)
      : await this.puerto.anade(idDelProducto);

    if (!resultado.ok) {
      this.estado.alterna(idDelProducto);
      return fallo(resultado.error);
    }
    return exito(!eraFavorito);
  }
}
