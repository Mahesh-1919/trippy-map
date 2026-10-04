import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { LngLat } from '../nav/types';

export interface LeafletMapRef {
  /** Center on a point; zoom optional. */
  setView(center: LngLat, zoom?: number): void;
  /** Fit all given points in view (leaving room for the top/bottom panels). */
  fit(points: LngLat[]): void;
}

interface Props {
  position: LngLat | null;
  route: LngLat[] | null;
  destination: LngLat | null;
  onLongPress: (c: LngLat) => void;
  onUserDrag: () => void;
}

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;background:#e8e8e8}
.me{width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)}
.dest{width:18px;height:18px;border-radius:50%;background:#d93025;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var map=L.map('map',{zoomControl:false}).setView([20,0],2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var me=null,dest=null,line=null,casing=null;
var icon=function(c){return L.divIcon({className:'',html:'<div class="'+c+'"></div>',iconSize:[20,20],iconAnchor:[10,10]})};
map.on('dragstart',function(){post({t:'drag'})});
// long-press = pick destination
var timer=null,start=null;
var el=map.getContainer();
el.addEventListener('touchstart',function(e){
  if(e.touches.length!==1){clearTimeout(timer);return}
  var t=e.touches[0];start=[t.clientX,t.clientY];
  timer=setTimeout(function(){
    var p=map.mouseEventToLatLng({clientX:start[0],clientY:start[1]});
    post({t:'longpress',lat:p.lat,lng:p.lng});
  },600);
},{passive:true});
el.addEventListener('touchmove',function(e){
  var t=e.touches[0];
  if(start&&Math.hypot(t.clientX-start[0],t.clientY-start[1])>10)clearTimeout(timer);
},{passive:true});
['touchend','touchcancel'].forEach(function(n){el.addEventListener(n,function(){clearTimeout(timer)},{passive:true})});
map.on('contextmenu',function(e){post({t:'longpress',lat:e.latlng.lat,lng:e.latlng.lng})});
window.cmd=function(c){
  if(c.k==='pos'){
    var ll=[c.lat,c.lng];
    if(!me)me=L.marker(ll,{icon:icon('me'),interactive:false,zIndexOffset:1000}).addTo(map);else me.setLatLng(ll);
  }else if(c.k==='view'){
    map.setView([c.lat,c.lng],c.zoom||map.getZoom(),{animate:true});
  }else if(c.k==='dest'){
    if(dest){map.removeLayer(dest);dest=null}
    if(c.lat!=null)dest=L.marker([c.lat,c.lng],{icon:icon('dest'),interactive:false}).addTo(map);
  }else if(c.k==='route'){
    if(line){map.removeLayer(line);map.removeLayer(casing);line=casing=null}
    if(c.pts&&c.pts.length>1){
      casing=L.polyline(c.pts,{color:'#fff',weight:10,opacity:.9,lineCap:'round'}).addTo(map);
      line=L.polyline(c.pts,{color:'#1a73e8',weight:6,lineCap:'round'}).addTo(map);
    }
  }else if(c.k==='fit'){
    map.fitBounds(c.pts,{paddingTopLeft:[30,150],paddingBottomRight:[30,230]});
  }
};
post({t:'ready'});
</script></body></html>`;

export const LeafletMap = forwardRef<LeafletMapRef, Props>(function LeafletMap(
  { position, route, destination, onLongPress, onUserDrag },
  ref,
) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const send = useCallback((cmd: object) => {
    web.current?.injectJavaScript(`window.cmd(${JSON.stringify(cmd)});true;`);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setView: (c, zoom) => send({ k: 'view', lat: c[1], lng: c[0], zoom }),
      fit: (pts) => send({ k: 'fit', pts: pts.map((p) => [p[1], p[0]]) }),
    }),
    [send],
  );

  useEffect(() => {
    if (ready && position) send({ k: 'pos', lat: position[1], lng: position[0] });
  }, [ready, position, send]);

  useEffect(() => {
    if (!ready) return;
    send({ k: 'route', pts: route ? route.map((p) => [p[1], p[0]]) : null });
  }, [ready, route, send]);

  useEffect(() => {
    if (!ready) return;
    send(destination ? { k: 'dest', lat: destination[1], lng: destination[0] } : { k: 'dest' });
  }, [ready, destination, send]);

  const onMessage = (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data);
    if (m.t === 'ready') setReady(true);
    else if (m.t === 'longpress') onLongPress([m.lng, m.lat]);
    else if (m.t === 'drag') onUserDrag();
  };

  return (
    <WebView
      ref={web}
      style={styles.web}
      originWhitelist={['*']}
      source={{ html: HTML, baseUrl: 'https://localhost/' }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      overScrollMode="never"
    />
  );
});

const styles = StyleSheet.create({ web: { flex: 1 } });
