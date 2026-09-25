/* ================= PREP ================= */
function prepWarns(){const w=[],vis=prepVis(),rk=wxRisk(S.wx),rc=routeCalc(S.route);
 const miss=vis.filter(p=>p.crit&&!S.prep[p.id]).map(p=>p.t);
 if(miss.length)w.push('Не отмечено важное: '+miss.join('; ')+'.');
 if(rk.l>=2&&!S.prep.rain)w.push('Погода (ДЕМО) тяжёлая, а дождевик не отмечен.');
 if(rc.h>6&&!S.prep.light)w.push('Маршрут долгий ('+hm(rc.h)+'): возьмите фонарик на случай темноты.');
 if(S.prep.charge&&!S.prep.pb&&rc.h>5)w.push('Долгий маршрут без powerbank: заряд может закончиться.');
 return w}
function vPrep(){const vis=prepVis(),pct=prepPct(),warns=prepWarns(),gs=[...new Set(vis.map(p=>p.g))];
 const lab=pct>=100?'Чек-лист выполнен':pct>=70?'Почти готовы':'Подготовка неполная';
 return`${head('Подготовка к походу','Отметьте, что готово. Список зависит от вашего уровня: '+lvName()+'.')}
 <div class="card"><div class="row sp"><div><div class="sect-t">Готовность к походу</div><h2 style="font-size:34px">${pct}%</h2></div><span class="badge g">${lab}</span></div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
 <div class="small muted">Готовность считает только ваш чек-лист. ${pct>=100?'Даже 100% не означает, что поход безопасен: условия в горах меняются. Оценивайте погоду и состояние группы по ходу маршрута.':'Заполните критичные пункты (оранжевая рамка).'}</div></div>
 ${warns.length?`<div class="warnbox"><b>Умная проверка</b><ul style="margin:6px 0 0;padding-left:18px">${warns.map(x=>`<li>${E(x)}</li>`).join('')}</ul></div>`:''}
 ${gs.map(g=>`<div class="col"><div class="sect-t">${g}</div>${vis.filter(p=>p.g===g).map(p=>`<button class="chk ${S.prep[p.id]?'on':''} ${p.crit?'crit':''}" data-a="prept" data-id="${p.id}" role="checkbox" aria-checked="${!!S.prep[p.id]}"><span class="bx">✓</span><span>${E(p.t)}${p.why?`<small>${E(p.why)}</small>`:''}</span></button>`).join('')}</div>`).join('')}
 <button class="btn ghost" data-a="prepreset">Сбросить отметки</button>`}

