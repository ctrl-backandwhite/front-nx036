import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Dialogo } from './dialogo';
import { DialogoStore } from './dialogo.store';
import { errorDeCampo } from './validacion-campo';

describe('errorDeCampo', () => {
  it('exige los campos obligatorios', () => {
    expect(errorDeCampo({ nombre: 'n', etiqueta: 'N', obligatorio: true }, '  ')).toBe(
      'dialog.field.required',
    );
    expect(errorDeCampo({ nombre: 'n', etiqueta: 'N' }, '')).toBeNull();
  });

  it('comprueba los números y su mínimo', () => {
    const campo = { nombre: 'n', etiqueta: 'N', tipo: 'number' as const, min: 5 };
    expect(errorDeCampo(campo, 'abc')).toBe('dialog.field.number');
    expect(errorDeCampo(campo, '3')).toBe('dialog.field.min');
    expect(errorDeCampo(campo, '7')).toBeNull();
  });
});

describe('Dialogo', () => {
  it('sin nada que preguntar no pinta nada', async () => {
    await render(Dialogo);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('la confirmación devuelve sí al aceptar y no al cancelar', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Dialogo);
    const store = TestBed.inject(DialogoStore);
    const t = TestBed.inject(TraduccionService).t;

    const primera = store.confirma('¿Borrar el producto?');
    fixture.detectChanges();
    await usuario.click(screen.getByRole('button', { name: t('dialog.confirm.ok') }));
    expect(await primera).toBe(true);

    const segunda = store.confirma('¿Borrar el producto?');
    fixture.detectChanges();
    await usuario.click(screen.getByRole('button', { name: t('dialog.cancel') }));
    expect(await segunda).toBe(false);
  });

  it('la pregunta devuelve lo tecleado', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Dialogo);
    const store = TestBed.inject(DialogoStore);
    const t = TestBed.inject(TraduccionService).t;

    const respuesta = store.pregunta({ titulo: 'Motivo' });
    fixture.detectChanges();
    await usuario.type(screen.getByRole('textbox', { name: 'Motivo' }), 'roto');
    await usuario.click(screen.getByRole('button', { name: t('dialog.prompt.ok') }));

    expect(await respuesta).toBe('roto');
  });

  /**
   * Cerrar con errores obligaría a volver a teclearlo todo, que es justo lo que hacía insufrible la
   * cadena de preguntas encadenadas.
   */
  it('el formulario no se cierra con errores y los retira al corregir', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Dialogo);
    const store = TestBed.inject(DialogoStore);
    const t = TestBed.inject(TraduccionService).t;

    const respuesta = store.formulario({
      titulo: 'Nuevo almacén',
      campos: [{ nombre: 'nombre', etiqueta: 'Nombre', obligatorio: true }],
    });
    fixture.detectChanges();

    await usuario.click(screen.getByRole('button', { name: t('dialog.form.ok') }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText(/Nombre/), 'Jinhua');
    // El error se retira al CORREGIR, no al volver a enviar.
    expect(screen.queryByRole('alert')).toBeNull();

    await usuario.click(screen.getByRole('button', { name: t('dialog.form.ok') }));
    expect(await respuesta).toEqual({ nombre: 'Jinhua' });
  });

  it('la tecla de escape cancela', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Dialogo);
    const store = TestBed.inject(DialogoStore);

    const respuesta = store.pregunta({ titulo: 'Motivo' });
    fixture.detectChanges();
    await usuario.keyboard('{Escape}');

    expect(await respuesta).toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  /** Un aviso no tiene «no»: se ha leído y punto. */
  it('el aviso se resuelve igual por cualquier salida', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Dialogo);
    const store = TestBed.inject(DialogoStore);

    const respuesta = store.alerta('Guardado');
    fixture.detectChanges();
    await usuario.keyboard('{Escape}');

    expect(await respuesta).toBe(true);
  });
});
