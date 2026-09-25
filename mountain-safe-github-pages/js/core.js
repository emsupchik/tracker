/* ================= STATE ================= */
const KEY='mountain-safe-v1';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const tm=ts=>new Date(ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const agoTxt=ts=>{const m=Math.max(0,Math.round((Date.now()-ts)/60000));return m<1?'только что':m<60?m+' мин назад':Math.round(m/60)+' ч назад'};
function DEF(){return{
 level:0,view:'home',prep:{...PREP_DEFAULT},
 route:{...DEMO_ROUTE,risks:DEMO_RISKS.map(r=>({...r})),rest:DEMO_REST.map(x=>({...x})),exits:DEMO_EXIT.map(x=>({...x})),alt:'Вернуться по тропе к выходу A (ДЕМО)'},
 wx:{sc:'clear',temp:16,wind:12,rain:0,storm:5,vis:30},
 group:{name:'Поход 9А',mode:'school',members:DEMO_MEMBERS.map((m,i)=>({id:i+1,...m,seen:Date.now()-m.ago*60000})),nextId:50,evac:'',warn:false},
 card:{name:'Тимур (пример)',phone:'+7 000 000 00 00',cname:'Мама (пример)',group:'Поход 9А',route:DEMO_ROUTE.name,start:'Парковка у входа в долину',back:'17:30',status:'ok',coords:'',coordsAt:0},
 learn:{},log:[],pack:null,sim:'auto',checks:{},quick:{},demo:-1,
 gps:null,track:[],tracking:false,wxLive:null,wxLocText:'',addMode:'',
 sync:{code:'',role:'',memberId:0,token:'',name:'',data:null,queue:[],lastPull:0,myStatus:'ok',shareLoc:false,ackedAt:0,seenEm:{}}}}
function load(){let s=DEF();try{const raw=localStorage.getItem(KEY);if(raw)s=Object.assign(s,JSON.parse(raw))}catch(e){}s.view='home';s.demo=-1;return s}
let S=load();let saveT;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}},150)}
function setPath(p,v){const k=p.split('.');let o=S;for(let i=0;i<k.length-1;i++)o=o[k[i]];o[k[k.length-1]]=v;save()}

/* ================= ICONS ================= */
const ICONS={home:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',alert:'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',list:'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',route:'M6 20a2 2 0 100-4 2 2 0 000 4zM18 8a2 2 0 100-4 2 2 0 000 4zM8 18h7a3 3 0 000-6H9a3 3 0 010-6h7',cloud:'M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18H7z',book:'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM8 7h7M8 11h5',shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',cross:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z',cap:'M2 9l10-5 10 5-10 5L2 9zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',help:'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 3.5M12 17h.01',users:'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 4.5a3.5 3.5 0 010 6.5M22 20c0-2.5-1.5-4.5-4-5.5',card:'M3 6h18v12H3zM7 10h4M7 14h6M15 10h2',download:'M12 3v12M7 11l5 5 5-5M4 20h16',play:'M7 4l13 8-13 8V4z',info:'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01',grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',mountain:'M2 20l7-12 4 6 3-4 6 10H2z',bolt:'M13 2L4 14h7l-1 8 9-12h-7l1-8z',pin:'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',copy:'M9 9h11v11H9zM5 15V4h11'};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]||''}"/></svg>`;

/* ================= HELPERS ================= */
const CONN={online:{t:'ONLINE',c:'ok'},weak:{t:'WEAK CONNECTION',c:'warn'},offline:{t:'OFFLINE',c:'crit'}};
function conn(){if(S.sim!=='auto')return S.sim;if(navigator.onLine===false)return 'offline';const c=navigator.connection;if(c&&(/(^|-)2g/.test(c.effectiveType||'')||c.saveData))return 'weak';return 'online'}
const RISK=[{t:'Низкий риск',c:'ok'},{t:'Повышенное внимание',c:'warn'},{t:'Высокий риск',c:'hi'},{t:'Критический риск',c:'crit'}];
const DIFF=[{t:'Лёгкий',c:'ok'},{t:'Средний',c:'warn'},{t:'Сложный',c:'hi'},{t:'Очень сложный',c:'crit'}];
const lvName=()=>LEVELS[S.level].k;
function head(t,p,extra=''){return`<div class="head"><div class="row sp"><h1>${t}</h1>${extra}</div>${p?`<p>${p}</p>`:''}</div>`}
const demoB='<span class="badge demo">DEMO</span>';
let toastT;function toast(m){const t=$('#toast');t.innerHTML=`<div class="toast" role="status">${E(m)}</div>`;clearTimeout(toastT);toastT=setTimeout(()=>t.innerHTML='',2200)}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Скопировано')}catch(e){try{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Скопировано')}catch(e2){toast('Выделите текст и скопируйте вручную')}}}
function logAdd(t,type='info'){S.log.unshift({ts:Date.now(),t,type});S.log=S.log.slice(0,200);save()}

