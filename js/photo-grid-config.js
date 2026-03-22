/**
 * Photo Grid Layout Configuration
 * Edit this file to customize how images appear in the gallery.
 * No CMS required — just save and refresh.
 *
 * Note: This config applies on desktop (viewports 1001px and wider).
 * On tablets and phones, a simpler responsive layout is used.
 */

window.PHOTO_GRID_CONFIG = {
  // Number of columns in the grid (desktop). 12 gives flexibility for varied sizes.
  columns: 12,

  // Gap between images in pixels. Higher = more space between photos.
  gap: 32,

  /**
   * Layout for each image. The pattern cycles if you have more photos than entries.
   *
   * Each entry:
   *   col  — Column where the image starts (1 to columns). 1 = left edge, higher = more centered
   *   span — How many columns the image spans (1 to columns). Larger = bigger image
   *
   * Edge positioning:
   *   col: 1                    → image touches left edge of viewport
   *   col: (columns - span + 1) → image touches right edge (e.g. col: 10, span: 3 for 12 cols)
   *   col: middle value         → image sits in the center/margins
   *
   * Examples for 12 columns:
   *   { col: 1, span: 3 }   — Small image, left edge
   *   { col: 9, span: 4 }   — Medium image, right edge
   *   { col: 4, span: 5 }   — Large image, centered
   *   { col: 1, span: 6 }   — Half-width, left side
   */
  layout: [
    { col: 1, span: 6 },
    { col: 5, span: 4 },
    { col: 9, span: 4 },
    { col: 1, span: 6 },
    { col: 8, span: 5 },
    { col: 2, span: 2 },
    { col: 5, span: 3 },
    { col: 9, span: 3 },
    { col: 1, span: 5 },
    { col: 7, span: 6 },
    { col: 3, span: 3 },
    { col: 7, span: 2 },
    { col: 10, span: 3 },
    { col: 1, span: 4 },
    { col: 6, span: 5 },
    { col: 2, span: 4 },
    { col: 7, span: 4 },
    { col: 1, span: 2 },
  ],
};
