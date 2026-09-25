/* ================= РЕАЛЬНЫЕ СЕРВИСЫ: GPS, погода, карта, GPX, PWA, синхронизация групп ================= */

/* ---------- GPS ---------- */
const GPS={watch:null};
const GPS_ERR={1:'Доступ к геолокации запрещён. Разрешите его в настройках браузера.',2:'Позиция недоступна. Выйдите на открытое место.',3:'Не удалось определить позицию вовремя.'};
function gpsErr(e){toast(GPS_ERR[e&&e.code]||'Геолокация недоступна')}
function gpsFix(c){
  const p={lat:c.latitude,lon:c.longitude,acc:Math.round(c.accuracy||0),alt:c.altitude!=null?Math.round(c.altitude):null,ts:Date.now()};
  S.gps=p;S.card.coords=fmtCoord(p.lat,p.lon);S.card.coordsAt=p.ts;
  if(S.tracking){const l=S.track[S.track.length-1];if(!l||haversine([l[0],l[1]],[p.lat,p.lon])>=20){S.track.push([p.lat,p.lon,p.ts]);if(S.track.length>1500)S.track=S.track.slice(-1500)}}
  save();gpsUi();return p}
function gpsOnce(){return new Promise(res=>{
  if(!navigator.geolocation){toast('Геолокация не поддерживается этим браузером');return res(null)}
  navigator.geolocation.getCurrentPosition(pos=>res(gpsFix(pos.coords)),e=>{gpsErr(e);res(null)},{enableHighAccuracy:true,timeout:20000,maximumAge:15000})})}
function gpsStart(){if(GPS.watch!=null||!navigator.geolocation)return;GPS.watch=navigator.geolocation.watchPosition(pos=>gpsFix(pos.coords),gpsErr,{enableHighAccuracy:true,maximumAge:10000,timeout:30000})}
function gpsStop(){if(GPS.watch!=null&&navigator.geolocation){navigator.geolocation.clearWatch(GPS.watch)}GPS.watch=null}
function gpsLine(){const g=S.gps;return g?`${fmtCoord(g.lat,g.lon)} · ±${g.acc} м${g.alt!=null?' · '+g.alt+' м':''} · ${agoTxt(g.ts)}`:'Позиция ещё не определена'}
function gpsUi(){const el=$('#gpsline');if(el)el.textContent=gpsLine();const co=$('#cardCo');if(co&&document.activeElement!==co&&S.gps)co.value=S.card.coords;if(typeof cardPrev==='function'&&$('#cardprev'))$('#cardprev').innerHTML=cardPrev();mapUpdateMe()}
async function shareText(t){if(navigator.share){try{await navigator.share({text:t});return}catch(e){if(e&&e.name==='AbortError')return}}copy(t)}
function smsHref(t){const ph=String(S.card.phone||'').replace(/[^\d+]/g,'');return'sms:'+ph+'?&body='+encodeURIComponent(t)}

/* ---------- погода (Open-Meteo) ---------- */
const WX_TTL=30*60000,WX_STALE=3*3600000;
function wxLoc(){
  if(S.gps&&Date.now()-S.gps.ts<24*3600000)return{lat:S.gps.lat,lon:S.gps.lon,src:'GPS'};
  const p=parseCoord(S.wxLocText);if(p)return{...p,src:'введено вручную'};
  const g=S.route.gpx;if(g&&g.pts.length){const m=g.pts[Math.floor(g.pts.length/2)];return{lat:m[0],lon:m[1],src:'середина маршрута'}}
  return null}