/* ================= SHELL ================= */
const NAV=[['home','Главная','home'],['sos','SOS','alert'],['prep','Подготовка','list'],['route','Маршрут','route'],['weather','Погода и риски','cloud'],['memos','Памятки','book'],['check','Проверка','shield'],['aid','Первая помощь','cross'],['learn','Обучение','cap'],['what','Что делать, если…','help'],['group','Моя группа','users'],['card','Emergency Card','card'],['offline','Офлайн-режим','download'],['demo','Демо-сценарий','play'],['level','Уровень подготовки','mountain'],['about','О проекте','info']];
const LOGO='<svg class="ic" viewBox="0 0 24 24"><path d="M2 20l7-12 4 6 3-4 6 10H2z"/></svg>';
function renderShell(){
 document.body.classList.toggle('is-landing',S.view==='landing');
 const cn=CONN[conn()];
 $('#top').innerHTML=`<button class="brand" data-a="go" data-v="landing" aria-label="О продукте"><span class="logo">${LOGO}</span>Mountain Safe</button>
  <button class="pill" data-a="go" data-v="offline" title="Состояние связи"><span class="dot ${cn.c}"></span>${cn.t}</button>
  <button class="pill" data-a="go" data-v="level" title="Уровень подготовки">${ic('mountain','sm')}${lvName()}</button>
  <button class="btn sm dng" data-a="stress">Stress Mode</button>`;
 const grp=(t,ids)=>`<small>${t}</small>`+ids.map(id=>{const n=NAV.find(x=>x[0]===id);return`<button class="nav ${n[0]==='sos'?'sos':''} ${S.view===id?'on':''}" data-a="go" data-v="${id}">${ic(n[2])}${n[1]}</button>`}).join('');
 $('#side').innerHTML=`<button class="brand" data-a="go" data-v="landing"><span class="logo">${LOGO}</span>Mountain Safe</button>`+grp('Главное',['home','sos','prep','route','weather'])+grp('Знания',['memos','check','aid','learn','what'])+grp('Группа и данные',['group','card','offline'])+grp('Прототип',['demo','level','about']);
 const tab=(id,l,i,cls='')=>`<button class="tab ${cls} ${S.view===id?'on':''}" data-a="go" data-v="${id}">${ic(i)}<span>${l}</span></button>`;
 $('#tabbar').innerHTML=tab('home','Главная','home')+tab('prep','Подготовка','list')+tab('sos','SOS','alert','sos')+tab('route','Маршрут','route')+tab('more','Ещё','grid');
 const c=conn();
 $('#banner').innerHTML=(typeof syncBanner==='function'?syncBanner():'')+(c==='offline'?`<div class="offbanner">${ic('alert')}<div><b>OFFLINE.</b> Приложение работает по сохранённым данным. Отправка и обновления недоступны, алгоритмы, карточка и чек-листы работают.</div></div>`:c==='weak'?`<div class="weakbanner"><b>Слабая связь.</b> Отправляйте важное короткими сообщениями (SMS). Скачайте офлайн-пакет заранее.</div>`:'');
 const d=S.demo;document.body.classList.toggle('demo-on',d>=0);
 $('#demobar').innerHTML=d>=0?`<div class="demo-bar"><span class="badge demo">DEMO ${d+1}/${DEMO_STEPS.length}</span><b class="small" style="flex:1">${E(DEMO_STEPS[d].t)}</b><button class="btn sm pri" data-a="demonext">${d>=DEMO_STEPS.length-1?'Завершить':'Дальше'}</button><button class="btn sm ghost" data-a="go" data-v="demo">К демо</button></div>`:'';
}
let curInc=null;const DONE={};
function render(){if(typeof mapDestroy==='function')mapDestroy();renderShell();const V=VIEWS[S.view]||vHome;$('#view').innerHTML=V();if(typeof afterRender==='function')afterRender()}
function go(v){if(v!=='landing'&&!S.entered){S.entered=true}S.view=v;curInc=null;render();window.scrollTo({top:0});save()}
function ov(h){$('#overlay').innerHTML=h?`<div class="ov" role="dialog" aria-modal="true">${h}</div>`:''}

