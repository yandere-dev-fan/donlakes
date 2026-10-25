import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import plusIcon from '@tabler/icons/outline/plus.svg?raw';
import { places } from '../content/places';
import { mapView, readMapEdits } from '../content/map-geometry';

export function createTerritoryMap() {
  const canvas = document.querySelector<HTMLElement>('#territory-map')!;
  const wrapper = canvas.closest<HTMLElement>('.map-pan')!;
  const stage = wrapper.querySelector<HTMLElement>('.map-stage')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bounds = L.latLngBounds([0, 0], [mapView.height, mapView.width]);
  const map = L.map(canvas, {
    crs:L.CRS.Simple, zoomControl:false, attributionControl:false,
    minZoom:-4, maxZoom:4, zoomSnap:0.25, zoomDelta:0.5,
    maxBounds:bounds.pad(0.35), maxBoundsViscosity:0.85,
    inertia:!reduced.matches, zoomAnimation:!reduced.matches, fadeAnimation:!reduced.matches,
    markerZoomAnimation:!reduced.matches, scrollWheelZoom:true, touchZoom:true,
    bounceAtZoomLimits:false, keyboardPanDelta:90,
  });
  let fitZoom = -2;
  let selectedId = 'object-11';
  let expanded = false;
  const markers = new Map<string, L.Marker>();
  const buttons = new Map<string, HTMLButtonElement>();
  const coords = (id:string) => {
    const p = places.find(p => p.id === id)!;
    const point = readMapEdits().points[id] || [p.x,p.y];
    return L.latLng(mapView.y + mapView.height - (point[1] + p.pinY-p.y), point[0] + p.pinX-p.x-mapView.x);
  };
  const clusters = L.markerClusterGroup({
    maxClusterRadius:44, showCoverageOnHover:false, spiderfyOnMaxZoom:true,
    animate:!reduced.matches, spiderfyDistanceMultiplier:1.5,
    iconCreateFunction:cluster => L.divIcon({
      className:'map-cluster', iconSize:[48,48], iconAnchor:[24,24],
      html:`<span class="cluster-bubble"><strong>${cluster.getChildCount()}</strong><span class="cluster-add" aria-hidden="true">${plusIcon}</span><span class="visually-hidden"> объектов. Приблизить</span></span>`,
    }),
  });
  L.imageOverlay(stage.querySelector<HTMLImageElement>('.territory')!.src, bounds, { interactive:false, alt:'План базы «Донские озёра»' }).addTo(map);
  for (const svg of stage.querySelectorAll<SVGSVGElement>(':scope > svg')) {
    L.svgOverlay(svg, bounds, {interactive:false}).addTo(map);
  }
  for (const button of stage.querySelectorAll<HTMLButtonElement>('.map-pin')) {
    const id = button.dataset.place!;
    buttons.set(id, button);
    button.style.removeProperty('left'); button.style.removeProperty('top');
    button.type = 'button';
    const marker = L.marker(coords(id), {
      keyboard:false, riseOnHover:true,
      icon:L.divIcon({html:button, className:'map-marker-host', iconSize:[44,44], iconAnchor:[22,22]}),
    });
    const label = document.createElement('span');
    label.textContent = places.find(p=>p.id===id)!.name;
    marker.bindTooltip(label, {direction:'top', offset:[0,-22], className:'map-place-tooltip'});
    markers.set(id, marker);
  }
  map.addLayer(clusters);
  function refresh() {
    clusters.clearLayers();
    const edits = readMapEdits();
    for (const p of places) {
      const marker = markers.get(p.id)!;
      if (map.hasLayer(marker)) map.removeLayer(marker);
      marker.setLatLng(coords(p.id));
      if (!p.locationPending || edits.points[p.id]) {
        buttons.get(p.id)!.hidden = false;
        if (p.id === selectedId) marker.addTo(map).setZIndexOffset(1000);
        else clusters.addLayer(marker);
      }
    }
  }
  const zoomLabel = document.querySelector<HTMLOutputElement>('#map-zoom')!;
  const zoomIn = document.querySelector<HTMLButtonElement>('#map-zoom-in')!;
  const zoomOut = document.querySelector<HTMLButtonElement>('#map-zoom-out')!;
  function updateZoom() {
    const zoom = map.getZoom();
    zoomLabel.value = `${Math.round(100 * 2**(zoom-fitZoom))}%`;
    canvas.dataset.zoom = String(zoom);
    canvas.dataset.center = `${map.getCenter().lat.toFixed(2)},${map.getCenter().lng.toFixed(2)}`;
    zoomIn.disabled = zoom >= map.getMaxZoom();
    zoomOut.disabled = zoom <= map.getMinZoom();
  }
  function fit() {
    map.fitBounds(bounds, {padding:[22,26], animate:false});
  }
  function sizeChanged() {
    const wasOverview = !Number.isFinite(map.getZoom()) || Math.abs(map.getZoom()-fitZoom)<0.3;
    map.invalidateSize({pan:false});
    fitZoom = map.getBoundsZoom(bounds, false, L.point(44,52));
    map.setMinZoom(fitZoom); map.setMaxZoom(fitZoom+3.5);
    if (wasOverview) fit();
    updateZoom();
  }
  sizeChanged(); refresh();
  stage.remove();
  wrapper.classList.add('map-ready');
  wrapper.querySelector<HTMLElement>('.map-tools')!.hidden = false;
  document.querySelector<HTMLButtonElement>('#map-reset')!.hidden = false;
  map.on('zoomend moveend',updateZoom);
  zoomIn.addEventListener('click',()=>map.zoomIn(0.5,{animate:false}));
  zoomOut.addEventListener('click',()=>map.zoomOut(0.5,{animate:false}));
  document.querySelector('#map-reset')!.addEventListener('click',()=>fit());
  new ResizeObserver(sizeChanged).observe(wrapper);

  const experience = document.querySelector<HTMLElement>('#map-experience')!;
  const dialog = document.querySelector<HTMLDialogElement>('#map-expanded-dialog')!;
  const expand = document.querySelector<HTMLButtonElement>('#map-expand')!;
  const position = document.createComment('map original position');
  experience.before(position);
  function restore() {
    expanded = false;
    position.after(experience);
    experience.classList.remove('map-is-expanded');
    document.body.classList.remove('map-open');
    expand.setAttribute('aria-label','Развернуть карту');
    expand.title = 'Развернуть карту';
    requestAnimationFrame(()=>{sizeChanged();expand.focus({preventScroll:true});});
  }
  expand.addEventListener('click',()=>{
    if (expanded) { dialog.close(); return; }
    expanded = true;
    dialog.append(experience);
    experience.classList.add('map-is-expanded');
    document.body.classList.add('map-open');
    expand.setAttribute('aria-label','Свернуть карту'); expand.title = 'Свернуть карту';
    dialog.showModal();
    requestAnimationFrame(()=>{sizeChanged();expand.focus({preventScroll:true});});
  });
  dialog.addEventListener('close',restore);

  // A drag ending on a marker must never count as selecting it.
  let start:[number,number] = [0,0], moved = false;
  canvas.addEventListener('pointerdown',event=>{
    start=[event.clientX,event.clientY];moved=false;
    if (!(event.target as HTMLElement).closest('button')) canvas.focus({preventScroll:true});
  },true);
  canvas.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-start[0],event.clientY-start[1])>8)moved=true;},true);
  canvas.addEventListener('click',event=>{if(moved && event.detail){event.preventDefault();event.stopImmediatePropagation();}},true);

  return {
    refresh,
    select(id:string, focus = true) {
      const marker = markers.get(id); if(!marker) return;
      const old = markers.get(selectedId)!;
      if (id !== selectedId) {
        map.removeLayer(old); old.setZIndexOffset(0); clusters.addLayer(old);
        clusters.removeLayer(marker); marker.addTo(map).setZIndexOffset(1000);
      }
      selectedId = id;
      for(const [key,button] of buttons) {
        button.classList.toggle('active',key===id);
        button.setAttribute('aria-pressed',String(key===id));
      }
      if (focus) map.setView(marker.getLatLng(),Math.max(map.getZoom(),fitZoom+1),{animate:false});
      document.querySelector('#map-selection-status')!.textContent = `Выбран: ${places.find(p=>p.id===id)!.name}`;
    },
  };
}
