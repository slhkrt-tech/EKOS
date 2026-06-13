import turkeyGeoJson from './tr-cities.json';

// Ray-Casting Algoritması
function pointInPolygon(point, vs) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 81 İl İçinde Arama Yapan Ana Fonksiyon
export function findProvinceByCoordinates(latitude, longitude) {
    const point = [longitude, latitude]; // GeoJSON [lng, lat] kullanır

    for (let feature of turkeyGeoJson.features) {
        const geometryType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;

        if (geometryType === 'Polygon') {
            if (pointInPolygon(point, coordinates[0])) {
                return feature.properties.name; // Örn: "Adana"
            }
        } else if (geometryType === 'MultiPolygon') {
            for (let polygon of coordinates) {
                if (pointInPolygon(point, polygon[0])) {
                    return feature.properties.name; // Örn: "İstanbul"
                }
            }
        }
    }
    
    return null; // Türkiye sınırları dışında
}