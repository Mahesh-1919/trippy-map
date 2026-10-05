import { MAP_STYLE_DARK, MAP_STYLE_LIGHT } from '../config';

/**
 * Vector map page (MapLibre GL JS + OpenFreeMap). Commands arrive via window.cmd({k, ...}):
 *   pos {lat,lng,heading}      user marker          mode {nav}                   dot+cone vs. navigation arrow
 *   view {lat,lng,zoom,bearing,pitch}  camera       routes {routes:[{pts:[[lat,lng]],sel,label}]}
 *   dest {lat,lng}             destination pin      origin {lat,lng}             custom start marker
 *   fit {pts}                  frame the routes     theme {v:'light'|'dark'}     style
 * Posts back: ready | drag | longpress {lat,lng} | selectroute {idx} | nowebgl | err
 */
export const vectorHtml = (theme: 'light' | 'dark') => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script>
window.onerror=function(m,s,l){window.ReactNativeWebView.postMessage(JSON.stringify({t:'err',m:m+' @'+l}))};
</script>
<style>
html,body,#map{height:100%;margin:0;background:#e8e8e8}
.maplibregl-ctrl-attrib{font-size:10px}
.me{position:relative;width:22px;height:22px}
.me .pulse{position:absolute;left:-9px;top:-9px;width:40px;height:40px;border-radius:50%;background:rgba(26,115,232,.28);animation:p 2s ease-out infinite}
@keyframes p{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.2);opacity:0}}
.me .dot{position:absolute;inset:0;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)}
.me .cone{position:absolute;left:-19px;top:-19px;width:60px;height:60px;display:none}
.me .cone:before{content:'';position:absolute;left:20px;top:-4px;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:20px solid rgba(26,115,232,.6)}
.me .chev{position:absolute;left:-9px;top:-9px;width:40px;height:40px;display:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
.me.nav .pulse,.me.nav .dot,.me.nav .cone{display:none!important}
.me.nav .chev{display:block}
.pinwrap{width:32px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
.orig{width:18px;height:18px;border-radius:50%;background:#fff;border:5px solid #1a73e8;box-shadow:0 1px 4px rgba(0,0,0,.4);box-sizing:border-box}
.rlabel{padding:3px 8px;border-radius:12px;font:600 12px/1.2 sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);border:1.5px solid #9aa0a6;background:#fff;color:#3c4043}
.rlabel.sel{background:#1a73e8;border-color:#fff;color:#fff}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var STYLES={light:'${MAP_STYLE_LIGHT}',dark:'${MAP_STYLE_DARK}'};
var theme='${theme}';
var EMPTY={type:'FeatureCollection',features:[]};
var hasGL=false;
try{var cv=document.createElement('canvas');hasGL=!!(cv.getContext('webgl2')||cv.getContext('webgl'))}catch(e){}
if(!window.maplibregl||!hasGL){post({t:'nowebgl'})}else{
var map=new maplibregl.Map({container:'map',style:STYLES[theme],center:[0,20],zoom:2,attributionControl:{compact:true},pitchWithRotate:true,dragRotate:true});
var routes=[],labels=[],me=null,meEl=null,cone=null,chev=null,dest=null,orig=null,heading=null,navMode=false;
var PIN='<svg class="pinwrap" viewBox="0 0 32 42"><path d="M16 1C8 1 2 7 2 15c0 10 14 26 14 26s14-16 14-26C30 7 24 1 16 1z" fill="#d93025" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>';
var CHEV='<svg viewBox="0 0 40 40"><path d="M20 3 L35 35 L20 28 L5 35 Z" fill="#1a73e8" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
function toFeatures(){
  return {type:'FeatureCollection',features:routes.map(function(r,i){
    return {type:'Feature',properties:{idx:i,sel:r.sel?1:0},geometry:{type:'LineString',coordinates:r.pts.map(function(p){return [p[1],p[0]]})}};
  })};
}
function applyOverlays(){
  if(!map.getSource('routes')){
    map.addSource('routes',{type:'geojson',data:EMPTY});
    var lay={'line-cap':'round','line-join':'round'};
    map.addLayer({id:'alt-hit',type:'line',source:'routes',filter:['==',['get','sel'],0],layout:lay,paint:{'line-width':28,'line-opacity':0}});
    map.addLayer({id:'alt-casing',type:'line',source:'routes',filter:['==',['get','sel'],0],layout:lay,paint:{'line-color':'#ffffff','line-width':9}});
    map.addLayer({id:'alt-line',type:'line',source:'routes',filter:['==',['get','sel'],0],layout:lay,paint:{'line-color':'#8e9aab','line-width':5.5}});
    map.addLayer({id:'route-casing',type:'line',source:'routes',filter:['==',['get','sel'],1],layout:lay,paint:{'line-color':'#ffffff','line-width':11}});
    map.addLayer({id:'route-line',type:'line',source:'routes',filter:['==',['get','sel'],1],layout:lay,paint:{'line-color':'#1a73e8','line-width':7}});
  }
  map.getSource('routes').setData(routes.length?toFeatures():EMPTY);
}
function drawLabels(){
  labels.forEach(function(m){m.remove()});labels=[];
  if(routes.length<2)return;
  var fr=[0.5,0.38,0.62];
  routes.forEach(function(r,i){
    var pts=r.pts;if(pts.length<2)return;
    var p=pts[Math.min(pts.length-1,Math.floor(pts.length*fr[i%3]))];
    var el=document.createElement('div');
    el.className='rlabel'+(r.sel?' sel':'');el.textContent=r.label;
    el.addEventListener('click',function(ev){ev.stopPropagation();post({t:'selectroute',idx:i})});
    labels.push(new maplibregl.Marker({element:el}).setLngLat([p[1],p[0]]).addTo(map));
  });
}
function updateRot(){
  var b=heading==null?null:heading-map.getBearing();
  if(cone){if(b==null||navMode)cone.style.display='none';else{cone.style.display='block';cone.style.transform='rotate('+b+'deg)'}}
  if(chev){chev.style.transform='rotate('+(b==null?0:b)+'deg)'}
}
map.on('click','alt-hit',function(e){
  if(e.features&&e.features.length)post({t:'selectroute',idx:e.features[0].properties.idx});
});
map.on('style.load',applyOverlays);
map.on('rotate',updateRot);
map.on('error',function(e){post({t:'err',m:String(e&&e.error&&e.error.message||e)})});
map.on('dragstart',function(){post({t:'drag'})});
map.on('rotatestart',function(e){if(e.originalEvent)post({t:'drag'})});
map.on('pitchstart',function(e){if(e.originalEvent)post({t:'drag'})});
// long-press = pick destination
var timer=null,start=null,el=map.getCanvasContainer();
el.addEventListener('touchstart',function(e){
  clearTimeout(timer);
  if(e.touches.length!==1)return;
  var t=e.touches[0];start=[t.clientX,t.clientY];
  timer=setTimeout(function(){
    var r=el.getBoundingClientRect();
    var p=map.unproject([start[0]-r.left,start[1]-r.top]);
    post({t:'longpress',lat:p.lat,lng:p.lng});
  },600);
},{passive:true});
el.addEventListener('touchmove',function(e){
  var t=e.touches[0];
  if(start&&Math.hypot(t.clientX-start[0],t.clientY-start[1])>10)clearTimeout(timer);
},{passive:true});
['touchend','touchcancel'].forEach(function(n){el.addEventListener(n,function(){clearTimeout(timer)},{passive:true})});
function mkMarker(html,cls,anchor,lat,lng){
  var d=document.createElement('div');if(cls)d.className=cls;d.innerHTML=html;
  return new maplibregl.Marker({element:d,anchor:anchor||'center'}).setLngLat([lng,lat]).addTo(map);
}
window.cmd=function(c){
  if(c.k==='pos'){
    if(!me){
      meEl=document.createElement('div');
      meEl.className='me'+(navMode?' nav':'');
      meEl.innerHTML='<div class="pulse"></div><div class="cone"></div><div class="dot"></div><div class="chev">'+CHEV+'</div>';
      cone=meEl.querySelector('.cone');chev=meEl.querySelector('.chev');
      me=new maplibregl.Marker({element:meEl}).setLngLat([c.lng,c.lat]).addTo(map);
    }else me.setLngLat([c.lng,c.lat]);
    heading=c.heading==null?null:c.heading;updateRot();
  }else if(c.k==='mode'){
    navMode=!!c.nav;if(meEl)meEl.className='me'+(navMode?' nav':'');updateRot();
  }else if(c.k==='view'){
    map.easeTo({center:[c.lng,c.lat],zoom:c.zoom!=null?c.zoom:map.getZoom(),bearing:c.bearing||0,pitch:c.pitch||0,duration:800});
  }else if(c.k==='dest'){
    if(dest){dest.remove();dest=null}
    if(c.lat!=null)dest=mkMarker(PIN,'','bottom',c.lat,c.lng);
  }else if(c.k==='origin'){
    if(orig){orig.remove();orig=null}
    if(c.lat!=null)orig=mkMarker('<div class="orig"></div>','','center',c.lat,c.lng);
  }else if(c.k==='routes'){
    routes=c.routes||[];
    if(map.isStyleLoaded()||map.getSource('routes'))applyOverlays();
    drawLabels();
  }else if(c.k==='fit'){
    var b=new maplibregl.LngLatBounds();
    c.pts.forEach(function(p){b.extend([p[1],p[0]])});
    map.fitBounds(b,{padding:{top:230,bottom:340,left:40,right:40},pitch:0,bearing:0,duration:800});
  }else if(c.k==='theme'){
    if(c.v!==theme){theme=c.v;map.setStyle(STYLES[theme],{diff:false})}
  }
};
post({t:'ready'});
}
</script></body></html>`;
