import { mapView, readMapEdits, roads, smoothRoad, walkingPaths } from '../content/map-geometry';
import { places } from '../content/places';
export function applyMapEdits() {
  const edits = readMapEdits();
  for (const place of places) {
    const id = place.id;
    const point = edits.points[id] || [place.x, place.y];
    const pin = [point[0] + place.pinX - place.x, point[1] + place.pinY - place.y];
    const marker = document.querySelector<HTMLElement>(`.map-pin[data-place="${id}"]`);
    if(marker && !marker.closest('.leaflet-marker-icon')){marker.hidden=!!place.locationPending && !edits.points[id];marker.style.left=`${(pin[0]-mapView.x)/mapView.width*100}%`;marker.style.top=`${(pin[1]-mapView.y)/mapView.height*100}%`;}
    const connector=document.querySelector<SVGElement>(`[data-connector="${id}"]`);
    if(connector) connector.style.display=place.locationPending && !edits.points[id]?'none':'';
    const line=document.querySelector(`[data-connector="${id}"] line`);
    const dot=document.querySelector(`[data-connector="${id}"] circle`);
    line?.setAttribute('x1',String(point[0]));line?.setAttribute('y1',String(point[1]));
    line?.setAttribute('x2',String(pin[0]));line?.setAttribute('y2',String(pin[1]));
    dot?.setAttribute('cx',String(point[0]));dot?.setAttribute('cy',String(point[1]));
    document.querySelector(`[data-feature="${id}"]`)?.setAttribute('transform',`translate(${point[0]} ${point[1]})`);
  }
  const beach=places.find(p=>p.id==='beach')!, volleyball=places.find(p=>p.id==='volleyball')!;
  const paths=walkingPaths(edits.points.beach||[beach.x,beach.y],edits.points.volleyball||[volleyball.x,volleyball.y]);
  for(const [id,d] of Object.entries(paths)) document.querySelectorAll(`[data-walkway="${id}"]`).forEach(p=>p.setAttribute('d',d));
  for(const [id,road] of Object.entries(roads)) document.querySelectorAll(`[data-road="${id}"]`).forEach(p=>p.setAttribute('d',smoothRoad(edits.roads[id]||road.points)));
}