/* ================= ROUTE ================= */
function elevProfile(r){const g=r.gpx;if(g&&g.stats.hasEle&&g.stats.profile.length>1)return g.stats.profile.filter(p=>p[1]!=null);const n=DEMO_ELEV.length;return DEMO_ELEV.map((v,i)=>[i/(n-1)*r.dist,v])}
function elevSvg(r){const P=elevProfile(r),W=360,H=150,pl=38,pr=10,pt=12,pb=24,total=P[P.length-1][0]||1,ys=P.map(p=>p[1]),mn=Math.min(...ys),mx=Math.max(...ys),iw=W-pl-pr,ih=H-pt-pb,rg=(mx-mn)||1;
 const X=k=>pl+k/total*iw,Y=v=>pt+ih-(v-mn)/rg*ih;
 const yAt=k=>{for(let i=1;i<P.length;i++)if(P[i][0]>=k){const a=P[i-1],b=P[i],f=(k-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*f}return P[P.length-1][1]};
 const pts=P.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ');
 const mk=r.risks.filter(x=>x.k!=null&&x.k<=total).map(x=>`<line x1="${X(x.k)}" x2="${X(x.k)}" y1="${pt}" y2="${pt+ih}" stroke="var(--hi)" stroke-dasharray="3 3" stroke-width="1.2"/><circle cx="${X(x.k)}" cy="${Y(yAt(x.k))}" r="4.5" fill="var(--hi)"/>`).join('');
 return`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Профиль высоты"><line x1="${pl}" x2="${W-pr}" y1="${pt+ih}" y2="${pt+ih}" stroke="var(--line)"/><line x1="${pl}" x2="${W-pr}" y1="${pt}" y2="${pt}" stroke="var(--line)" stroke-dasharray="2 4"/><polygon points="${pl},${pt+ih} ${pts} ${pl+iw},${pt+ih}" fill="var(--gs)"/><polyline points="${pts}" fill="none" stroke="var(--g)" stroke-width="2.4" stroke-linejoin="round"/>${mk}<text x="${pl-6}" y="${pt+4}" text-anchor="end" font-size="10">${Math.round(mx)}</text><text x="${pl-6}" y="${pt+ih+3}" text-anchor="end" font-size="10">${Math.round(mn)}</text><text x="${pl}" y="${H-6}" font-size="10">0 км</text><text x="${W-pr}" y="${H-6}" font-size="10" text-anchor="end">${(+total).toFixed(1)} км</text></svg>`}
function trackInfo(){const t=S.track;if(t.length<2)return'След ещё не записан. Включите запись пути: по нему можно вернуться назад.';let d=0;for(let i=1;i<t.length;i++)d+=haversine(t[i-1],t[i]);const s=t[0],me=S.gps?Math.round(haversine([s[0],s[1]],[S.gps.lat,S.gps.lon])):null;return`След: ${t.length} точек, ${(d/1000).toFixed(1)} км. Точка старта следа: ${fmtCoord(s[0],s[1])}${me!=null?' ('+(me>=1000?(me/1000).toFixed(1)+' км':me+' м')+' по прямой от вас)':''}.`}
function vRoute(){const r=S.route,c=routeCalc(r),lv=S.level,d=DIFF[c.d],back=addTime(r.start,c.h*1.25),demo=routeIsDemo();
 const sm=(a,b)=>{const [h1,m1]=a.split(':').map(Number),[h2,m2]=b.split(':').map(Number);return(h2*60+m2)-(h1*60+m1)};
 const buf=sm(back,r.sunset);
 const inp=(l,p,t='number')=>`<label class="f">${l}<input type="${t}" ${t==='number'?'inputmode="decimal" data-n':''} data-i="route.${p}" data-r value="${E(r[p])}"></label>`;
 const pt=x=>(x.k!=null?x.k+' км':'')+(x.lat!=null?(x.k!=null?' · ':'')+fmtCoord(x.lat,x.lon):'');
 const listPts=(arr,ty,icn)=>arr.map((x,i)=>`<div class="emnum"><span>${icn}</span><b class="mono" style="font-size:13px;min-width:60px">${pt(x)}</b><span style="flex:1">${E(x.t)}</span>${lv>=1?`<button class="btn sm ghost" data-a="delpt" data-ty="${ty}" data-k="${i}" aria-label="Удалить">✕</button>`:''}</div>`).join('')||'<div class="muted small">Нет точек</div>';
 return`${head('Маршрут','Импортируйте трек GPX, смотрите карту, отмечайте точки риска.',demo?demoB:'<span class="badge live">GPX</span>')}
 ${demo?'<div class="warnbox">Показан пример маршрута (ДЕМО). Загрузите свой GPX-файл: дистанция, набор высоты и профиль посчитаются по нему.</div>':''}
 <div class="card"><div class="row"><label class="btn pri" for="gpxIn">Импортировать GPX</label><input id="gpxIn" class="hidden-file" type="file" accept=".gpx,application/gpx+xml,text/xml,application/xml">${demo?'':'<button class="btn" data-a="routedemo">Вернуться к примеру</button>'}</div><div class="tiny">Файл читается на вашем устройстве и никуда не отправляется.</div></div>
 <div class="card"><div class="grid g2">${inp('Название','name','text')}${inp('Дистанция, км','dist')}${inp('Набор высоты, м','up')}${inp('Максимальная высота, м','max')}${inp('Старт (чч:мм)','start','text')}${inp('Закат (чч:мм)','sunset','text')}</div><div class="tiny">Время заката введите из календаря: приложение не вычисляет его само.</div></div>
 <div class="grid g2">
  <div class="risk tone-${d.c}"><span class="dot ${d.c}"></span><div><div class="sect-t">Сложность</div><b style="font-size:20px">${d.t}</b><div class="small muted">Оценка по дистанции, набору и высоте. Ориентир, не гарантия.</div></div></div>
  <div class="card"><div class="sect-t">Время в пути</div><h2>${hm(c.h)}</h2><div class="small muted">~4 км/ч + 500 м подъёма в час. Реальное время зависит от группы.</div></div>
 </div>
 <div class="card"><div class="sect-t">План возвращения</div><div class="row sp"><div>Старт <b class="mono">${E(r.start)}</b></div><div>Вернуться ориентировочно к <b class="mono">${back}</b></div><div>Закат <b class="mono">${E(r.sunset)}</b></div></div>
 ${buf<60?`<div class="dngbox">До заката меньше часа после ожидаемого возвращения. Стартуйте раньше или сократите маршрут.</div>`:`<div class="small muted">Запас до заката: ${Math.floor(buf/60)} ч ${buf%60} мин (с запасом 25% ко времени пути).</div>`}</div>
 <div class="card"><div class="row sp"><div class="sect-t">Карта</div><span class="small mono" id="gpsline">${gpsLine()}</span></div><div id="map" class="map" role="application" aria-label="Карта маршрута"></div>
  <div class="row"><button class="btn sm" data-a="gpsnow">Моя позиция</button><button class="btn sm ${S.tracking?'pri':''}" data-a="track">${S.tracking?'Запись пути: вкл':'Запись пути: выкл'}</button><button class="btn sm" data-a="cachemap">Сохранить область офлайн</button></div>
  ${lv>=2?`<div class="row"><span class="small muted">Поставить точку касанием карты:</span>${[['','Выкл'],['risk','Риск'],['rest','Отдых'],['exit','Выход']].map(o=>`<button class="chip ${S.addMode===o[0]?'on':''}" data-a="addmode" data-v="${o[0]}">${o[1]}</button>`).join('')}</div><input id="npX" placeholder="Описание точки (необязательно)">`:''}
  <div class="tiny">${MS_CONFIG.demoHost?'В онлайн-демо подложка карты отключена (нужен доступ к серверу плиток), трек и точки показываются. ':''}${E(trackInfo())} Карта: © участники OpenStreetMap. Офлайн доступны только просмотренные и сохранённые области.</div></div>
 ${lv>=1?`<div class="card"><div class="row sp"><div class="sect-t">Профиль высоты</div>${demo?demoB:''}</div>${elevSvg(r)}<div class="tiny">Оранжевые точки: риски на маршруте.</div></div>`:''}
 <div class="card"><div class="sect-t">Точки риска</div>${listPts(r.risks,'risk','⚠️')}</div>
 ${lv>=1?`<div class="grid g2"><div class="card"><div class="sect-t">Точки отдыха</div>${listPts(r.rest,'rest','🟢')}</div><div class="card"><div class="sect-t">Точки выхода</div>${listPts(r.exits,'exit','🚪')}</div></div>
 <div class="card"><label class="f">Запасной маршрут<textarea data-i="route.alt">${E(r.alt)}</textarea></label></div>`:''}
 ${lv>=2?`<div class="card"><div class="sect-t">Добавить точку по километру</div><div class="grid g2"><label class="f">Тип<select id="npT"><option value="risk">Риск</option><option value="rest">Отдых</option><option value="exit">Выход</option></select></label><label class="f">Километр<input id="npK" type="number" inputmode="decimal" placeholder="5.5"></label></div><label class="f">Описание<input id="npY" placeholder="Например: осыпь, крутой склон, брод"></label><button class="btn pri" data-a="addpt">Добавить</button></div>`:`<div class="tiny">Добавление точек, запасной маршрут и профиль высоты открываются с уровня AVERAGE и ADVANCED.</div>`}`}

/* ================= WEATHER ================= */
function hourly(){const b=S.wx;
 if(b.sc==='live'&&S.wxLive)return S.wxLive.hourly.map(x=>({h:x.h,w:x.w,r:wxRisk(x.w)}));
 const tr=(WX_SC[b.sc]||{}).tr||{temp:0,wind:0,rain:0,storm:0},now=new Date(),o=[];
 for(let h=0;h<6;h++){const w={temp:Math.round(b.temp+tr.temp*h),wind:Math.max(0,Math.round(b.wind+tr.wind*h)),rain:Math.max(0,b.rain+tr.rain*h*.5),storm:Math.min(100,Math.max(0,Math.round(b.storm+tr.storm*h))),vis:Math.max(.2,b.vis-(tr.wind>2?h*.8:0))};o.push({h:(now.getHours()+h)%24,w,r:wxRisk(w)})}return o}
function wxAdvice(l){const ex=S.level>=2;return[[ 'Условия благоприятны. Возьмите тёплый слой и следите за небом.','Условия в норме. Сверяйте прогноз на привалах и держите время разворота.'],['Идите недалеко и будьте готовы вернуться.','Сократите маршрут, определите точку разворота, ужесточите контроль группы.'],['Лучше не идти или вернуться. Не поднимайтесь выше.','Рекомендуется отказаться от выхода или перейти на запасной маршрут ниже. Сократите контрольные интервалы.'],['Не идите в горы. Если вы на маршруте: спускайтесь и ищите укрытие.','Критические условия. Сверните выход, спуститесь в безопасную зону, уведомите контакт.']][l][ex?1:0]}
function wxResult(){const w=S.wx,k=wxRisk(w),R=RISK[k.l],lv=S.level,h=hourly();
 return`<div class="risk tone-${R.c}"><span class="dot ${R.c}" style="width:16px;height:16px"></span><div><b style="font-size:20px">${R.t}</b><div class="small">${wxAdvice(k.l)}</div></div></div>
 <div class="grid g3">${[['Температура',w.temp+'°C'],['Ветер',w.wind+' км/ч'],['Осадки',(+w.rain).toFixed(1)+' мм/ч'],['Гроза',w.storm+'%'],['Видимость',(+w.vis).toFixed(1)+' км']].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
 ${k.r.length?`<div class="card flat"><div class="sect-t">Предупреждения</div>${k.r.map(x=>`<div class="dont" style="background:color-mix(in srgb,var(--warn) 14%,var(--card))">${E(x)}</div>`).join('')}</div>`:'<div class="card flat small muted">Предупреждений нет.</div>'}
 ${lv>=1?`<div class="card"><div class="row sp"><div class="sect-t">Ближайшие 6 часов</div>${wxBadge()}</div><div class="grid" style="grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${h.map(x=>`<div class="stat" style="align-items:center;padding:10px 4px;text-align:center"><span>${String(x.h).padStart(2,'0')}:00</span><b style="font-size:15px">${x.w.temp}°</b><span style="letter-spacing:0">${x.w.wind} км/ч</span><span class="dot ${RISK[x.r.l].c}"></span></div>`).join('')}</div></div>`:''}
 ${lv>=2?`<div class="card flat small muted"><b>Как считается риск (упрощённая модель):</b> ветер ≥30 км/ч +2, ≥50 +3; гроза ≥30% +2, ≥60% +3; осадки ≥1 мм/ч +1, ≥5 +2; видимость &lt;5 км +2, &lt;1 км +3; температура ≤5°C +1, ≤0 +2, ≥28 +1, ≥32 +2. Сумма ${k.s}: 0–1 низкий, 2–3 внимание, 4–5 высокий, 6+ критический. Для решений опирайтесь на официальные прогнозы.</div>`:''}`}
function vWeather(){const sl=(l,p,mn,mx,st)=>`<label class="f"><span class="row sp"><span>${l}</span><output class="mono">${S.wx[p]}</output></span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${S.wx[p]}" data-i="wx.${p}" data-n data-live="wx"></label>`;
 const loc=wxLoc(),off=conn()==='offline',live=S.wx.sc==='live'&&S.wxLive;
 return`${head('Погода и риски','Понятная оценка риска по температуре, ветру, осадкам, грозе и видимости.',wxBadge())}
 ${live?`<div class="card flat small muted">${E(wxSourceLine())} Высота расчётной точки: ${S.wxLive.elev!=null?Math.round(S.wxLive.elev)+' м':'н/д'}. Вероятность грозы оценивается по коду погоды и энергии конвекции (CAPE), это не официальный показатель. Погода в горах локально отличается: сверяйтесь с официальным прогнозом.</div>`:'<div class="warnbox">Сейчас показан ДЕМО-сценарий. Загрузите реальный прогноз для вашей точки.</div>'}
 <div class="card"><div class="sect-t">Реальный прогноз (Open-Meteo)</div>
  <div class="small muted">Точка: ${loc?fmtCoord(loc.lat,loc.lon)+' ('+loc.src+')':'не определена'}</div>
  <label class="f">Координаты вручную<input data-i="wxLocText" placeholder="43.24, 76.95" value="${E(S.wxLocText)}"></label>
  <div class="row"><button class="btn pri" data-a="wxload" ${off?'disabled':''}>${off?'Нет связи':'Загрузить прогноз'}</button><button class="btn" data-a="wxgps" ${off?'disabled':''}>По моему GPS</button></div>
  <div class="tiny">Прогноз сохраняется на устройстве и показывается без сети с пометкой возраста. Данные: Open-Meteo.com (CC BY 4.0).</div></div>
 <div class="chips" id="wxchips">${wxChips()}</div>
 <div id="wxres" class="col">${wxResult()}</div>
 <details class="memo-d"><summary>ДЕМО-сценарии: настроить значения вручную</summary><div><div class="grid g2">${sl('Температура, °C','temp',-15,40,1)}${sl('Ветер, км/ч','wind',0,90,1)}${sl('Осадки, мм/ч','rain',0,15,.5)}${sl('Вероятность грозы, %','storm',0,100,5)}${sl('Видимость, км','vis',.2,30,.2)}</div></div></details>`}
const wxChips=()=>(S.wxLive?`<button class="chip ${S.wx.sc==='live'?'on':''}" data-a="wxsc" data-v="live">Реальный</button>`:'')+Object.keys(WX_SC).map(k=>`<button class="chip ${S.wx.sc===k?'on':''}" data-a="wxsc" data-v="${k}">ДЕМО: ${WX_SC[k].n}</button>`).join('')+(S.wx.sc==='custom'?'<span class="chip on">Свой сценарий</span>':'');
function setWx(k){const s=WX_SC[k];S.wx={sc:k,temp:s.temp,wind:s.wind,rain:s.rain,storm:s.storm,vis:s.vis};save()}
const LIVE={
 wx(el){S.wx.sc='custom';$('#wxres').innerHTML=wxResult();$('#wxchips').innerHTML=wxChips();const o=el.parentElement.querySelector('output');if(o)o.textContent=el.value;renderShell()},
 what(el){whatQ=el.value;$('#whatres').innerHTML=whatRes()},
 card(){$('#cardprev').innerHTML=cardPrev()}
};

/* ================= MEMOS / AID ================= */
let memoCat='before';
const CATS=[['before','Перед походом'],['during','Во время похода'],['emergency','ЧС'],['firstaid','Первая помощь']];
function memoBlock(t,steps,extra){return`<details class="memo-d"><summary>${E(t)}</summary><div><ol class="steps">${steps.map(s=>`<li>${E(s)}</li>`).join('')}</ol>${extra.length?`<div class="sect-t">Для вашего уровня</div><ol class="steps">${extra.map(s=>`<li class="adv">${E(s)}</li>`).join('')}</ol>`:''}</div></details>`}
function vMemos(){const lv=S.level;let list=[],hidden=0;
 if(memoCat==='firstaid')list=AID_ORDER.map(id=>({t:INC[id].t,inc:id}));
 else{const all=MEMOS.filter(m=>m.c===memoCat);list=all.filter(m=>(m.min||0)<=lv);hidden=all.length-list.length}
 const blocks=list.map(m=>{if(m.inc){const I=INC[m.inc];return memoBlock(m.t,I.steps,lv>=2?I.adv:[])}
  const ex=[...(lv>=1&&m.pro?m.pro:[]),...(lv>=3&&m.exp?m.exp:[])];return memoBlock(m.t,m.s,ex)}).join('');
 return`${head('Памятки','Короткие карточки. Чем выше уровень, тем больше деталей.')}
 <div class="chips">${CATS.map(c=>`<button class="chip ${memoCat===c[0]?'on':''}" data-a="memocat" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>
 <div class="memo">${blocks}</div>${hidden?`<div class="tiny">Ещё ${hidden} памятк${hidden>1?'и':'а'} откроется на более высоком уровне.</div>`:''}
 ${memoCat==='firstaid'?'<button class="btn" data-a="go" data-v="aid">Открыть раздел «Первая помощь»</button>':''}`}
function vAid(){return`${head('Первая помощь','Порядок всегда один: безопасность, сознание, дыхание, кровотечение, вызов помощи.')}
 <div class="chips">${['Безопасность','Сознание','Дыхание','Кровотечение','Вызов помощи'].map((t,i)=>`<span class="chip on" style="background:var(--card);color:var(--tx);border-color:var(--line)"><b class="num" style="color:var(--g)">${i+1}</b> ${t}</span>`).join('')}</div>
 <div class="grid g3">${AID_ORDER.map(id=>`<button class="inc" data-a="incgo" data-id="${id}"><span class="em">${INC[id].em}</span><b>${INC[id].t}</b></button>`).join('')}</div>
 <div class="warnbox">Помощь в горах может занять часы. Не уверены или состояние тяжёлое: звоните 112 и следуйте указаниям диспетчера.</div>${numsCard()}`}

/* ================= CHECK ================= */
let checkMode='quick';
function vCheck(){
 const q=QUICK6.map((t,i)=>`<button class="chk ${S.quick[i]?'on':''}" data-a="qtoggle" data-k="${i}" role="checkbox" aria-checked="${!!S.quick[i]}"><span class="bx">✓</span><span><b>${t}</b></span></button>`).join('');
 const missing=QUICK6.filter((t,i)=>!S.quick[i]);
 const ext=CHECKSETS.map(cs=>{const st=S.checks[cs.id]||{},n=cs.items.filter((_,i)=>st[i]).length;return`<div class="card"><div class="row sp"><h3>${cs.t}</h3><span class="badge ${n===cs.items.length?'g':''}">${n}/${cs.items.length}</span></div>${cs.items.map((t,i)=>`<button class="chk ${st[i]?'on':''}" data-a="cktoggle" data-id="${cs.id}" data-k="${i}" role="checkbox" aria-checked="${!!st[i]}"><span class="bx">✓</span><span>${E(t)}</span></button>`).join('')}<button class="btn sm ghost" data-a="ckreset" data-id="${cs.id}">Сбросить</button></div>`}).join('');
 return`${head('Я знаю, но хочу проверить','Профессиональные памятки без базовых объяснений.')}
 <div class="chips"><button class="chip ${checkMode==='quick'?'on':''}" data-a="ckmode" data-v="quick">Быстрая проверка</button><button class="chip ${checkMode==='ext'?'on':''}" data-a="ckmode" data-v="ext">Списки для групп</button></div>
 ${checkMode==='quick'?`<div class="card"><div class="row sp"><h3>10 секунд перед выходом</h3><button class="btn sm ghost" data-a="qreset">Сбросить</button></div><div class="grid g2">${q}</div>
 ${missing.length?`<div class="warnbox"><b>Не подтверждено:</b> ${missing.join(', ')}.</div>`:`<div class="risk tone-ok"><span class="dot ok"></span><div><b>Ключевое подтверждено.</b><div class="small muted">Это не гарантия безопасности. Продолжайте оценивать условия по ходу.</div></div></div>`}</div>`:ext}`}

/* ================= GROUP ================= */
const MODES={school:['Школьная группа','Считайте по списку на старте, на каждом привале и на финише. Рядом должен быть ответственный взрослый.'],family:['Семья','Дети всегда в зоне видимости. Назначьте каждому ребёнку взрослого-напарника. Договоритесь: потерялся — стой на месте и зови.'],club:['Турклуб','Назначьте ведущего и замыкающего, договоритесь о сигналах и контрольных временах связи.']};
const LOGT={info:'Инфо',injury:'Травма',weather:'Погода',comm:'Связь',decision:'Решение',sos:'SOS'};
function vGroupLocal(){const g=S.group,lv=S.level,cnt={ok:0,help:0,emergency:0,nocomm:0};g.members.forEach(m=>cnt[m.st]++);
 const bad=g.members.filter(m=>m.st==='nocomm'||m.st==='emergency'||m.comm==='none');
 const mem=g.members.map(m=>{const s=STATUS[m.st],stale=Date.now()-m.seen>15*60000;return`<div class="member"><div><div class="nm">${E(m.n)} <span class="badge">${LEVELS[m.lv].k}</span></div><div class="tiny">Подтверждён: <span style="color:${stale?'var(--hi)':'inherit'}">${agoTxt(m.seen)}</span>${m.med?' · Заметка: '+E(m.med):''}</div></div><span class="pill"><span class="dot ${s.c}"></span>${s.t}</span>
  <label class="f"><span class="tiny">Статус</span><select data-sel="mstat" data-id="${m.id}">${Object.keys(STATUS).map(k=>`<option value="${k}" ${m.st===k?'selected':''}>${STATUS[k].t}</option>`).join('')}</select></label>
  <label class="f"><span class="tiny">Связь</span><select data-sel="mcomm" data-id="${m.id}">${[['ok','Есть'],['weak','Слабая'],['none','Нет']].map(o=>`<option value="${o[0]}" ${m.comm===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label>
  <div style="grid-column:1/-1" class="row"><button class="btn sm" data-a="mseen" data-id="${m.id}">Подтвердить</button><button class="btn sm ghost" data-a="mdel" data-id="${m.id}">Удалить</button></div></div>`}).join('');
 return`${head('Моя группа','Локальный список на этом устройстве и быстрая перекличка.','<span class="badge">Локально</span>')}
 ${onlineCards()}
 <div class="warnbox">Локальный список: участники из примера (ДЕМО), удалите их и добавьте своих. Данные хранятся только на этом устройстве. Медицинские заметки добавляйте только с согласия участника.</div>
 <div class="chips">${Object.keys(MODES).map(k=>`<button class="chip ${g.mode===k?'on':''}" data-a="gmode" data-v="${k}">${MODES[k][0]}</button>`).join('')}</div>
 <div class="card flat small muted">${MODES[g.mode][1]}</div>
 <label class="f">Название группы<input data-i="group.name" value="${E(g.name)}"></label>
 <div class="grid g3">${Object.keys(STATUS).map(k=>`<div class="stat"><span><span class="dot ${STATUS[k].c}" style="display:inline-block;margin-right:6px"></span>${STATUS[k].t}</span><b>${cnt[k]}</b></div>`).join('')}</div>
 ${g.warn?`<div class="dngbox col"><b>Внимание: ${bad.length} участник(а) требуют проверки</b><div class="small">${bad.map(m=>E(m.n)+' — '+STATUS[m.st].t+(m.comm==='none'?', нет связи':'')).join('; ')}</div><div class="grid g2"><button class="btn pri" data-a="rollok">Всё равно все на месте</button><button class="btn" data-a="rollcancel">Отмена, проверю</button></div></div>`:`<button class="btn big pri" data-a="rollcall">${ic('users')} Все участники на месте</button>`}
 <div class="col">${mem}</div>
 <div class="card"><div class="sect-t">Добавить участника</div><div class="grid g2"><label class="f">Имя<input id="gmN"></label><label class="f">Уровень<select id="gmL">${LEVELS.map((l,i)=>`<option value="${i}">${l.k}</option>`).join('')}</select></label></div><label class="f">Заметка (по желанию участника)<input id="gmM" placeholder="Например: нужна ингаляция по назначению врача"></label><button class="btn" data-a="gadd">Добавить</button></div>
 ${lv>=3?leaderPanel():`<div class="card flat"><div class="sect-t">Инструменты руководителя</div><div class="small muted">Журнал происшествий, план эвакуации и сценарий массового происшествия доступны с уровня EXPERT.</div><button class="btn sm" data-a="go" data-v="level">Сменить уровень</button></div>`}`}
function vGroup(){return S.sync.code?vGroupOnline():vGroupLocal()}
function onlineCards(){return`<div class="card"><h3>Онлайн-группа</h3><div class="small muted">Участники видят статусы друг друга, руководитель видит позиции и запрашивает отметку «Все на месте». Без связи отчёты копятся на телефоне и уходят позже.</div>${SRV===false?`<div class="warnbox">${MS_CONFIG.demoHost||MS_CONFIG.noServer?'На этом хостинге нет сервера, поэтому онлайн-группы отключены: пользуйтесь локальной группой ниже. Онлайн-группы работают при запуске через npm start.':'Сервер групп недоступен. Запустите приложение через <span class="mono">npm start</span> и проверьте связь.'}</div>`:''}<div class="grid g2"><div class="col"><b>Создать</b><input id="ogN" placeholder="Название группы" maxlength="40"><input id="ogL" placeholder="Ваше имя" maxlength="40"><button class="btn pri" data-a="gcreate" ${SRV===false?'disabled':''}>Создать группу</button></div><div class="col"><b>Войти по коду</b><input id="ojC" placeholder="Код группы" maxlength="8" style="text-transform:uppercase"><input id="ojN" placeholder="Ваше имя" maxlength="40"><button class="btn" data-a="gjoin" ${SRV===false?'disabled':''}>Войти</button></div></div></div>`}
function vGroupOnline(){const y=S.sync,d=y.data,isL=y.role==='leader';
 if(!d)return`${head('Онлайн-группа','Загружаю данные группы…')}${y.error?`<div class="dngbox">${E(y.error)}</div>`:''}<div class="row"><button class="btn" data-a="gpull">Повторить</button><button class="btn ghost" data-a="gleave">Выйти из группы</button></div>`;
 const cnt={ok:0,help:0,emergency:0,nocomm:0};d.members.forEach(m=>cnt[effStatus(m)]++);
 const others=d.members.filter(m=>!m.isLeader),ci=d.checkinAt,resp=ci?others.filter(m=>m.ackAt>=ci).length:0,noresp=ci?others.filter(m=>m.ackAt<ci):[];
 const rows=d.members.map(m=>{const es=effStatus(m),s=STATUS[es],a=ageMs(m),mine=m.id===y.memberId;
  return`<div class="member"><div><div class="nm">${E(m.name)} ${m.isLeader?'<span class="badge g">руководитель</span>':''} ${mine?'<span class="badge">вы</span>':''}</div><div class="tiny">Отчёт: ${a<60000?'только что':Math.round(a/60000)+' мин назад'}${m.comm==='weak'?' · слабая связь':m.comm==='none'?' · связи нет':''}${m.note?' · '+E(m.note):''}</div>${m.lat!=null?`<div class="tiny mono">${fmtCoord(m.lat,m.lon)}${m.acc?' ±'+m.acc+' м':''}</div>`:''}</div><span class="pill"><span class="dot ${s.c}"></span>${s.t}</span>
  ${isL&&!mine?`<div style="grid-column:1/-1" class="row">${m.lat!=null?`<button class="btn sm" data-a="copycoords" data-c="${fmtCoord(m.lat,m.lon)}">Скопировать координаты</button>`:''}<button class="btn sm ghost" data-a="gremove" data-id="${m.id}">Удалить</button></div>`:''}</div>`}).join('');
 return`${head(E(d.name),isL?'Вы руководитель группы.':'Вы участник группы.','<span class="badge live">ОНЛАЙН</span>')}
 ${y.error?`<div class="dngbox">${E(y.error)}</div>`:''}
 <div class="card"><div class="sect-t">Код группы</div><div class="row sp"><span class="code">${E(y.code)}</span><button class="btn sm" data-a="gshare">Пригласить</button></div><div class="tiny">Отправьте код участникам. Токен доступа хранится только на этом устройстве.</div></div>
 <div class="card"><div class="sect-t">Мой статус</div><div class="grid g3s">${['ok','help','emergency'].map(k=>`<button class="btn ${y.myStatus===k?(k==='ok'?'pri':k==='emergency'?'dng':''):''}" style="${y.myStatus===k&&k==='help'?'border-color:var(--warn)':''}" data-a="gstatus" data-v="${k}">${STATUS[k].t}</button>`).join('')}</div>
  <button class="chk ${y.shareLoc?'on':''}" data-a="gloc" role="checkbox" aria-checked="${!!y.shareLoc}"><span class="bx">✓</span><span>Передавать мою позицию руководителю<small>При статусах «Нужна помощь» и «Emergency» позиция передаётся всегда.</small></span></button>
  ${y.queue.length?`<div class="warnbox">В очереди ${y.queue.length} отправок: уйдут, когда появится связь.</div>`:''}</div>
 ${isL?`${d.checkinAt?`<div class="${noresp.length?'warnbox':'risk tone-ok'}">${noresp.length?`<b>Подтвердили ${resp} из ${others.length}.</b> Не ответили: ${noresp.map(m=>E(m.name)).join(', ')}.`:`<div><b>Все ${others.length} участников на месте.</b></div>`}</div>`:''}<button class="btn big pri" data-a="gcheckin">${ic('users')} Все участники на месте?</button><div class="tiny">Участникам придёт запрос «Я на месте». Нажатие подтверждается на сервере.</div>`:''}
 <div class="grid g3s">${Object.keys(STATUS).map(k=>`<div class="stat"><span>${STATUS[k].t}</span><b>${cnt[k]}</b></div>`).join('')}</div>
 <div class="col">${rows}</div>
 ${S.level>=3&&isL?leaderPanel():''}
 <button class="btn ghost" data-a="gleave">Выйти из группы на этом устройстве</button>`}
function leaderPanel(){const g=S.group;return`<div class="card"><div class="sect-t">План эвакуации</div><textarea data-i="group.evac" placeholder="Точки эвакуации, маршрут выноса, площадка для приёма помощи, ответственные">${E(g.evac)}</textarea><button class="btn sm" data-a="evactpl">Вставить шаблон</button></div>
 <div class="card"><div class="row sp"><div class="sect-t">Журнал происшествий</div><button class="btn sm ghost" data-a="logcopy">Скопировать</button></div><div class="grid g2"><label class="f">Тип<select id="lgT">${Object.keys(LOGT).map(k=>`<option value="${k}">${LOGT[k]}</option>`).join('')}</select></label><label class="f">Запись<input id="lgX" placeholder="Что произошло"></label></div><button class="btn" data-a="logadd">Записать</button>
 ${S.log.length?S.log.slice(0,20).map(x=>`<div class="emnum"><b class="mono" style="font-size:13px;min-width:48px">${tm(x.ts)}</b><span class="badge">${LOGT[x.type]||'Инфо'}</span><span style="flex:1">${E(x.t)}</span></div>`).join(''):'<div class="small muted">Записей пока нет.</div>'}</div>
 <button class="btn" data-a="go" data-v="memos" >Сценарий массового происшествия: см. Памятки → ЧС</button>`}

/* ================= LEARN ================= */
let LQ=null;
function vLearn(){if(LQ)return vLesson();const n=Object.keys(S.learn).length;
 return`${head('Обучение','9 коротких уроков. После каждого квиз из 3 вопросов.')}
 <div class="card"><div class="row sp"><b>Пройдено ${n} из ${LESSONS.length}</b><span class="badge g">${Math.round(n/LESSONS.length*100)}%</span></div><div class="bar"><i style="width:${n/LESSONS.length*100}%"></i></div></div>
 <div class="grid g2">${LESSONS.map((l,i)=>`<button class="tile" data-a="lesson" data-i="${i}"><span class="ti mono" style="font-weight:700">${i+1}</span><b>${E(l.t)}</b><span>${S.learn[i]!==undefined?'Лучший результат: '+S.learn[i]+'%':'Не пройден'}</span></button>`).join('')}</div>`}
function vLesson(){const L=LESSONS[LQ.i],an=LQ.ans,all=Object.keys(an).length===L.q.length,sc=L.q.filter((q,i)=>an[i]===q.a).length;
 return`<div class="row"><button class="btn sm ghost" data-a="lclose">← Все уроки</button></div>${head('Урок '+(LQ.i+1)+'. '+L.t)}
 <ol class="steps">${L.pts.map(p=>`<li>${E(p)}</li>`).join('')}</ol>
 <div class="sect-t">Квиз</div>
 ${L.q.map((q,qi)=>`<div class="card"><h3>${E(q.q)}</h3>${q.o.map((o,oi)=>{let c='';if(an[qi]!==undefined){if(oi===q.a)c='right';else if(oi===an[qi])c='wrong'}return`<button class="opt ${c}" data-a="qa" data-q="${qi}" data-o="${oi}" ${an[qi]!==undefined?'disabled':''}>${E(o)}</button>`}).join('')}</div>`).join('')}
 ${all?`<div class="risk tone-${sc===L.q.length?'ok':'warn'}"><div><b>Результат: ${sc} из ${L.q.length}</b><div class="small muted">${sc===L.q.length?'Отлично. Урок пройден.':'Перечитайте пункты урока и попробуйте ещё раз.'}</div></div></div><div class="grid g2"><button class="btn" data-a="lesson" data-i="${LQ.i}">Пройти заново</button>${LQ.i<LESSONS.length-1?`<button class="btn pri" data-a="lesson" data-i="${LQ.i+1}">Следующий урок</button>`:''}</div>`:''}`}

/* ================= WHAT IF ================= */
let whatQ='',whatId=null;
function whatRes(){const q=whatQ.trim().toLowerCase();let hits=[];
 if(q.length>=2)hits=QUICK.filter(x=>x.q.toLowerCase().includes(q)||x.k.some(k=>q.includes(k)||(q.length>=3&&k.includes(q))));
 if(whatId&&!q)hits=QUICK.filter(x=>x.id===whatId);
 if(!hits.length)return q.length>=2?`<div class="card flat"><b>Ничего не найдено.</b><div class="small muted">Попробуйте другие слова или откройте SOS.</div><button class="btn" data-a="go" data-v="sos">Открыть SOS</button></div>`:'';
 const top=whatId&&hits.find(h=>h.id===whatId)||hits[0],I=INC[top.id];
 return`${hits.length>1?`<div class="chips">${hits.map(h=>`<button class="chip ${h.id===top.id?'on':''}" data-a="whatpick" data-id="${h.id}">${h.q}</button>`).join('')}</div>`:''}
 <div class="card"><h2>${I.em} ${top.q}</h2><div class="sect-t">Сейчас</div><ol class="steps">${I.steps.slice(0,7).map(t=>`<li>${E(t)}</li>`).join('')}</ol>${I.call?'<div class="dngbox">Нужна экстренная помощь: <b>112</b>.</div>':''}<div class="grid g2"><button class="btn pri" data-a="stress" data-id="${top.id}">Пошагово (Stress Mode)</button><button class="btn" data-a="incgo" data-id="${top.id}">Полный алгоритм</button></div></div>`}
function vWhat(){return`${head('Что делать, если…','Введите ситуацию своими словами.')}
 <input id="whatIn" data-live="what" type="search" placeholder="Например: я потерялся" value="${E(whatQ)}" autocomplete="off" style="font-size:18px;padding:16px">
 <div class="chips">${QUICK.map(x=>`<button class="chip" data-a="whatchip" data-id="${x.id}" data-q="${E(x.q)}">${x.q}</button>`).join('')}</div>
 <div id="whatres" class="col">${whatRes()}</div>`}

/* ================= EMERGENCY CARD ================= */
function cardText(){const c=S.card;return['MS|'+c.name,c.phone,'Contact:'+c.cname,'Group:'+c.group,'Route:'+c.route,'Back:'+c.back,'Status:'+STATUS[c.status].t,'GPS:'+(c.coords||'none')].join('|')}
function qrSvg(t){try{if(!window.qrcode)return'';if(qrcode.stringToBytesFuncs&&qrcode.stringToBytesFuncs['UTF-8'])qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,'L');q.addData(t);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){return''}}
function cardRows(){const c=S.card;return[['Имя',c.name],['Экстренный контакт',c.cname+' · '+c.phone],['Группа',c.group],['Маршрут',c.route],['Точка старта',c.start],['Вернуться к',c.back],['Статус',STATUS[c.status].t],['Координаты',c.coords?c.coords+' ('+tm(c.coordsAt)+')':'не сохранены']]}
function cardPrev(){const q=qrSvg(cardText());return`<div class="rcard"><div class="hd">EMERGENCY CARD · MOUNTAIN SAFE</div>${cardRows().map(r=>`<div class="r"><span>${r[0]}</span><b>${E(r[1])}</b></div>`).join('')}<div class="row sp"><div class="qr">${q||'<div style="font-size:12px;color:#555">QR недоступен без загрузки библиотеки. Покажите текст карточки.</div>'}</div><div style="font-size:12px;color:#555;max-width:200px">QR содержит данные карточки. Сканируется любой камерой.</div></div></div>`}
function planText(){const c=S.card;return`План похода: ${c.route}\nСтарт: ${c.start}\nВернусь к: ${c.back}\nГруппа: ${c.group}\nКонтакт: ${c.cname} ${c.phone}\nЕсли я не выйду на связь до ${addTime(c.back,1)}, позвоните 112 и сообщите этот маршрут.`}
function vCard(){const c=S.card,f=(l,p,t='text')=>`<label class="f">${l}<input type="${t}" data-i="card.${p}" data-live="card" value="${E(c[p])}"></label>`;
 return`${head('Моя Emergency Card','Быстро покажите спасателям, кто вы и куда идёте.')}
 <div class="warnbox">Поля заполнены примерами: замените их своими данными. Всё хранится только на этом устройстве.</div>
 <div class="card"><div class="grid g2">${f('Имя','name')}${f('Контакт близкого','cname')}${f('Телефон контакта','phone','tel')}${f('Группа','group')}${f('Маршрут','route')}${f('Точка старта','start')}${f('Планируемое время возвращения','back')}<label class="f">Текущий статус<select data-i="card.status" data-live="card">${Object.keys(STATUS).map(k=>`<option value="${k}" ${c.status===k?'selected':''}>${STATUS[k].t}</option>`).join('')}</select></label></div>
 <label class="f">Координаты<input id="cardCo" data-i="card.coords" data-live="card" value="${E(c.coords)}" placeholder="43.1234, 77.1234"></label>
 <div class="small mono" id="gpsline">${gpsLine()}</div>
 <div class="row"><button class="btn sm pri" data-a="gpsnow">Определить позицию</button><button class="btn sm ${S.tracking?'pri':''}" data-a="track">${S.tracking?'Запись пути: вкл':'Запись пути: выкл'}</button><button class="btn sm" data-a="savecoords">Сохранить введённые координаты</button></div>
 <div class="tiny">Позиция определяется GPS устройства и сохраняется, чтобы быть доступной без связи. Запись пути расходует батарею.</div></div>
 <div id="cardprev">${cardPrev()}</div>
 <div class="grid g2"><button class="btn big pri" data-a="showcard">Показать спасателям</button><button class="btn big" data-a="copyplan">${ic('copy')} План для близких</button></div>`}
