/**
 * Ray-casting (even-odd) noktayı çokgenin içine düşüyor mu kontrol eder.
 * Dış kütüphane yok.
 *
 * Not: GeoJSON koordinatları genelde [lng, lat] formatındadır.
 * Fonksiyon input olarak (lat, lng) alır.
 *
 * @param {number} lat  Enlem
 * @param {number} lng  Boylam
 * @param {object} featureCollection tr-cities.json (GeoJSON FeatureCollection)
 * @returns {string|null} feature.properties.name (il adı) veya Türkiye dışıysa null
 */
export function findProvinceByLatLng(lat, lng, featureCollection) {
  if (!featureCollection?.features?.length) return null;

  // x=lng, y=lat
  const x = Number(lng);
  const y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  for (const feature of featureCollection.features) {
    const geom = feature?.geometry;
    const name = feature?.properties?.name || null;
    if (!geom || !name) continue;

    if (pointInGeometry([x, y], geom)) return name;
  }

  return null;
}

function pointInGeometry(pointXY, geom) {
  const { type, coordinates } = geom;
  if (type === 'Polygon') {
    // coordinates: [ring1, ring2, ...]
    return pointInPolygon(pointXY, coordinates);
  }
  if (type === 'MultiPolygon') {
    // coordinates: [polygon1, polygon2, ...] (polygon: [ring1, ring2, ...])
    return coordinates.some((polygonCoords) => pointInPolygon(pointXY, polygonCoords));
  }
  return false;
}

function pointInPolygon(pointXY, polygonCoords) {
  // polygonCoords: [ring1, ring2, ...]
  // Even-odd kuralı: tüm ringlerde toggle.
  // (Hole ringleri varsa bu yaklaşım iç-dış ayrımını da doğru yapar.)
  let inside = false;

  for (const ring of polygonCoords) {
    if (!ring || ring.length < 3) continue;
    inside = ringRayCastingToggle(pointXY, ring, inside);
    if (inside === true) return true; // kenar/sonuç kesinliği
  }

  return inside;
}

/**
 * Ray-casting: Nokta ring içinde ise inside toggle eder.
 * Kenarın üstünde ise doğrudan true döner.
 *
 * @param {[number, number]} p [x,y]
 * @param {Array<[number, number]>} ring
 * @param {boolean} inside
 * @returns {boolean}
 */
function ringRayCastingToggle(p, ring, inside) {
  const x = p[0];
  const y = p[1];

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    // Kenarda ise true (toggle yerine direkt sonuca güven)
    const eps = 1e-12;
    if (pointOnSegment(x, y, xi, yi, xj, yj, eps)) {
      return true;
    }

    // Segment yatay (y) doğrusu ile kesişiyor mu?
    const intersects = (yi > y) !== (yj > y) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointOnSegment(px, py, x1, y1, x2, y2, eps = 1e-12) {
  // Collinear + bounding box kontrol
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  if (Math.abs(cross) > eps) return false;

  // dot <= 0 => projeksiyon segment aralığında
  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  if (dot > eps) return false;

  return true;
}