/* ================= HOME ================= */
function numsCard(){return`<div class="card flat"><div class="sect-t">Экстренные номера</div>${EMERGENCY_NUMBERS.map(x=>`<div class="emnum"><b>${x.n}</b><span class="muted small" style="flex:1">${x.t}</span><a class="btn sm" href="tel:${x.n}">Позвонить</a></div>`).join('')}<div class="tiny">Ссылка на звонок может не сработать в этом окне: номер написан крупно. Номера указаны для Казахстана, проверьте номера своего региона.</div></div>`}
function prepVis(){return PREP.filter(p=>p.min<=S.level)}
function prepPct(){const v=prepVis();return v.length?Math.round(v.filter(p=>S.prep[p.id]).length/v.length*100):0}
function vHome(){
 const L=LEVELS[S.level],cn=CONN[conn()],pct=prepPct(),rk=RISK[wxRisk(S.wx).l];
 const tiles=[['sos','alert','SOS','Что делать сейчас'],['route','route','Маршрут','Сложность и риски'],['prep','list','Подготовка','Чек-лист и готовность'],['aid','cross','Первая помощь','Короткие алгоритмы'],['memos','book','Памятки','Библиотека'],['group','users','Моя группа','Статусы и перекличка']];
 return`<section class="hero">
  <svg class="peaks" viewBox="0 0 400 160" aria-hidden="true"><path d="M0 160L90 40l50 70 60-90 80 110 40-50 80 80z" fill="none" stroke="var(--g)" stroke-width="2"/><path d="M0 160L60 90l40 40 70-100 70 100 60-60 100 90z" fill="var(--gs)"/></svg>
  <div><h1>Mountain Safe</h1></div>
  <p class="tag">Безопасность начинается до того, как вы отправились в горы.</p>
  <button class="sosbtn" data-a="go" data-v="sos" aria-label="SOS, экстренная помощь">${ic('alert','lg')}SOS</button>
  <div class="grid g3s">
   <button class="stat" data-a="go" data-v="level"><span>Ваш уровень</span><b>${L.k}</b></button>
   <button class="stat" data-a="go" data-v="offline"><span>Режим</span><b><span class="dot ${cn.c}" style="display:inline-block;margin-right:6px"></span>${cn.t.split(' ')[0]}</b></button>
   <button class="stat" data-a="go" data-v="prep"><span>Готовность</span><b>${pct}%</b></button>
  </div></section>
  <div class="grid g3t">${tiles.map(t=>`<button class="tile" data-a="go" data-v="${t[0]}"><span class="ti">${ic(t[1])}</span><b>${t[2]}</b><span>${t[3]}</span></button>`).join('')}</div>
  <div class="grid g2">
   <button class="card" style="text-align:left" data-a="stress"><span class="sect-t">Stress Mode</span><h3>Один экран — одно действие</h3><span class="muted small">6 коротких вопросов и пошаговый план. Для момента, когда трудно думать.</span></button>
   <button class="card" style="text-align:left" data-a="go" data-v="check"><span class="sect-t">Быстрая проверка</span><h3>10 секунд перед выходом</h3><span class="muted small">Шесть пунктов. Сразу видно, что не готово.</span></button>
  </div>
  <div class="risk tone-${rk.c}"><span class="dot ${rk.c}"></span><div style="flex:1"><b>${rk.t}</b> · погода ${wxBadge()}<div class="small muted">${wxSourceLine()}</div></div><button class="btn sm" data-a="go" data-v="weather">Подробнее</button></div>
  <div class="card"><div class="row sp"><h3>Для уровня ${L.k}</h3><button class="btn sm ghost" data-a="go" data-v="level">Сменить</button></div><ul class="muted" style="margin:0;padding-left:18px">${L.gets.map(g=>`<li>${g}</li>`).join('')}</ul></div>
  <button class="btn big" data-a="go" data-v="demo" style="border-color:var(--warn)">${ic('play')} Смотреть демо-сценарий ЧС</button>`}