let wxBusy=false;
async function wxLoad(silent){
  if(MS_CONFIG.demoHost){if(!silent)toast('В онлайн-демо реальный прогноз отключён: песочница блокирует внешние запросы. В полной версии он работает.');return}
  const loc=wxLoc();
  if(!loc){if(!silent)toast('Нужны координаты: определите GPS, импортируйте GPX или введите вручную');return}
  if(conn()==='offline'){if(!silent)toast(S.wxLive?'Нет связи: показан сохранённый прогноз':'Нет связи и нет сохранённого прогноза');return}
  if(wxBusy)return;wxBusy=true;if(!silent)toast('Загружаю прогноз…');
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),9000);
  try{
    const u='https://api.open-meteo.com/v1/forecast?latitude='+loc.lat.toFixed(4)+'&longitude='+loc.lon.toFixed(4)+'&current=temperature_2m,precipitation,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation,wind_speed_10m,visibility,weather_code,cape&forecast_hours=7&wind_speed_unit=kmh&timezone=auto';
    const r=await fetch(u,{signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);
    const w=openMeteoToWx(await r.json());
    if(!Number.isFinite(w.cur.temp))throw new Error('bad data');
    S.wxLive={ts:Date.now(),lat:loc.lat,lon:loc.lon,src:loc.src,elev:w.elev,hourly:w.hourly,cur:w.cur};
    S.wx={sc:'live',...w.cur};save();if(!silent)toast('Прогноз обновлён');
  }catch(e){if(!silent)toast('Не удалось загрузить прогноз'+(S.wxLive?'. Показан сохранённый':''))}
  finally{clearTimeout(to);wxBusy=false;if(['weather','home'].includes(S.view))render()}}
const wxAgeMin=()=>S.wxLive?Math.round((Date.now()-S.wxLive.ts)/60000):null;
function wxBadge(){if(S.wx.sc==='live'&&S.wxLive){const stale=Date.now()-S.wxLive.ts>WX_STALE;return`<span class="badge ${stale?'demo':'live'}">${stale?'УСТАРЕЛО':'LIVE'}</span>`}return demoB}
function wxSourceLine(){
  if(S.wx.sc==='live'&&S.wxLive){const a=wxAgeMin(),stale=Date.now()-S.wxLive.ts>WX_STALE;return`Open-Meteo, ${S.wxLive.src}. Обновлено ${a<1?'только что':a<60?a+' мин назад':Math.round(a/60)+' ч назад'}.${stale?' Прогноз устарел, не опирайтесь на него.':''}`}
  return(WX_SC[S.wx.sc]?WX_SC[S.wx.sc].n:'Свой сценарий')+'. Демо-данные, не реальный прогноз.'}

/* ---------- GPX ---------- */
async function gpxImport(file){
  if(!file)return;if(file.size>6*1048576){toast('Файл больше 6 МБ');return}
  try{
    const t=await file.text(),g=parseGpx(t);
    if(g.pts.length<2){toast('В файле нет трека (нужны точки trkpt или rtept)');return}
    const st=trackStats(g.pts);
    S.route.gpx={pts:thin(g.pts,1500),name:g.name||file.name.replace(/\.gpx$/i,''),stats:st};
    Object.assign(S.route,{name:S.route.gpx.name,dist:st.dist,up:st.up,down:st.down,max:st.max||S.route.max,risks:[],rest:[],exits:[]});
    save();toast('Маршрут импортирован: '+st.dist+' км');render()
  }catch(e){toast('Не удалось прочитать GPX')}}
function routeIsDemo(){return!S.route.gpx}