function showCard(){ov(`<div class="in"><div class="row sp"><span class="st-calm">EMERGENCY CARD</span><button class="btn sm" data-a="ovclose">Закрыть</button></div>${cardPrev()}</div>`)}

/* ================= OFFLINE ================= */
function vOffline(){const c=conn(),cn=CONN[c],p=S.pack,w=PWA;
 const counts=[['Алгоритмы ЧС',INC_IDS.length],['Памятки',MEMOS.length],['Чек-листы',PREP.length+CHECKSETS.length],['Уроки и квизы',LESSONS.length],['Экстренные номера',EMERGENCY_NUMBERS.length]];
 const row=(l,v,ok)=>`<div class="emnum"><span style="flex:1">${l}</span><span class="badge ${ok?'g':''}">${v}</span></div>`;
 return`${head('Офлайн-режим','Спасательные данные должны быть доступны без сети.')}
 <div class="risk tone-${cn.c}"><span class="dot ${cn.c}" style="width:16px;height:16px"></span><div><b style="font-size:20px">${cn.t}</b><div class="small muted">${c==='offline'?'Интерфейс работает на сохранённых данных.':c==='weak'?'Отправляйте короткие сообщения (SMS), скачайте пакет заранее.':'Проверьте офлайн-готовность до выхода на маршрут.'}</div></div></div>
 <div class="card"><div class="row sp"><h3>Офлайн-готовность</h3><button class="btn sm" data-a="pwarefresh">Обновить</button></div>
  ${row('Service Worker',w.sw==='active'?'Активен':w.sw==='installing'?'Устанавливается':'Не активен',w.sw==='active')}
  ${row('Файлов приложения в кэше',w.cached,w.cached>0)}
  ${row('Плиток карты в кэше',w.tiles,w.tiles>0)}
  ${row('Защита хранилища от очистки',w.persisted?'Включена':'Не включена',!!w.persisted)}
  ${row('Установлено как приложение',isStandalone()?'Да':'Нет',isStandalone())}
  ${row('Прогноз погоды в памяти',S.wxLive?wxAgeMin()+' мин назад':'Нет',!!S.wxLive)}
  ${row('Сохранённая позиция',S.gps?agoTxt(S.gps.ts):'Нет',!!S.gps)}
  <div class="row"><button class="btn pri" data-a="pack">${ic('download')} Подготовить к выходу</button>${w.install?'<button class="btn" data-a="pwainstall">Установить приложение</button>':''}</div>
  <div class="tiny">${p?'Подготовлено '+tm(p.ts)+'. ':''}Кнопка проверяет кэш, просит браузер защитить хранилище от очистки и обновляет прогноз, если есть связь. Карту сохраняйте на экране «Маршрут».</div></div>
 <div class="card"><div class="sect-t">Всегда доступно без сети</div><div class="grid g2">${counts.map(x=>`<div class="emnum"><b style="font-size:20px;min-width:34px">${x[1]}</b><span class="small">${x[0]}</span></div>`).join('')}</div></div>
 <div class="card"><div class="sect-t">Индикатор связи</div><div class="small muted">Режим «Авто» читает состояние сети браузера и тип соединения. Кнопки симулируют состояние для демонстрации.</div><div class="chips">${[['auto','Авто'],['online','ONLINE'],['weak','WEAK'],['offline','OFFLINE']].map(o=>`<button class="chip ${S.sim===o[0]?'on':''}" data-a="sim" data-v="${o[0]}">${o[1]}</button>`).join('')}</div></div>
 <div class="card flat"><div class="sect-t">Как это работает</div><div class="small muted">Приложение и его данные кэшируются Service Worker при первом открытии, дальше запускаются без сети. Ваши чек-листы, карточка, группа и журнал хранятся в памяти устройства. Карта сохраняется по областям, которые вы просмотрели или сохранили. Для проверки: откройте приложение, отключите интернет, перезагрузите страницу.</div></div>`}