/* ================= LEVEL ================= */
function vLevel(){return`${head('Уровень подготовки','Уровень меняет содержание: количество шагов, глубину советов, чек-листы и инструменты руководителя.')}
 <div class="grid g2">${LEVELS.map((l,i)=>`<button class="lvlcard ${S.level===i?'on':''}" data-a="setlevel" data-v="${i}"><div class="row sp"><h2>${l.k}</h2>${S.level===i?'<span class="badge g">Выбран</span>':''}</div><div class="muted small">${l.d}</div><ul>${l.gets.map(g=>`<li>${g}</li>`).join('')}</ul></button>`).join('')}</div>
 <div class="card flat"><div class="sect-t">Что меняется при смене уровня</div><div class="small muted">Чек-лист подготовки: ${PREP.filter(p=>p.min<=S.level).length} пунктов. Памятки: ${MEMOS.filter(m=>(m.min||0)<=S.level).length} доступно. SOS-алгоритмы: ${S.level>=2?'с расширенными шагами':'краткие'}${S.level>=3?' и протоколом руководителя':''}. Инструменты руководителя (журнал, план эвакуации): ${S.level>=3?'включены':'с уровня EXPERT'}.</div></div>`}

/* ================= SOS ================= */
function vSos(){
 if(curInc)return vInc(curInc);
 return`${head('SOS. Что произошло?','Выберите ситуацию и получите короткий алгоритм.')}
 <div class="dngbox row sp"><div><b>Угроза жизни?</b> Сначала звоните <span class="num">112</span>.</div><button class="btn sm dng" data-a="stress">Stress Mode</button></div>
 <div class="grid g3">${SOS_IDS.map(id=>`<button class="inc" data-a="inc" data-id="${id}"><span class="em">${INC[id].em}</span><b>${INC[id].t}</b></button>`).join('')}</div>${numsCard()}`}
const LEAD=['Назначьте ответственных: за пострадавшего, за группу, за связь.','Запишите время события и первичное состояние пострадавшего.','Сформируйте сообщение спасателям и передайте его.','Решите: эвакуация силами группы или ожидание спасателей на месте.'];
function vInc(id){const I=INC[id],lv=S.level,dn=DONE[id]||(DONE[id]={});
 const li=(t,i,cls,pre)=>`<li class="${cls} ${dn[pre+i]?'done':''}" data-a="dstep" data-id="${id}" data-k="${pre+i}" role="button" tabindex="0">${E(t)}</li>`;
 return`<div class="row"><button class="btn sm ghost" data-a="incback">← Все ситуации</button></div>
 ${head(I.em+' '+I.t)}
 ${I.call?'<div class="dngbox"><b>Нужна экстренная помощь.</b> Позвоните 112 как можно раньше.</div>':'<div class="warnbox">Если состояние ухудшается или вы не уверены, звоните 112.</div>'}
 <ol class="steps">${I.steps.map((t,i)=>li(t,i,'','s')).join('')}</ol>
 ${lv>=2&&I.adv.length?`<div class="sect-t">Расширенно</div><ol class="steps">${I.adv.map((t,i)=>li(t,i,'adv','a')).join('')}</ol>`:''}
 ${lv>=3?`<div class="sect-t">Протокол руководителя</div><ol class="steps">${LEAD.map((t,i)=>li(t,i,'adv','l')).join('')}</ol>`:''}
 ${I.no.length?`<div class="sect-t">Нельзя</div>${I.no.map(t=>`<div class="dont">${E(t)}</div>`).join('')}`:''}
 <div class="grid g2"><button class="btn pri" data-a="stress" data-id="${id}">Пошагово (Stress Mode)</button><button class="btn" data-a="sitrep" data-id="${id}">Сообщение спасателям</button><button class="btn" data-a="go" data-v="card">Emergency Card</button>${lv>=3?`<button class="btn" data-a="logsos" data-id="${id}">Записать в журнал</button>`:''}</div>${numsCard()}`}

