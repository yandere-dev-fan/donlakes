export const mapView = { x: 300, y: 240, width: 1200, height: 850 };
export type Point = [number, number];
// Shared junctions; every physical segment appears only once.
export const roads: Record<string, { name: string; points: Point[] }> = {
  entrance: { name: 'Въездная дорога', points: [[415,1089],[613,597],[666,461],[730,333]] },
  approach: { name: 'Поворот у конца въездной дороги', points: [[730,333],[510,244]] },
  shore: { name: 'Дорога вдоль бань', points: [[613,597],[799,524],[1354,812]] },
  admin: { name: 'Поперечная дорога у администрации', points: [[666,461],[799,524]] },
  rear: { name: 'Задняя дорога к срубам', points: [[730,333],[1250,568]] },
};
export function smoothRoad(points: Point[], radius = 22): string {
  const clean = points.filter((p,i) => !i || p[0]!==points[i-1][0] || p[1]!==points[i-1][1]);
  if(clean.length<2) return '';
  let d = `M${clean[0].join(',')}`;
  for(let i=1;i<clean.length-1;i++) {
    const a=clean[i-1],b=clean[i],c=clean[i+1];
    const before=Math.hypot(b[0]-a[0],b[1]-a[1]),after=Math.hypot(c[0]-b[0],c[1]-b[1]);
    // Limit corner rounding near branches so road surfaces remain connected.
    const junction=Object.values(roads).filter(r=>r.points.some(p=>p[0]===b[0]&&p[1]===b[1])).length>1;
    const r=Math.min(junction?12:radius,before*.3,after*.3);
    if(!r){d+=` L${b.join(',')}`;continue;}
    const start:Point=[b[0]+(a[0]-b[0])*r/before,b[1]+(a[1]-b[1])*r/before];
    const end:Point=[b[0]+(c[0]-b[0])*r/after,b[1]+(c[1]-b[1])*r/after];
    d+=` L${start.join(',')} Q${b.join(',')} ${end.join(',')}`;
  }
  return d+` L${clean[clean.length-1].join(',')}`;
}
// Pedestrian paths follow the outside of the lake and meet the activity areas.
export function walkingPaths(beach: Point, volleyball: Point): Record<string, string> {
  return {
    beach: smoothRoad([[575,692],[584,719],[568,772],[565,827],[575,875],[589,900],beach], 30),
    volleyball: smoothRoad([beach,[beach[0]+43,beach[1]+16],[690,903],[720,911],[volleyball[0]-28,volleyball[1]-58],volleyball], 26),
  };
}
export const mapStorageKey = 'donozera-map-position-v3';
export interface MapEdits { points: Record<string, Point>; roads: Record<string, Point[]> }
export function validPoint(point: unknown): point is Point {
  return Array.isArray(point) && point.length === 2 && point.every(n => typeof n === 'number' && Number.isFinite(n)) && point[0] >= 0 && point[0] <= 1941 && point[1] >= 0 && point[1] <= 1280;
}
export function readMapEdits(): MapEdits {
  const clean: MapEdits = {points:{},roads:{}};
  try {
    const current = localStorage.getItem(mapStorageKey);
    const previous = current || localStorage.getItem('donozera-map-position-v2');
    const data = JSON.parse(previous || localStorage.getItem('donozera-map-position-v1') || '{}');
    for(const [key,p] of Object.entries(data.points || {})) if(validPoint(p)) {
      // Supersede the accepted old parking position without discarding unrelated edits.
      if(!current && key==='parking' && p[0]===1003 && p[1]===480) continue;
      clean.points[key]=p;
    }
    for(const [key,p] of Object.entries(previous ? data.roads || {} : {})) if(key in roads && Array.isArray(p) && p.length>=2 && p.length<=100 && p.every(validPoint)) clean.roads[key]=p;
  } catch {}
  return clean;
}