/* ---------- карта (Leaflet + OpenStreetMap) ---------- */
let MAP=null,MAPME=null,MAPLAYER=null;
function mapDestroy(){if(MAP){try{MAP.remove()}catch(e){}}MAP=null;MAPME=null;MAPLAYER=null}
const MK={risk:'#f28b3c',rest:'#62c48a',exit:'#4c9be8'};
const mkIcon=c=>L.divIcon({className:'',html:`<div class="mk" style="background:${c}"></div>`,iconSize:[14,14],iconAnchor:[7,7]});
function mapInit(){
  const el=$('#map');if(!el||!window.L)return;
  const g=S.route.gpx;
  MAP=L.map(el,{zoomControl:true,worldCopyJump:true});
  if(!MS_CONFIG.demoHost)L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,crossOrigin:true,attribution:'© участники OpenStreetMap'}).addTo(MAP);
  MAPLAYER=L.layerGroup().addTo(MAP);
  const b=[];
  if(g){const ll=g.pts.map(p=>[p[0],p[1]]);L.polyline(ll,{color:'#62c48a',weight:4}).addTo(MAPLAYER);b.push(...ll);
    L.circleMarker(ll[0],{radius:7,color:'#fff',weight:2,fillColor:'#62c48a',fillOpacity:1}).bindTooltip('Старт').addTo(MAPLAYER)}
  if(S.track.length>1){const tl=S.track.map(p=>[p[0],p[1]]);L.polyline(tl,{color:'#4c9be8',weight:3,dashArray:'6 6'}).addTo(MAPLAYER);b.push(...tl)}
  [['risk',S.route.risks],['rest',S.route.rest],['exit',S.route.exits]].forEach(([ty,arr])=>arr.forEach(x=>{if(x.lat!=null){L.marker([x.lat,x.lon],{icon:mkIcon(MK[ty])}).bindTooltip(E(x.t)).addTo(MAPLAYER);b.push([x.lat,x.lon])}}));
  if(S.gps)b.push([S.gps.lat,S.gps.lon]);
  if(b.length)MAP.fitBounds(L.latLngBounds(b).pad(.15),{maxZoom:15});else MAP.setView([43.24,76.95],9);
  MAP.on('click',e=>{if(!S.addMode)return;const ty=S.addMode,txt=($('#npX')&&$('#npX').value.trim())||({risk:'Точка риска',rest:'Точка отдыха',exit:'Точка выхода'})[ty];
    const pt={t:txt,lat:+e.latlng.lat.toFixed(5),lon:+e.latlng.lng.toFixed(5),k:null};
    if(g){const n=nearestKm(g.pts,pt.lat,pt.lon);pt.k=n.km}
    const arr={risk:S.route.risks,rest:S.route.rest,exit:S.route.exits}[ty];arr.push(pt);save();render()});
  mapUpdateMe();
}
function mapUpdateMe(){if(!MAP||!S.gps)return;const ll=[S.gps.lat,S.gps.lon];
  if(MAPME){MAPME.setLatLng(ll)}else{MAPME=L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#2f7bd8',fillOpacity:1}).bindTooltip('Вы здесь').addTo(MAP)}}
function tileUrl(z,x,y){return'https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png'}
async function mapCacheView(){
  if(!MAP)return;if(conn()==='offline'){toast('Нет связи: сохранить карту нельзя');return}
  const z=MAP.getZoom(),b=MAP.getBounds(),n=Math.pow(2,z);
  const tx=lon=>Math.floor((lon+180)/360*n),ty=lat=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)};
  const x0=tx(b.getWest()),x1=tx(b.getEast()),y0=ty(b.getNorth()),y1=ty(b.getSouth()),cnt=(x1-x0+1)*(y1-y0+1);
  if(cnt>60){toast('Область велика ('+cnt+' плиток). Приблизьте карту: можно сохранить до 60 плиток за раз');return}
  toast('Сохраняю '+cnt+' плиток…');let ok=0;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){try{const r=await fetch(tileUrl(z,((x%n)+n)%n,y),{mode:'cors'});if(r.ok)ok++}catch(e){}}
  toast('Карта сохранена офлайн: '+ok+' из '+cnt+' плиток');pwaRefresh()}
function afterRender(){if(S.view==='route')mapInit();if(S.view==='group'&&SRV===null)srvCheck().then(()=>{if(S.view==='group')render()})}