/* ================= STRESS MODE ================= */
let ST=null;
const STK=['inc','danger','who','move','comm','where'];
const STQ={danger:{q:'Есть ли непосредственная опасность?',h:'Камни, крутой склон, вода, молния, огонь.',o:[['yes','ДА'],['no','НЕТ']]},who:{q:'Кто пострадал?',o:[['me','Я'],['other','ДРУГОЙ ЧЕЛОВЕК']]},move:{q:'Может ли человек двигаться?',o:[['yes','ДА'],['no','НЕТ'],['unk','НЕ ЗНАЮ']]},comm:{q:'Есть ли связь?',o:[['yes','ДА'],['weak','СЛАБАЯ'],['no','НЕТ']]}};
function stressStart(inc,preset){ST={a:Object.assign({inc:inc||null,danger:null,who:null,move:null,comm:null,where:S.card.coords||''},preset||{}),q:inc?1:0,pi:0,phase:'ask'};if(preset){ST.plan=buildPlan(ST.a);ST.phase='plan'}drawST()}
function buildPlan(a){const I=INC[a.inc||'other'],P=[];
 if(a.danger==='yes')P.push({h:'Сначала безопасность',t:'Если можете безопасно, уйдите или уведите группу от опасности: камни, склон, вода. Собой не рискуйте.'});
 P.push(a.who==='me'?{h:'Позаботьтесь о себе',t:'Сядьте или лягте в безопасном месте. Дышите медленно: вдох на 4, выдох на 6.'}:{h:'Подойдите к человеку',t:'Только если это безопасно. Скажите, что вы рядом и поможете.'});
 if(a.move==='no'&&!['lost','nocomm','storm','animal'].includes(a.inc))P.push({h:'Не перемещайте',t:'Человек не может двигаться. Оставьте на месте, утеплите, не заставляйте идти.'});
 I.steps.forEach(t=>P.push({h:I.t,t}));
 if(S.level>=2)I.adv.forEach(t=>P.push({h:I.t+' · расширенно',t}));
 if(a.comm==='yes')P.push({h:'Вызовите помощь',t:'Позвоните 112. Скажите: где вы, что случилось, сколько человек, в каком они состоянии.'});
 else if(a.comm==='weak')P.push({h:'Слабая связь',t:'Поднимитесь на открытое место без риска. Отправьте SMS с координатами, затем звоните 112. Повторяйте попытки.'});
 else P.push({h:'Нет связи',t:'Отправьте двоих к месту со связью, не оставляя пострадавшего одного. Подавайте сигнал: 6 в минуту, пауза, снова.'});
 P.push(a.where?{h:'Ваше место',t:'Координаты: '+a.where+'. Передайте их спасателям.'}:{h:'Опишите место',t:'Назовите ориентиры: река, хребет, тропа, время пути от старта. Откройте офлайн-карту.'});
 P.push({report:1,h:'Сообщение для спасателей',t:''});return P}
const SA={danger:{yes:'Есть',no:'Нет'},who:{me:'Я сам(а)',other:'Другой человек'},move:{yes:'Может',no:'Не может',unk:'Неизвестно'},comm:{yes:'Есть',weak:'Слабая',no:'Нет'}};
function sitrep(a){const I=INC[a.inc||'other'],c=S.card,g=S.group;
 return['MOUNTAIN SAFE — СООБЩЕНИЕ СПАСАТЕЛЯМ','Время: '+tm(Date.now()),'Что случилось: '+I.t,'Пострадавший: '+(SA.who[a.who]||'не указано'),'Может двигаться: '+(SA.move[a.move]||'не указано'),'Опасность на месте: '+(SA.danger[a.danger]||'не указано'),'Связь: '+(SA.comm[a.comm]||'не указано'),'Координаты: '+(a.where||'неизвестны, опишу ориентиры')+(S.gps&&a.where&&a.where.indexOf(fmtCoord(S.gps.lat,S.gps.lon))===0?' (точность ±'+S.gps.acc+' м, определено '+tm(S.gps.ts)+')':''),'Группа: '+(S.sync.code&&S.sync.data?S.sync.data.name+', '+S.sync.data.members.length:g.name+', '+g.members.length)+' чел.','Маршрут: '+c.route,'Старт: '+c.start,'Контакт: '+c.cname+' '+c.phone].join('\n')}
