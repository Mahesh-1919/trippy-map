export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export const fmtTime = (s: number) => {
  const m = Math.max(1, Math.round(s / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

export const fmtArrival = (secondsFromNow: number) =>
  new Date(Date.now() + secondsFromNow * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