/* ---------- PWA ---------- */
const PWA={cached:0,tiles:0,persisted:null,sw:'none',waiting:null,install:null};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();PWA.install=e;if(S.view==='offline')render()});
window.addEventListener('appinstalled',()=>{PWA.install=null;toast('Приложение установлено')});
const isStandalone=()=>window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||navigator.standalone);
async function pwaRefresh(){
  try{
    PWA.sw=navigator.serviceWorker&&navigator.serviceWorker.controller?'active':(PWA.sw==='installing'?'installing':'none');
    if(window.caches){for(const k of await caches.keys()){const c=await caches.open(k),n=(await c.keys()).length;if(k.startsWith('ms-tiles'))PWA.tiles=n;else if(k.startsWith('ms-'))PWA.cached=n}}
    if(navigator.storage&&navigator.storage.persisted)PWA.persisted=await navigator.storage.persisted();
  }catch(e){}
  if(S.view==='offline')render()}
function updateBar(){$('#updatebar').innerHTML=PWA.waiting?`<div class="update-bar"><b class="small" style="flex:1">Доступна новая версия приложения</b><button class="btn sm pri" data-a="pwaupdate">Обновить</button></div>`:''}
function pwaInit(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  navigator.serviceWorker.register('sw.js').then(reg=>{
    PWA.sw=navigator.serviceWorker.controller?'active':'installing';
    if(reg.waiting&&navigator.serviceWorker.controller){PWA.waiting=reg.waiting;updateBar()}
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){PWA.waiting=w;updateBar()}if(w.state==='activated')pwaRefresh()})});
    pwaRefresh();
  }).catch(()=>{PWA.sw='none'});
  let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;if(PWA.hadController)location.reload();PWA.hadController=true;pwaRefresh()});
  PWA.hadController=!!navigator.serviceWorker.controller;
}

/* ---------- онлайн-группы: клиент ---------- */
let SRV=null; // null = не проверяли, true/false
async function srvCheck(){if(MS_CONFIG.demoHost||MS_CONFIG.noServer){SRV=false;return false}try{const r=await fetch('api/health',{cache:'no-store'});SRV=r.ok&&(r.headers.get('content-type')||'').includes('json')}catch(e){SRV=false}return SRV}
const hdr=()=>({'Content-Type':'application/json',Authorization:'Bearer '+S.sync.token});
const Y=()=>S.sync;
async function gCreate(name,leaderName,mode){
  const r=await fetch('api/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,leaderName,mode,level:S.level})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'error');
  S.sync={...DEF().sync,code:j.code,role:'leader',memberId:j.memberId,token:j.leaderToken,name:leaderName};save();await gPull()}
async function gJoin(code,name){
  const r=await fetch('api/groups/'+encodeURIComponent(code.toUpperCase())+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,level:S.level})});
  const j=await r.json();if(!r.ok)throw new Error(r.status===404?'Группа с таким кодом не найдена':(j.error||'error'));
  S.sync={...DEF().sync,code:code.toUpperCase(),role:'member',memberId:j.memberId,token:j.memberToken,name};save();await gPull()}
function gLeave(){S.sync={...DEF().sync};save();render()}
function ageMs(m){const d=Y().data;if(!d)return 0;return Math.max(0,(d.serverNow-m.reportAt)+(Date.now()-Y().lastPull))}
const STALE_MS=10*60000;
function effStatus(m){return ageMs(m)>STALE_MS&&m.status==='ok'?'nocomm':m.status}
async function gPull(){
  const y=Y();if(!y.code||conn()==='offline')return;
  try{
    const r=await fetch('api/groups/'+y.code,{headers:hdr(),cache:'no-store'});
    if(r.status===404||r.status===401){y.error='Группа недоступна: удалена или доступ отозван';save();if(S.view==='group')render();return}
    if(!r.ok)return;
    y.data=await r.json();y.lastPull=Date.now();y.error='';save();gAlerts();
    if(S.view==='group'&&!document.activeElement.matches('input,textarea,select'))render();
    renderShell()
  }catch(e){}}
