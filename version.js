/* ÚNICO SITIO QUE HAY QUE TOCAR AL PUBLICAR UNA ACTUALIZACIÓN
   1. Sube el número de versión.
   2. Añade una línea arriba del todo en CAMBIOS.
   Este archivo lo leen la app (panel de padres → Novedades) y el service worker. */
self.APP_VERSION = '1.6.1';
self.APP_CAMBIOS = [
  ['1.6.1', 'Pintar: ya se puede pintar fuera de las líneas, lápiz normal nuevo y un lápiz que se ve en la pantalla mientras se dibuja.'],
  ['1.6.0', 'Juego nuevo Colores de princesa: mezcla colores en un cerdito, un frasco corazón o una poción, con brillantina y retos de la princesa.'],
  ['1.5.0', 'Juego nuevo Gusanitos: lleva cada gusano a su agujero. 99 niveles, todos con solución.'],
  ['1.4.0', 'Juego nuevo Mahjong Solitario con 999 niveles, todos con solución, y globos al terminar cada nivel.'],
  ['1.3.0', 'Juego nuevo Cocina (cortar, olla, modo libre y 10 menús) y Buscar con mapa escondite de gatitos y otros animales.'],
  ['1.2.0', 'Juego nuevo ¡Pum!: un puño de muelle contra monstruitos, con niveles cada vez más rápidos.'],
  ['1.1.0', '15 dibujos nuevos para colorear, lápiz de color y la pintura ya no se sale de las líneas (se puede quitar en opciones).'],
  ['1.0.0', 'Primera versión: pintar, colorear fotos, parejas y buscar.']
];
