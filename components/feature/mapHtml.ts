import { colors } from '@/constants/theme';

export interface MapVillagePin {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  listingCount?: number;
  minPrice?: string;
  photo?: string;
}

export interface MapHtmlOptions {
  villages: MapVillagePin[];
  selectedVillageId?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  interactive?: boolean;
}

export function generateMapHtml({
  villages,
  selectedVillageId,
  center,
  zoom = 8,
  interactive = true,
}: MapHtmlOptions): string {
  const villagesJson = JSON.stringify(villages);
  const defaultCenter = center || { lat: 7.8731, lng: 80.7718 }; // Central Sri Lanka
  const primaryColor = colors.primary || '#8B5A2B';
  const accentColor = colors.accent || '#D97706';
  const bgColor = colors.bg || '#FBF7F1';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>RootedStay Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: ${bgColor}; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .custom-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate(-50%, -100%);
      transition: transform 0.2s ease;
    }
    .custom-pin:hover, .custom-pin.selected {
      transform: translate(-50%, -105%) scale(1.1);
      z-index: 9999 !important;
    }
    .pin-pill {
      background: #FFFFFF;
      color: #2D1E12;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      border: 1.5px solid ${primaryColor};
      white-space: nowrap;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .custom-pin.selected .pin-pill {
      background: ${primaryColor};
      color: #FFFFFF;
      border-color: ${accentColor};
    }
    .pin-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${primaryColor};
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
    }
    .custom-pin.selected .pin-icon {
      background: ${accentColor};
      box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.35), 0 3px 10px rgba(0,0,0,0.4);
    }
    .pin-tip {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid ${primaryColor};
      margin-top: -1px;
    }
    .custom-pin.selected .pin-tip {
      border-top-color: ${accentColor};
    }
    .leaflet-popup-content-wrapper {
      border-radius: 14px;
      padding: 4px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    }
    .popup-card {
      padding: 8px 10px;
      min-width: 170px;
    }
    .popup-title {
      font-size: 15px;
      font-weight: 700;
      color: #2D1E12;
      margin-bottom: 2px;
    }
    .popup-sub {
      font-size: 12px;
      color: #6B5A48;
      margin-bottom: 8px;
    }
    .popup-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: ${primaryColor};
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 8px;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
    .recenter-btn {
      position: absolute;
      bottom: 16px;
      right: 16px;
      z-index: 1000;
      background: #FFFFFF;
      color: ${primaryColor};
      border: 1.5px solid ${colors.border || '#E6D5BC'};
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 3px 10px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="recenterBtn" class="recenter-btn" onclick="fitAll()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
    Fit villages
  </button>

  <script>
    var villages = ${villagesJson};
    var selectedId = ${JSON.stringify(selectedVillageId || '')};
    var markers = {};

    var map = L.map('map', {
      zoomControl: ${interactive ? 'true' : 'false'},
      attributionControl: false,
      scrollWheelZoom: ${interactive ? 'true' : 'false'},
      dragging: ${interactive ? 'true' : 'false'},
      touchZoom: ${interactive ? 'true' : 'false'},
    }).setView([${defaultCenter.lat}, ${defaultCenter.lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    function notifyParent(vId) {
      selectedId = vId;
      updateSelectedMarker();
      var msg = JSON.stringify({ type: 'SELECT_VILLAGE', villageId: vId });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent) {
        window.parent.postMessage(msg, '*');
      }
    }

    function createIcon(village, isSel) {
      var count = village.listingCount || 0;
      var countText = count > 0 ? ' (' + count + ')' : '';
      var html = '<div class="custom-pin' + (isSel ? ' selected' : '') + '">' +
        '<div class="pin-pill">' + village.name + countText + '</div>' +
        '<div class="pin-icon">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
            '<polyline points="9 22 9 12 15 12 15 22"/>' +
          '</svg>' +
        '</div>' +
        '<div class="pin-tip"></div>' +
      '</div>';
      return L.divIcon({
        html: html,
        className: 'custom-div-icon',
        iconSize: [120, 60],
        iconAnchor: [60, 60],
      });
    }

    function updateSelectedMarker() {
      villages.forEach(function(v) {
        if (markers[v.id]) {
          markers[v.id].setIcon(createIcon(v, v.id === selectedId));
        }
      });
    }

    var bounds = [];
    villages.forEach(function(v) {
      var isSel = (v.id === selectedId);
      var marker = L.marker([v.lat, v.lng], { icon: createIcon(v, isSel) }).addTo(map);
      markers[v.id] = marker;
      bounds.push([v.lat, v.lng]);

      var countStr = (v.listingCount || 0) + ' stay' + (v.listingCount === 1 ? '' : 's') + ' & experiences';
      var popupContent = '<div class="popup-card">' +
        '<div class="popup-title">' + v.name + '</div>' +
        '<div class="popup-sub">' + (v.region || 'Sri Lanka') + ' &middot; ' + countStr + '</div>' +
        '<button class="popup-btn" onclick="notifyParent(\\'' + v.id + '\\')">View Stays</button>' +
      '</div>';
      marker.bindPopup(popupContent, { offset: [0, -45] });

      marker.on('click', function() {
        notifyParent(v.id);
      });
    });

    function fitAll() {
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 12);
      } else {
        map.setView([${defaultCenter.lat}, ${defaultCenter.lng}], ${zoom});
      }
    }

    // Auto fit on initial load
    if (bounds.length > 0 && !selectedId) {
      fitAll();
    } else if (selectedId && markers[selectedId]) {
      var target = markers[selectedId].getLatLng();
      map.setView(target, 12);
      markers[selectedId].openPopup();
    }

    window.flyToVillage = function(vId) {
      selectedId = vId;
      updateSelectedMarker();
      if (markers[vId]) {
        map.flyTo(markers[vId].getLatLng(), 13, { duration: 1.2 });
        markers[vId].openPopup();
      }
    };

    window.addEventListener('message', function(e) {
      var data = e.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(err) {}
      }
      if (data && data.type === 'FLY_TO' && data.villageId) {
        window.flyToVillage(data.villageId);
      }
    });
  </script>
</body>
</html>`;
}