async function gFlush(){
  const y=Y();if(!y.code||!y.queue.length||conn()==='offline')return;
  try{const r=await fetch('api/groups/'+y.code+'/report',{method:'POST',headers:hdr(),body:JSON.stringify({reports:y.queue})});if(r.ok){y.queue=[];save()}}catch(e){}}
function gReport(extra={}){
  const y=Y();if(!y.code)return;
  const rep={status:y.myStatus,comm:conn()==='online'?'ok':conn()==='weak'?'weak':'none',ts:Date.now(),...extra};
  const forced=rep.status==='emergency'||rep.status==='help';
  if(S.gps&&(y.shareLoc||forced)&&Date.now()-S.gps.ts<10*60000){rep.lat=S.gps.lat;rep.lon=S.gps.lon;rep.acc=S.gps.acc}
  y.queue.push(rep);if(y.queue.length>50)y.queue=y.queue.slice(-50);save();return gFlush().then(()=>gPull())}
function gSetStatus(st){Y().myStatus=st;if(st!=='ok')gpsOnce().finally(()=>gReport());else gReport();save();if(S.view==='group')render()}
async function gCheckin(){try{const r=await fetch('api/groups/'+Y().code+'/checkin',{method:'POST',headers:hdr(),body:'{}'});if(r.ok){await gPull();toast('Запрос отметки отправлен всем')}}catch(e){toast('Нет связи с сервером')}}
async function gRemove(id){try{await fetch('api/groups/'+Y().code+'/remove',{method:'POST',headers:hdr(),body:JSON.stringify({memberId:id})});await gPull()}catch(e){}}
function gAlerts(){
  const d=Y().data;if(!d)return;
  d.members.forEach(m=>{if(m.id===Y().memberId)return;const k=m.id+':'+m.status+':'+m.reportAt;
    if((m.status==='emergency'||m.status==='help')&&!Y().seenEm[m.id+m.status]){Y().seenEm[m.id+m.status]=1;toast((m.status==='emergency'?'EMERGENCY: ':'Нужна помощь: ')+m.name);try{navigator.vibrate&&navigator.vibrate([300,150,300])}catch(e){}}
    if(m.status==='ok'){delete Y().seenEm[m.id+'emergency'];delete Y().seenEm[m.id+'help']}})}
function syncBanner(){
  const y=Y();if(!y.code||!y.data)return'';
  const em=y.data.members.filter(m=>m.id!==y.memberId&&(m.status==='emergency'||m.status==='help'));
  let h='';
  if(em.length)h+=`<div class="dngbox" style="margin-bottom:8px"><b>${em.some(m=>m.status==='emergency')?'EMERGENCY':'Нужна помощь'}:</b> ${em.map(m=>E(m.name)).join(', ')} <button class="btn sm dng" data-a="go" data-v="group">Открыть группу</button></div>`;
  if(y.role!=='leader'&&y.data.checkinAt>y.ackedAt)h+=`<div class="warnbox" style="margin-bottom:8px"><b>Руководитель запросил отметку.</b> <button class="btn sm pri" data-a="gack">Я на месте</button></div>`;
  return h}
function syncTick(){const y=Y();if(!y.code)return;gFlush().then(()=>gPull());if(y.role&&Date.now()-(y.lastHb||0)>60000){y.lastHb=Date.now();gReport()}}
setInterval(syncTick,30000);
window.addEventListener('online',()=>{gFlush().then(gPull);wxLoad(true)});

/* ---------- запуск ---------- */
function boot(){
  const q=new URLSearchParams(location.search).get('go');
  if(q&&VIEWS[q]){S.view=q}
  else if(!S.entered&&!isStandalone()&&!/source=pwa/.test(location.search))S.view='landing';
  pwaInit();
  if(S.tracking)gpsStart();
  if(S.sync.code)syncTick();
  if(S.wxLive&&conn()!=='offline'&&Date.now()-S.wxLive.ts>WX_TTL)wxLoad(true);
}