/* ================= DEMO ================= */
const FX={
 reset(){setWx('clear');S.sim='online';S.group.members.forEach(m=>{m.st='ok';m.comm='ok';m.seen=Date.now()-60000});S.group.warn=false;S.view='home';curInc=null;ST=null;ov('')},
 wx1(){setWx('turn');S.view='weather'},
 weak(){S.sim='weak';S.card.coords='43.2000, 77.0000 (ДЕМО)';S.card.coordsAt=Date.now();S.view='home';toast('Координаты сохранены (демо)')},
 injury(){const m=S.group.members.find(x=>x.n==='Тимур');if(m){m.st='help';m.seen=Date.now()}logAdd('Тимур упал на осыпи, боль в ноге','injury');S.view='group'},
 sos(){S.view='sos';curInc='fracture'},
 stress(){stressStart('fracture',{danger:'no',who:'other',move:'no',comm:'weak',where:S.card.coords})},
 offline(){S.sim='offline';if(ST){ST.pi=Math.min(ST.plan.length-1,ST.pi+3);drawST()}},
 card(){ST=null;ov('');S.card.status='help';S.view='card';showCard()}
};
function vDemo(){const d=S.demo;
 return`${head('Демо-сценарий ЧС','Один сквозной пример: погода портится, связь слабеет, участник получает травму.',demoB)}
 <div class="card"><div class="col">${DEMO_STEPS.map((s,i)=>`<div class="emnum" style="${i===d?'border-color:var(--warn)':''};${i<d?'opacity:.6':''}"><b class="num" style="min-width:28px;color:var(--g)">${i<d?'✓':i+1}</b><div style="flex:1"><b>${E(s.t)}</b><div class="small muted">${E(s.d)}</div></div></div>`).join('')}</div>
 <div class="grid g2">${d<0?`<button class="btn big pri" data-a="demostart">${ic('play')} Запустить демо</button>`:`<button class="btn big pri" data-a="demonext">${d>=DEMO_STEPS.length-1?'Завершить':'Дальше'}</button><button class="btn big" data-a="demostop">Остановить и сбросить</button>`}</div></div>
 <div class="tiny">Демо меняет ДЕМО-данные погоды, связи и группы. Реальные данные и GPS не используются.</div>`}

