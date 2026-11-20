/* ÚNICO SITIO QUE HAY QUE TOCAR AL PUBLICAR UNA ACTUALIZACIÓN
   1. Sube el número de versión.
   2. Añade una línea arriba del todo en CAMBIOS.
   Este archivo lo leen la app (panel de padres → Novedades) y el service worker. */
self.APP_VERSION = '1.0.0';
self.APP_CAMBIOS = [
  ['1.0.0', 'Primera versión: pintar, colorear fotos, parejas y buscar.']
];
