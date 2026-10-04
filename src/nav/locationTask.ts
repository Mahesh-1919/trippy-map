import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK = 'bike-nav-location';

type Handler = (loc: Location.LocationObject) => void;
let handler: Handler | null = null;

export function setLocationHandler(h: Handler | null) {
  handler = h;
}

// Must be defined at module scope (imported from index.ts) so the OS can wake it.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) handler?.(loc);
});

export async function startLocationUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 1,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Navigation active',
      notificationBody: 'Sending directions to your bike display',
    },
  });
}

export async function stopLocationUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