function drawST(){
 if(!ST){ov('');return}
 const cn=CONN[conn()];
 const top=`<div class="row sp"><span class="st-calm">СПОКОЙНО. МЫ ПОМОЖЕМ ТЕБЕ ПОШАГОВО.</span><button class="btn sm" data-a="stclose">Выйти</button></div><div class="row sp"><span class="pill"><span class="dot ${cn.c}"></span>${cn.t}</span><a class="btn sm dng" href="tel:112">112</a></div>`;
 let body='',foot='';
 if(ST.phase==='ask'){const k=STK[ST.q];
  body=`<div class="tiny">Вопрос ${ST.q+1} из ${STK.length}</div>`;
  if(k==='inc')body+=`<div class="st-h">Что произошло?</div><div class="grid g3">${SOS_IDS.map(id=>`<button class="inc" data-a="stpick" data-k="inc" data-v="${id}"><span class="em">${INC[id].em}</span><b>${INC[id].t}</b></button>`).join('')}</div>`;
  else if(k==='where')body+=`<div class="st-h">Где вы находитесь?</div><p class="muted">Введите координаты или ориентиры, либо определите по GPS. Последние сохранённые координаты подставлены заранее.</p><input id="stWhere" value="${E(ST.a.where)}" placeholder="Например: 43.12345, 77.12345 или «у озера, 3 ч от старта»"><div class="ans"><button class="btn" data-a="stgps">Определить по GPS</button><button class="btn pri" data-a="stwhere">Дальше</button><button class="btn" data-a="stwhere" data-v="0">Не знаю, где я</button></div>`;
  else{const q=STQ[k];body+=`<div class="st-h">${q.q}</div>${q.h?`<p class="muted">${q.h}</p>`:''}<div class="ans">${q.o.map(o=>`<button class="btn ${o[0]==='yes'&&k==='danger'?'dng':''}" data-a="stpick" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`}
  if(ST.q>0)foot=`<button class="btn ghost" data-a="stback">← Назад</button>`;
 }else{const P=ST.plan,p=P[ST.pi];
  if(p.report)body=`<div class="tiny">Шаг ${ST.pi+1} из ${P.length}</div><div class="st-h">Сообщение для спасателей</div><div class="sit" id="sitTxt">${E(sitrep(ST.a))}</div><div class="grid g2"><a class="btn pri" href="${E(smsHref(sitrep(ST.a)))}">SMS близкому</a><button class="btn" data-a="sharesit">Поделиться</button><button class="btn" data-a="copysit">Скопировать</button>${S.sync.code?'<button class="btn dng" data-a="stgroup">Сообщить группе</button>':''}<button class="btn" data-a="stcard">Emergency Card</button><button class="btn" data-a="stlog">Записать в журнал</button></div><div class="warnbox">Передайте это по 112 голосом. SMS проходит при слабом сигнале. Пока идёт помощь: держите пострадавшего в тепле и следите за дыханием.</div>`;
  else body=`<div class="big-step"><div class="n">Шаг ${ST.pi+1} из ${P.length}</div>${p.h?`<div class="sect-t">${E(p.h)}</div>`:''}<div class="t">${E(p.t)}</div></div>`;
  foot=`<div class="grid g2"><button class="btn" data-a="stprev" ${ST.pi===0?'disabled':''}>← Назад</button>${p.report?`<button class="btn pri" data-a="stclose">Готово</button>`:`<button class="btn pri" data-a="stnext">Сделано, дальше</button>`}</div>`}
 ov(`<div class="in">${top}${body}<div style="flex:0">${foot}</div></div>`)}
