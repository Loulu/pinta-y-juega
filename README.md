# Pinta y juega

App para peques, para móvil: pintar, colorear fotos, parejas, buscar (mapa escondite), ¡Pum! y cocina. Sin anuncios, sin cuentas y funciona sin internet. Las fotos y el nombre se guardan solo en el móvil.

## Instalar en el móvil (Android)

1. Abre la dirección de la app en **Chrome**, por ejemplo `https://TU-USUARIO.github.io/pinta-y-juega/`.
2. Pulsa el menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio").
3. Abre la app desde el icono una vez con internet. Desde entonces funciona también sin conexión.
4. Mantén pulsado el engranaje del inicio para poner el nombre de la peque y añadir fotos.

En iPhone: ábrela con Safari → Compartir → "Añadir a pantalla de inicio".

## Publicar en GitHub Pages (una sola vez)

1. Crea un repositorio **público** llamado `pinta-y-juega`.
2. Sube todo el contenido de esta carpeta (Add file → Upload files → arrastra los archivos y carpetas).
3. Ve a Settings → Pages → *Build and deployment* → Source: **Deploy from a branch**, rama `main`, carpeta `/ (root)` → Save.
4. En un par de minutos estará en `https://TU-USUARIO.github.io/pinta-y-juega/`.

## Actualizar

1. Cambia lo que quieras.
2. En `version.js` sube el número de versión y añade una línea a `APP_CAMBIOS`.
3. Sube los archivos cambiados al repositorio.

El móvil carga siempre la versión más nueva cuando tiene internet (si no hay conexión, usa la copia guardada). En el panel de padres hay un botón "Buscar actualización" para forzarlo, y un punto rojo en el engranaje avisa cuando hay novedades.

## Estructura

```
index.html            esqueleto de la app y orden de carga de los scripts
version.js            versión y lista de novedades (lo único que tocar al publicar)
sw.js                 modo sin conexión (no hace falta tocarlo)
manifest.webmanifest  nombre, icono y colores de la app instalada
css/app.css           todos los estilos
js/core.js            herramientas comunes: voz, sonidos, confeti, paneles, registro de juegos
js/photos.js          fotos de la familia
js/lineart.js         foto → dibujo para colorear
js/parents.js         panel de padres
js/main.js            arranque: crea el inicio y las pantallas a partir de los juegos
js/data/items.js      animales, cosas, colores y pegatinas (fácil de ampliar)
js/data/templates.js  dibujos para colorear
js/games/*.js         un archivo por juego (draw, pairs, find + hide, punch, cook)
js/games/_plantilla.txt  punto de partida para un juego nuevo
```

## Añadir cosas

- **Más animales u objetos:** añade líneas en `js/data/items.js`. Los usan Parejas y Buscar.
- **Más dibujos para colorear:** añade una entrada en `js/data/templates.js`.
- **Un juego nuevo:** sigue los pasos de `js/games/_plantilla.txt`. El botón del inicio se crea solo.
- **Opciones de un juego en el panel de padres:** define `parentHtml()` y `parentInit()` en el juego (ver `find.js`).

Ideas para próximas versiones: puzles con las fotos, colores y formas, música con animales, galería de dibujos guardados.

## Licencias

Tipografía Baloo 2 (SIL Open Font License, ver `fonts/OFL.txt`). Los dibujos de animales son los emojis del propio móvil.
