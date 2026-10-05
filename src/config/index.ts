// Dev defaults. The public Valhalla instance (FOSSGIS) is for light use only;
// point VALHALLA_URL at a self-hosted Valhalla for real use.
export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de';
// 'bicycle' | 'motor_scooter' | 'motorcycle' | 'auto' | 'pedestrian'
export const VALHALLA_COSTING = 'bicycle';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
export const USER_AGENT = 'BikeNavApp/1.0 (chaitanya.s@techlanz.com)';

// OpenFreeMap: free for commercial use, no API key, no request limits.
// Attribution ("OpenFreeMap (c) OpenMapTiles, data from OpenStreetMap") is shown by the map's attribution control.
export const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export const OFF_ROUTE_METERS = 40;
export const OFF_ROUTE_FIXES = 3;
export const ARRIVE_METERS = 20;
