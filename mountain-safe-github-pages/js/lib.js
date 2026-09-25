/* Чистые функции без DOM: используются и в браузере, и в тестах (node --test). */
(function(root){
'use strict';
function wxRisk(w){let s=0,r=[];
 if(w.wind>=50){s+=3;r.push('Сильный ветер')}else if(w.wind>=30){s+=2;r.push('Ветер усиливается')}else if(w.wind>=20)s+=1;
 if(w.storm>=60){s+=3;r.push('Высокая вероятность грозы')}else if(w.storm>=30){s+=2;r.push('Возможна гроза')}
 if(w.rain>=5){s+=2;r.push('Сильные осадки')}else if(w.rain>=1)s+=1;
 if(w.vis<1){s+=3;r.push('Очень плохая видимость')}else if(w.vis<5){s+=2;r.push('Плохая видимость')}else if(w.vis<10)s+=1;
 if(w.temp<=0){s+=2;r.push('Мороз, риск переохлаждения')}else if(w.temp<=5){s+=1;r.push('Холодно: риск переохлаждения')}else if(w.temp>=32){s+=2;r.push('Жара, риск перегрева')}else if(w.temp>=28)s+=1;
 return{s,l:s<=1?0:s<=3?1:s<=5?2:3,r}}
function routeCalc(r){const h=r.dist/4+r.up/500;const sc=r.dist/8+r.up/500+Math.max(0,r.max-2500)/500;return{h,d:sc<1.5?0:sc<3?1:sc<4.5?2:3}}
const hm=h=>{const m=Math.round(h*60);return Math.floor(m/60)+' ч '+String(m%60).padStart(2,'0')+' мин'};
function addTime(t,h){const [a,b]=String(t).split(':').map(Number);let m=((a||0)*60+(b||0)+Math.round(h*60));m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}

/* координаты */
const fmtCoord=(lat,lon)=>lat.toFixed(5)+', '+lon.toFixed(5);
function parseCoord(s){const m=String(s||'').match(/(-?\d{1,3}(?:[.,]\d+)?)[\s,;]+(-?\d{1,3}(?:[.,]\d+)?)/);if(!m)return null;const lat=parseFloat(m[1].replace(',','.')),lon=parseFloat(m[2].replace(',','.'));if(!(Math.abs(lat)<=90&&Math.abs(lon)<=180))return null;return{lat,lon}}
function haversine(a,b){const R=6371000,t=Math.PI/180,dLa=(b[0]-a[0])*t,dLo=(b[1]-a[1])*t;const x=Math.sin(dLa/2)**2+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x))}

/* GPX */
const unxml=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').trim().slice(0,80);
function parseGpx(t){const nm=/<name>\s*(?:<!\[CDATA\[)?([^<\]]*)/.exec(t);const pts=[];const re=/<(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;let m;
 while((m=re.exec(t))){const la=/lat\s*=\s*["']([-\d.]+)["']/.exec(m[2]),lo=/lon\s*=\s*["']([-\d.]+)["']/.exec(m[2]);if(!la||!lo)continue;const lat=+la[1],lon=+lo[1];if(!(Math.abs(lat)<=90&&Math.abs(lon)<=180))continue;const el=m[3]&&/<ele>\s*([-\d.eE+]+)\s*<\/ele>/.exec(m[3]);pts.push([lat,lon,el?+el[1]:null])}
 return{name:unxml(nm&&nm[1]),pts}}
function thin(a,max){if(a.length<=max)return a.slice();const o=[],st=(a.length-1)/(max-1);for(let i=0;i<max;i++)o.push(a[Math.round(i*st)]);return o}
function trackStats(pts){let d=0,up=0,down=0,max=-Infinity,min=Infinity,ref=null;const el=pts.map(p=>p[2]),has=el.some(v=>v!=null);
 const sm=el.map((v,i)=>{if(v==null)return null;let s=0,c=0;for(let k=Math.max(0,i-2);k<=Math.min(el.length-1,i+2);k++)if(el[k]!=null){s+=el[k];c++}return s/c});
 const prof=[];
 for(let i=0;i<pts.length;i++){if(i>0)d+=haversine(pts[i-1],pts[i]);const e=sm[i];
  if(e!=null){max=Math.max(max,e);min=Math.min(min,e);if(ref==null)ref=e;else if(e-ref>=3){up+=e-ref;ref=e}else if(ref-e>=3){down+=ref-e;ref=e}}
  prof.push([d/1000,e])}
 return{dist:Math.round(d/100)/10,up:Math.round(up),down:Math.round(down),max:has?Math.round(max):null,min:has?Math.round(min):null,hasEle:has,profile:thin(prof,120)}}
function nearestKm(pts,lat,lon){let d=0,best=Infinity,bk=0;for(let i=0;i<pts.length;i++){if(i>0)d+=haversine(pts[i-1],pts[i]);const dd=haversine(pts[i],[lat,lon]);if(dd<best){best=dd;bk=d/1000}}return{km:Math.round(bk*10)/10,off:Math.round(best)}}

/* Open-Meteo → внутренняя модель */
function stormProb(code,cape){let p=5;if(code>=95)p=85;else if(code>=80&&code<=82)p=20;if(cape!=null){if(cape>=2000)p=Math.max(p,60);else if(cape>=1000)p=Math.max(p,40);else if(cape>=500)p=Math.max(p,20)}return p}
function openMeteoToWx(j){const c=j.current||{},h=j.hourly||{},tt=h.time||[],hourly=[];
 for(let i=0;i<Math.min(tt.length,6);i++){const vis=h.visibility&&h.visibility[i]!=null?h.visibility[i]/1000:30;hourly.push({h:+String(tt[i]).slice(11,13),w:{temp:Math.round(h.temperature_2m[i]),wind:Math.round(h.wind_speed_10m[i]),rain:h.precipitation?h.precipitation[i]||0:0,vis:Math.min(30,vis),storm:stormProb(h.weather_code&&h.weather_code[i],h.cape&&h.cape[i])}})}
 const f=hourly[0]?hourly[0].w:{vis:30,storm:5};
 return{elev:j.elevation,code:c.weather_code,cur:{temp:Math.round(c.temperature_2m),wind:Math.round(c.wind_speed_10m),rain:c.precipitation||0,vis:f.vis,storm:stormProb(c.weather_code,h.cape&&h.cape[0])},hourly}}

const api={wxRisk,routeCalc,hm,addTime,fmtCoord,parseCoord,haversine,parseGpx,thin,trackStats,nearestKm,stormProb,openMeteoToWx};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(typeof window!=='undefined'?window:globalThis);