/* ================= ABOUT / MORE ================= */
function vAbout(){
 const persons=[['Новичок','Не знает, что взять и как вести себя','Уровень NOVICE: простые шаги, чек-лист, «что нельзя»'],['Обычный турист','Оценить маршрут и погоду','Сложность, время, риск погоды, точки риска'],['Опытный турист','Не читать базу, а проверить','«Я знаю, но хочу проверить», быстрая проверка'],['Руководитель группы','Контроль людей и передача данных','Группа, перекличка, журнал, отчёт для спасателей'],['Семья','Дети рядом, страх потеряться','Режим «Семья», сценарий «потерялся участник»'],['Школьная группа','Ответственность учителя, подсчёт','Режим «Школа», группа 9А, контрольные проверки']];
 const tech=[['Пошаговый decision flow (по правилам)','Реализовано'],['Stress Mode, Emergency Card, QR','Реализовано'],['PWA: установка, Service Worker, офлайн','Реализовано'],['GPS, запись пути, сохранение позиции','Реализовано'],['Погода: Open-Meteo с кэшем и возрастом данных','Реализовано'],['Карта OpenStreetMap, кэш просмотренных областей','Реализовано'],['Импорт GPX, профиль высоты, набор','Реализовано'],['Онлайн-группы: сервер, коды, отчёты, перекличка','Реализовано'],['Очередь отчётов без связи','Реализовано'],['Демо-сценарий ЧС','ДЕМО: имитация'],['Векторные офлайн-карты, push, казахский язык','План'],['AI-ассистент решений','План: сейчас алгоритмы по правилам'],['Приём Emergency Card спасательными службами','План']];
 return`${head('О проекте','Mountain Safe: предупредить опасность раньше, чем она станет чрезвычайной ситуацией.')}
 <div class="card"><div class="sect-t">Кому помогаем</div><div class="grid g2">${persons.map(p=>`<div class="card flat"><h3>${p[0]}</h3><div class="small muted">${p[1]}</div><div class="small">${p[2]}</div></div>`).join('')}</div></div>
 <div class="card"><div class="sect-t">Ключевые идеи</div><ul class="muted" style="margin:0;padding-left:18px"><li>Stress Mode: один экран, одно действие.</li><li>Адаптация под 4 уровня: меняется содержание, а не только оформление.</li><li>Offline Safety: алгоритмы и карточка работают без связи.</li><li>Emergency Card и сообщение спасателям: точные данные в один экран.</li><li>Group Safety: статусы, перекличка, журнал, план эвакуации.</li></ul></div>
 <div class="card"><div class="sect-t">Масштабирование</div><ul class="muted" style="margin:0;padding-left:18px"><li>Казахстан: маршруты нацпарков и популярных троп.</li><li>Школы и турклубы: режимы для групп и отчётность.</li><li>Спасательные службы: приём Emergency Card и SITREP.</li><li>Международные маршруты: локальные номера и языки.</li></ul></div>
 <div class="card"><div class="sect-t">Технологии: что реально сделано</div>${tech.map(t=>`<div class="emnum"><span style="flex:1">${t[0]}</span><span class="badge ${t[1].startsWith('Реал')?'g':'demo'}">${t[1]}</span></div>`).join('')}<div class="tiny">Клиент на чистом JavaScript без сборки, сервер на Node без зависимостей. Переезд на React/Next.js возможен без изменения логики: она вынесена в lib.js и данные.</div></div>
 <div class="warnbox">Погода: Open-Meteo.com (CC BY 4.0). Карты: © участники OpenStreetMap. Медицинские рекомендации краткие и общие, по мотивам открытых руководств. Перед реальным применением их должен проверить врач или спасательная служба.</div>`}
