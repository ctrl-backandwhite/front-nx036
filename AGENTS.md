# Frontend NX036 — guía de trabajo

Este fichero existe para las herramientas que no leen `CLAUDE.md` (Codex, Cursor, Copilot). **Las
normas no se duplican aquí**: están en [`CLAUDE.md`](CLAUDE.md), y dos copias de una norma divergen.

## Arranque

```bash
npm install
npm start                                       # ng serve
npm test                                        # ng test — ~3.983 pruebas, ~50 s
npm test -- --include src/ruta/fichero.spec.ts  # un solo fichero: 35 s
```

**Nunca `npx vitest run`**: rompe 397 de 421 ficheros, porque el entorno de pruebas de Angular lo
monta el constructor de `ng test`. La pista está en el resumen: `setup 0ms`.

## Lo imprescindible antes de tocar nada

- **`presentation` no importa `infrastructure`.** Es la regla que sostiene la arquitectura.
- **Mobile first**: la pantalla se escribe estrecha y se amplía hacia arriba.
- **Toda cadena va en los ocho idiomas** (es, en, pt, fr, it, de, nl, zh), como clave y no como
  texto.
- **El CSS está centralizado**: se cambia el token, no se parchea el color en el componente.
- **La documentación se actualiza en el mismo commit.**

El detalle, con el motivo de cada una, está en `CLAUDE.md` (396 líneas), en `.claude/rules/` por
carpeta y en `.claude/skills/frontend/SKILL.md`.
