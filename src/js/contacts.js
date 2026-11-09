import monogramUrl from '../../images/n-monogram.svg';

let apiPromise;
function loadApi(key) {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => reject(new Error('timeout')), 20000);
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.onload = () => window.ymaps.ready(() => { clearTimeout(timeout); resolve(window.ymaps); });
    script.onerror = () => { clearTimeout(timeout); reject(new Error('network')); };
    document.head.append(script);
  });
  return apiPromise;
}

export async function initContactsMap(root) {
  if (root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const status = root.querySelector('[data-map-status]');
  const canvas = root.querySelector('[data-map-canvas]');
  const fail = () => { status.hidden = false; status.textContent = 'Не удалось загрузить карту. Постройте маршрут по ссылке у нужного салона.'; };
  if (!root.dataset.mapKey) {
    status.textContent = 'Карта временно недоступна. Постройте маршрут по ссылке у нужного салона.';
    return;
  }
  let map;
  try {
    const ymaps = await loadApi(root.dataset.mapKey);
    const [city] = JSON.parse(root.dataset.mapCities);
    const points = JSON.parse(root.dataset.mapPoints);
    map = new ymaps.Map(canvas, { center: city.center, zoom: city.zoom, controls: ['zoomControl'] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
    map.behaviors.disable('scrollZoom');
    const pin = ymaps.templateLayoutFactory.createClass(`<div class="salon-pin"><img src="${monogramUrl}" alt="" /></div>`);
    const clusterer = new ymaps.Clusterer({ preset: 'islands#grayClusterIcons', groupByCoordinates: false });
    const markers = points.map(point => {
      if (!Array.isArray(point.coordinates) || point.coordinates.length !== 2) throw new Error('coordinates');
      return new ymaps.Placemark(point.coordinates, {
        hintContent: `${point.name} · ${point.address}`,
        balloonContentHeader: point.name,
        balloonContentBody: `${point.address}<br>Ежедневно, 9:00–20:00<br>${point.phone}`,
      }, { iconLayout: pin, iconShape: { type: 'Circle', coordinates: [0, -26], radius: 28 } });
    });
    clusterer.add(markers);
    map.geoObjects.add(clusterer);
    await map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 50 });
    const resize = new ResizeObserver(() => map.container.fitToViewport());
    resize.observe(canvas);
    window.addEventListener('pagehide', () => { resize.disconnect(); map.destroy(); }, { once: true });
    const tiles = map.layers.get(0).get(0);
    const started = Date.now();
    const poll = setInterval(() => {
      const tileStatus = tiles.getTileStatus();
      if (tileStatus.totalTileNumber > 0 && tileStatus.readyTileNumber >= tileStatus.totalTileNumber) {
        clearInterval(poll);
        status.hidden = true;
      } else if (Date.now() - started > 15000) {
        clearInterval(poll);
        fail();
      }
    }, 250);
    window.addEventListener('pagehide', () => clearInterval(poll), { once: true });
  } catch {
    map?.destroy();
    fail();
  }
}

