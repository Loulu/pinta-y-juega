/* ÚNICO SITIO QUE HAY QUE TOCAR AL PUBLICAR UNA ACTUALIZACIÓN
   1. Sube el número de versión.
   2. Añade una línea arriba del todo en CAMBIOS.
   Este archivo lo leen la app (panel de padres → Novedades) y el service worker. */
self.APP_VERSION = '1.3.0';
self.APP_CAMBIOS = [
  ['1.3.0', 'Juego nuevo Cocina (cortar, olla, modo libre y 10 menús) y Buscar con mapa escondite de gatitos y otros animales.'],
  ['1.2.0', 'Juego nuevo ¡Pum!: un puño de muelle contra monstruitos, con niveles cada vez más rápidos.'],
  ['1.1.0', '15 dibujos nuevos para colorear, lápiz de color y la pintura ya no se sale de las líneas (se puede quitar en opciones).'],
  ['1.0.0', 'Primera versión: pintar, colorear fotos, parejas y buscar.']
];
