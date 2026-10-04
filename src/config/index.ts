// Dev defaults. The public Valhalla instance (FOSSGIS) is for light use only;
// point VALHALLA_URL at a self-hosted Valhalla for real use.
export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de';
// 'bicycle' | 'motor_scooter' | 'motorcycle' | 'auto' | 'pedestrian'
export const VALHALLA_COSTING = 'bicycle';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
export const USER_AGENT = 'BikeNavApp/1.0 (chaitanya.s@techlanz.com)';

export const OFF_ROUTE_METERS = 40;
export const OFF_ROUTE_FIXES = 3;
export const ARRIVE_METERS = 20;