function vMore(){return`${head('Разделы')}<div class="grid g2">${NAV.filter(n=>!['home','sos','prep','route'].includes(n[0])).map(n=>`<button class="tile" data-a="go" data-v="${n[0]}"><span class="ti">${ic(n[2])}</span><b>${n[1]}</b></button>`).join('')}</div>`}
const VIEWS={landing:vLanding,home:vHome,level:vLevel,sos:vSos,prep:vPrep,route:vRoute,weather:vWeather,memos:vMemos,aid:vAid,check:vCheck,group:vGroup,learn:vLearn,what:vWhat,card:vCard,offline:vOffline,demo:vDemo,about:vAbout,more:vMore};

/* ================= ACTIONS ================= */
const A={
 go:d=>{if(d.v==='learn')LQ=null;go(d.v)},
 setlevel:d=>{S.level=+d.v;save();render();toast('Уровень: '+LEVELS[+d.v].k)},
 inc:d=>{curInc=d.id;render();window.scrollTo({top:0})},
 incback:()=>{curInc=null;render()},
 incgo:d=>{S.view='sos';curInc=d.id;render();window.scrollTo({top:0})},
 dstep:d=>{const o=DONE[d.id]||(DONE[d.id]={});o[d.k]=!o[d.k];render()},
 stress:d=>stressStart(d.id||null),
 stpick:d=>{ST.a[d.k]=d.v;ST.q++;if(ST.q>=STK.length){ST.plan=buildPlan(ST.a);ST.phase='plan';ST.pi=0}drawST()},
 stwhere:d=>{const v=d.v==='0'?'':($('#stWhere').value||'').trim();ST.a.where=v;if(v){S.card.coords=v;S.card.coordsAt=Date.now();save()}ST.plan=buildPlan(ST.a);ST.phase='plan';ST.pi=0;drawST()},
 stback:()=>{if(ST.q>0)ST.q--;drawST()},
 stprev:()=>{if(ST.pi>0)ST.pi--;drawST()},
 stnext:()=>{if(ST.pi<ST.plan.length-1)ST.pi++;drawST()},
 stclose:()=>{ST=null;ov('');render()},
 ovclose:()=>{ov('');render()},
 copysit:()=>copy(sitrep(ST.a)),
 stcard:()=>{ST=null;S.view='card';showCard();render()},
 stlog:()=>{logAdd('SOS: '+INC[ST.a.inc||'other'].t+', связь: '+(SA.comm[ST.a.comm]||'?'),'sos');toast('Записано в журнал')},
 logsos:d=>{logAdd('SOS: '+INC[d.id].t,'sos');toast('Записано в журнал')},
 sitrep:d=>{const a={inc:d.id,danger:null,who:null,move:null,comm:null,where:S.card.coords||''};ov(`<div class="in"><div class="row sp"><span class="st-calm">СООБЩЕНИЕ СПАСАТЕЛЯМ</span><button class="btn sm" data-a="ovclose">Закрыть</button></div><div class="sit" id="sitTxt">${E(sitrep(a))}</div><button class="btn pri" data-a="copytxt">Скопировать</button><div class="tiny">Чтобы заполнить поля точнее, пройдите Stress Mode.</div></div>`);ST=null;window.__sit=sitrep(a)},
 copytxt:()=>copy(window.__sit||''),
 prept:d=>{S.prep[d.id]=!S.prep[d.id];save();render()},
 prepreset:()=>{S.prep={};save();render()},
 delpt:d=>{const m={risk:'risks',rest:'rest',exit:'exits'}[d.ty];S.route[m].splice(+d.k,1);save();render()},
 addpt:()=>{const ty=$('#npT').value,k=parseFloat($('#npK').value),x=($('#npY').value||'').trim();if(!k&&k!==0||!x){toast('Укажите километр и описание');return}const m={risk:'risks',rest:'rest',exit:'exits'}[ty];S.route[m].push({k,t:x,ic:'⚠️'});S.route[m].sort((a,b)=>a.k-b.k);save();render()},
 wxsc:d=>{if(d.v==='live'){if(S.wxLive){S.wx={sc:'live',...S.wxLive.cur};save();render()}else wxLoad(false)}else{setWx(d.v);render()}},
 memocat:d=>{memoCat=d.v;render()},
 qtoggle:d=>{S.quick[d.k]=!S.quick[d.k];save();render()},
 qreset:()=>{S.quick={};save();render()},
 ckmode:d=>{checkMode=d.v;render()},
 cktoggle:d=>{const o=S.checks[d.id]||(S.checks[d.id]={});o[d.k]=!o[d.k];save();render()},
 ckreset:d=>{S.checks[d.id]={};save();render()},
 gmode:d=>{S.group.mode=d.v;save();render()},
 mstat:(d,el)=>{const m=S.group.members.find(x=>x.id==d.id);m.st=el.value;save();render()},
 mcomm:(d,el)=>{const m=S.group.members.find(x=>x.id==d.id);m.comm=el.value;if(el.value==='none'&&m.st==='ok')m.st='nocomm';save();render()},
 mseen:d=>{const m=S.group.members.find(x=>x.id==d.id);m.seen=Date.now();save();render();toast(m.n+': подтверждён')},
 mdel:d=>{S.group.members=S.group.members.filter(x=>x.id!=d.id);save();render()},
 gadd:()=>{const n=($('#gmN').value||'').trim();if(!n){toast('Введите имя');return}S.group.members.push({id:S.group.nextId++,n,lv:+$('#gmL').value,st:'ok',comm:'ok',seen:Date.now(),med:($('#gmM').value||'').trim()});save();render()},
 rollcall:()=>{const bad=S.group.members.some(m=>m.st==='nocomm'||m.st==='emergency'||m.comm==='none');if(bad){S.group.warn=true;render();return}A.rollok()},
 rollok:()=>{const g=S.group;g.warn=false;g.members.forEach(m=>{m.seen=Date.now();if(m.st==='nocomm')m.st='ok'});logAdd('Перекличка: '+g.members.length+' из '+g.members.length+' на месте','info');save();render();toast('Перекличка: '+g.members.length+' из '+g.members.length+' на месте')},
 rollcancel:()=>{S.group.warn=false;render()},
 evactpl:()=>{S.group.evac='Точки эвакуации: \nМаршрут выноса: \nПлощадка для приёма помощи: \nОтветственный за пострадавшего: \nОтветственный за группу: \nОтветственный за связь: \nКонтрольные времена связи: ';save();render()},
 logadd:()=>{const x=($('#lgX').value||'').trim();if(!x){toast('Введите запись');return}logAdd(x,$('#lgT').value);render()},
 logcopy:()=>copy(S.log.slice().reverse().map(x=>tm(x.ts)+' ['+(LOGT[x.type]||'Инфо')+'] '+x.t).join('\n')||'Журнал пуст'),
 lesson:d=>{LQ={i:+d.i,ans:{}};render();window.scrollTo({top:0})},
 lclose:()=>{LQ=null;render()},
 qa:d=>{LQ.ans[d.q]=+d.o;const L=LESSONS[LQ.i];if(Object.keys(LQ.ans).length===L.q.length){const sc=L.q.filter((q,i)=>LQ.ans[i]===q.a).length,p=Math.round(sc/L.q.length*100);S.learn[LQ.i]=Math.max(S.learn[LQ.i]||0,p);save()}render()},
 whatpick:d=>{whatId=d.id;whatQ=whatQ||'';$('#whatres').innerHTML=whatRes()},
 whatchip:d=>{whatQ=d.q;whatId=d.id;render();window.scrollTo({top:0})},
 savecoords:()=>{const v=($('#cardCo').value||'').trim();if(!v){toast('Введите координаты');return}S.card.coords=v;S.card.coordsAt=Date.now();save();render();toast('Координаты сохранены')},
 showcard:()=>showCard(),
 copyplan:()=>copy(planText()),
 sim:d=>{S.sim=d.v;save();render()},
 pack:async()=>{await pwaRefresh();try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}await pwaRefresh();if(PWA.cached>0){S.pack={ts:Date.now()};S.prep.pack=1;save();toast('Готово: приложение в кэше ('+PWA.cached+' файлов)')}else toast('Service Worker недоступен: откройте приложение по http(s) и перезагрузите');wxLoad(true);render()},
 demostart:()=>{window.__wxPrev=JSON.stringify(S.wx);S.demo=0;FX.reset();render();window.scrollTo({top:0})},
 demonext:()=>{if(S.demo>=DEMO_STEPS.length-1){A.demostop();return}S.demo++;FX[DEMO_STEPS[S.demo].fx]();render();window.scrollTo({top:0})},
 demostop:()=>{S.demo=-1;S.sim='auto';ST=null;ov('');try{const p=JSON.parse(window.__wxPrev||'null');if(p&&p.sc==='live')S.wx=p;else setWx('clear')}catch(e){setWx('clear')}S.view='demo';render()},
 scrollto:d=>{const el=document.getElementById(d.id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},
 enterlvl:d=>{S.level=+d.v;save();go('home')},
 gpsnow:async()=>{toast('Определяю позицию…');const p=await gpsOnce();if(p){toast('Позиция сохранена ±'+p.acc+' м');if(S.view==='route'&&MAP)MAP.setView([p.lat,p.lon],Math.max(MAP.getZoom(),14));if(S.view==='card')render()}},
 stgps:async()=>{const p=await gpsOnce();if(p){ST.a.where=S.card.coords;drawST()}},
 track:()=>{S.tracking=!S.tracking;if(S.tracking){gpsStart();toast('Запись пути включена')}else{gpsStop();toast('Запись пути выключена')}save();render()},
 wxload:()=>wxLoad(false),
 wxgps:async()=>{const p=await gpsOnce();if(p)wxLoad(false)},
 routedemo:()=>{const d=DEF().route;S.route=d;save();render()},
 addmode:d=>{S.addMode=d.v;save();render()},
 cachemap:()=>mapCacheView(),
 pwaupdate:()=>{if(PWA.waiting)PWA.waiting.postMessage('SKIP_WAITING')},
 pwarefresh:()=>pwaRefresh(),
 pwainstall:async()=>{if(!PWA.install)return;PWA.install.prompt();try{await PWA.install.userChoice}catch(e){}PWA.install=null;render()},
 gcreate:async()=>{const n=($('#ogN').value||'').trim(),l=($('#ogL').value||'').trim();if(!n||!l){toast('Введите название группы и своё имя');return}try{await gCreate(n,l,S.group.mode);render();toast('Группа создана')}catch(e){toast('Не удалось создать: '+e.message)}},
 gjoin:async()=>{const c=($('#ojC').value||'').trim(),n=($('#ojN').value||'').trim();if(!c||!n){toast('Введите код и своё имя');return}try{await gJoin(c,n);render();toast('Вы в группе')}catch(e){toast(e.message)}},
 gleave:()=>gLeave(),
 gpull:()=>gPull(),
 gstatus:d=>gSetStatus(d.v),
 gloc:()=>{S.sync.shareLoc=!S.sync.shareLoc;save();if(S.sync.shareLoc)gpsOnce().finally(()=>gReport());render()},
 gcheckin:()=>gCheckin(),
 gack:async()=>{const y=S.sync;if(y.data)y.ackedAt=y.data.checkinAt;save();await gReport({ack:true});renderShell();if(S.view==='group')render();toast('Отмечено: вы на месте')},
 gremove:d=>gRemove(+d.id),
 gshare:()=>shareText('Присоединяйтесь к группе «'+S.sync.data.name+'» в Mountain Safe. Код группы: '+S.sync.code+'. Раздел «Моя группа» → «Войти по коду».'),
 copycoords:d=>copy(d.c),
 stgroup:async()=>{S.sync.myStatus='emergency';await gpsOnce();await gReport({note:INC[ST.a.inc||'other'].t});toast('Группа оповещена')},
 sharesit:()=>shareText(sitrep(ST.a)),
};
/* keyboard support for non-button clickable rows */
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('li[data-a]')){e.preventDefault();e.target.click()}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const f=A[el.dataset.a];if(f){e.preventDefault();f(el.dataset,el)}});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.i&&!el.dataset.a){let v=el.value;if(el.dataset.n!==undefined)v=parseFloat(v)||0;setPath(el.dataset.i,v)}if(el.dataset&&el.dataset.live&&LIVE[el.dataset.live])LIVE[el.dataset.live](el)});
document.addEventListener('change',e=>{const el=e.target;if(el.id==='gpxIn'){gpxImport(el.files&&el.files[0]);el.value='';return}if(!el.dataset)return;if(el.dataset.r!==undefined)render();if(el.dataset.sel&&A[el.dataset.sel])A[el.dataset.sel](el.dataset,el)});
window.addEventListener('online',()=>render());window.addEventListener('offline',()=>render());
try{if(navigator.connection)navigator.connection.addEventListener('change',()=>render())}catch(e){}
boot();
render();
