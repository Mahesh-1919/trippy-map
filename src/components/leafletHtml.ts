/**
 * Raster fallback page used only when the device WebView has no WebGL.
 * Same command protocol as the vector page (bearing/pitch/theme/mode are ignored).
 */
export const LEAFLET_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;background:#e8e8e8}
.me{width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)}
.dest{width:18px;height:18px;border-radius:50%;background:#d93025;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)}
.orig{width:18px;height:18px;border-radius:50%;background:#fff;border:5px solid #1a73e8;box-sizing:border-box}
.rlabel{padding:3px 8px;border-radius:12px;font:600 12px/1.2 sans-serif;white-space:nowrap;border:1.5px solid #9aa0a6;background:#fff;color:#3c4043}
.rlabel.sel{background:#1a73e8;border-color:#fff;color:#fff}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var map=L.map('map',{zoomControl:false}).setView([20,0],2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var me=null,dest=null,orig=null,layers=[];
var icon=function(c){return L.divIcon({className:'',html:'<div class="'+c+'"></div>',iconSize:[20,20],iconAnchor:[10,10]})};
map.on('dragstart',function(){post({t:'drag'})});
var timer=null,start=null,el=map.getContainer();
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
function marker(old,cls,c){
  if(old)map.removeLayer(old);
  return c.lat!=null?L.marker([c.lat,c.lng],{icon:icon(cls),interactive:false}).addTo(map):null;
}
window.cmd=function(c){
  if(c.k==='pos'){
    var ll=[c.lat,c.lng];
    if(!me)me=L.marker(ll,{icon:icon('me'),interactive:false,zIndexOffset:1000}).addTo(map);else me.setLatLng(ll);
  }else if(c.k==='view'){
    map.setView([c.lat,c.lng],c.zoom||map.getZoom(),{animate:true});
  }else if(c.k==='dest'){dest=marker(dest,'dest',c)}
  else if(c.k==='origin'){orig=marker(orig,'orig',c)}
  else if(c.k==='routes'){
    layers.forEach(function(l){map.removeLayer(l)});layers=[];
    var list=(c.routes||[]).map(function(r,i){return {r:r,i:i}});
    list.sort(function(a,b){return (a.r.sel?1:0)-(b.r.sel?1:0)});
    list.forEach(function(o){
      var r=o.r,i=o.i;if(r.pts.length<2)return;
      layers.push(L.polyline(r.pts,{color:'#fff',weight:r.sel?11:9,opacity:.95,lineCap:'round'}).addTo(map));
      var ln=L.polyline(r.pts,{color:r.sel?'#1a73e8':'#8e9aab',weight:r.sel?7:5.5,lineCap:'round'}).addTo(map);
      ln.on('click',function(){post({t:'selectroute',idx:i})});
      layers.push(ln);
      if(c.routes.length>1){
        var p=r.pts[Math.floor(r.pts.length/2)];
        var lb=L.marker(p,{icon:L.divIcon({className:'',html:'<div class="rlabel'+(r.sel?' sel':'')+'">'+r.label+'</div>',iconSize:null})}).addTo(map);
        lb.on('click',function(){post({t:'selectroute',idx:i})});
        layers.push(lb);
      }
    });
  }else if(c.k==='fit'){
    map.fitBounds(c.pts,{paddingTopLeft:[40,230],paddingBottomRight:[40,340]});
  }
};
post({t:'ready'});
</script></body></html>`;
