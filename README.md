# NoteApp

Aplicación para tomar notas y crear recordatorios.

Diseñada con Claude Design. Es una web estática: no necesita instalación ni compilación.

## Estructura

- `index.html` — la aplicación
- `support.js` — el motor que hace funcionar la página
- `assets/` — iconos de la interfaz
- `icons/` — logo de la app (para instalarla, la pestaña del navegador y el móvil)
- `manifest.webmanifest` — ficha de la app instalable (nombre, colores, logo)
- `sw.js` — permite instalar la app y abrirla sin conexión

## Instalar la app (PWA)

- **Ordenador (Chrome o Edge):** abre la web y pulsa el icono de instalar que aparece a la derecha de la barra de direcciones.
- **Android (Chrome):** menú ⋮ → "Añadir a pantalla de inicio" / "Instalar app".
- **iPhone (Safari):** botón Compartir → "Añadir a pantalla de inicio".

Para cambiar el logo, sustituye los archivos de `icons/` manteniendo los mismos nombres y tamaños.

## Publicar en Vercel

Importa este repositorio en Vercel y deja todo por defecto (Framework: "Other"). Vercel servirá `index.html` automáticamente.

## Dónde se guardan los datos

1. **En el navegador**, siempre y de forma automática.
2. **En una carpeta de tu ordenador** (solo Chrome o Edge de escritorio). Pulsa el icono de la carpeta, abajo a la izquierda, y elige la carpeta. Desde ese momento todo se guarda ahí automáticamente:

```
TuCarpeta/
├── NoteApp.json              ← configuración, vista y orden de las notas
├── Notas/
│   └── <nombre> (<id>).json  ← una nota con sus hojas, textos y entidades
└── Agenda/
    └── <nombre> (<id>).json
```

Al crear, cambiar, renombrar o borrar una nota, hoja o entidad, los archivos se actualizan solos.
Para usar la app en otro ordenador, conecta la misma carpeta y se cargará todo tal cual.

Punto verde en el icono: guardando en la carpeta. Punto naranja: hay que volver a dar permiso (pulsa el icono).
