// Raster tile source for map pages. Kept in one place so the provider can change without touching pages.
// tile.openstreetmap.org has no SLA and may block heavy commercial use; move to a contracted
// OSM provider (Stadia、MapTiler) before traffic grows.
export const mapTiles = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  // Shortest form the OSMF attribution guidelines accept, linked to the licence page.
  attribution: '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a>',
  maxZoom: 19,
};
