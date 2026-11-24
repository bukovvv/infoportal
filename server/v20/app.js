/* ---------- dane przykładowe ---------- */
const REG={wlkp:{nazwa:'Wielkopolska',hub:'Poznań Główny',cel:'Gniezno',kto:'Kolei Wielkopolskich',ag:'KW',agN:'Koleje Wielkopolskie',szybkie:['Poznań Główny','Gniezno','Września','Leszno'],wazne:['Poznań Główny','Gniezno','Września','Konin','Leszno','Kościan','Swarzędz','Pobiedziska','Mosina'],lines:[
 {id:'PKM1',badge:'PKM1',ag:'KW',kto:'Koleje Wielkopolskie',color:'#2F6FC4',every:30,first:270,back:11,base:77500,map:1,peron:[1,16],
  stops:[['Poznań Główny',0],['Poznań Garbary',4],['Poznań Wschód',8],['Kobylnica',14],['Biskupice Wielkopolskie',19],['Promno',23],['Pobiedziska Letnisko',26],['Pobiedziska',29],['Fałkowo',34],['Lednogóra',38],['Pierzyska',43],['Gniezno',49]]},
 {id:'KWK',badge:'KW',ag:'KW',kto:'Koleje Wielkopolskie',color:'#1E9467',every:60,first:312,back:23,base:77100,map:1,peron:[3,8],
  stops:[['Poznań Główny',0],['Poznań Garbary',4],['Poznań Wschód',8],['Swarzędz',14],['Kostrzyn Wielkopolski',24],['Nekla',33],['Września',42],['Słupca',58],['Konin',74]]},
 {id:'KWL',badge:'KW',ag:'KW',kto:'Koleje Wielkopolskie',color:'#8B55C7',every:60,first:290,back:31,base:77300,map:1,peron:[5,22],
  stops:[['Poznań Główny',0],['Poznań Dębiec',5],['Luboń koło Poznania',9],['Puszczykowo',15],['Mosina',20],['Czempiń',31],['Kościan',41],['Leszno',62]]},
 {id:'IC',badge:'IC',ag:'IC',kto:'PKP Intercity',color:'#E8641B',every:120,first:387,back:40,base:5300,peron:[3,10],nazwa:'Mieszko',
  stops:[['Poznań Główny',0],['Gniezno',26]]},
 {id:'PR',badge:'PR',ag:'PR',kto:'POLREGIO',color:'#C2952B',every:120,first:340,back:55,base:78600,peron:[2,5],
  stops:[['Poznań Główny',0],['Swarzędz',12],['Września',36],['Słupca',50],['Konin',64]]}
],pos:{'Poznań Główny':[300,280,'L'],'Poznań Garbary':[330,255,'l'],'Poznań Wschód':[365,235,'l'],'Kobylnica':[410,205,'l'],'Biskupice Wielkopolskie':[440,188,'l'],'Promno':[465,175,'l'],'Pobiedziska Letnisko':[490,163,'l'],'Pobiedziska':[515,150,'l'],'Fałkowo':[545,135,'l'],'Lednogóra':[575,120,'l'],'Pierzyska':[605,105,'l'],'Gniezno':[640,88,'r'],
 'Swarzędz':[420,245,'b'],'Kostrzyn Wielkopolski':[480,262,'b'],'Nekla':[535,275,'t'],'Września':[595,290,'b'],'Słupca':[670,300,'t'],'Konin':[750,305,'b'],
 'Poznań Dębiec':[290,315,'r'],'Luboń koło Poznania':[280,345,'r'],'Puszczykowo':[285,380,'r'],'Mosina':[280,410,'r'],'Czempiń':[255,450,'r'],'Kościan':[225,490,'r'],'Leszno':[170,535,'r']}},
mal:{nazwa:'Małopolska',hub:'Kraków Główny',cel:'Wieliczka Rynek-Kopalnia',kto:'Kolei Małopolskich',ag:'KML',agN:'Koleje Małopolskie',szybkie:['Kraków Główny','Tarnów','Miechów','Kraków Lotnisko'],wazne:['Kraków Główny','Kraków Lotnisko','Kraków Płaszów','Wieliczka Rynek-Kopalnia','Bochnia','Tarnów','Miechów','Słomniki'],
 etyk:n=>n==='Kraków Główny'?'Kraków Gł.':n.replace(/^Kraków /,''),lines:[
 {id:'SKA1',badge:'SKA1',ag:'KML',agl:'KMŁ',kto:'Koleje Małopolskie',color:'#C8376B',every:30,first:275,back:9,base:33100,map:1,peron:[3,4],
  stops:[['Kraków Lotnisko',0],['Kraków Olszanica',4],['Kraków Zakliki',6],['Kraków Młynówka',9],['Kraków Bronowice',11],['Kraków Łobzów',14],['Kraków Główny',18],['Kraków Grzegórzki',21],['Kraków Zabłocie',23],['Kraków Płaszów',27],['Kraków Prokocim',30],['Kraków Bieżanów',34],['Wieliczka Park',44],['Wieliczka Rynek-Kopalnia',46]]},
 {id:'SKA2',badge:'SKA2',ag:'KML',agl:'KMŁ',kto:'Koleje Małopolskie',color:'#1E9467',every:60,first:305,back:27,base:33200,map:1,peron:[1,1],
  stops:[['Kraków Główny',0],['Kraków Batowice',7],['Zastów',11],['Baranówka',14],['Łuczyce',18],['Goszcza',22],['Niedźwiedź',26],['Słomniki',31],['Miechów',44]]},
 {id:'SKA3',badge:'SKA3',ag:'KML',agl:'KMŁ',kto:'Koleje Małopolskie',color:'#D98200',every:60,first:295,back:19,base:33300,map:1,peron:[4,8],
  stops:[['Kraków Główny',0],['Kraków Grzegórzki',3],['Kraków Zabłocie',5],['Kraków Płaszów',8],['Kraków Prokocim',11],['Kraków Bieżanów',14],['Podłęże',22],['Kłaj',29],['Bochnia',38],['Brzesko Okocim',51],['Tarnów',72]]},
 {id:'IC',badge:'IC',ag:'IC',kto:'PKP Intercity',color:'#E8641B',every:120,first:402,back:35,base:3500,peron:[2,3],
  stops:[['Kraków Główny',0],['Tarnów',48]]},
 {id:'PR',badge:'PR',ag:'PR',kto:'POLREGIO',color:'#7A6FD0',every:120,first:350,back:50,base:30600,peron:[5,10],
  stops:[['Kraków Główny',0],['Kraków Płaszów',7],['Bochnia',30],['Brzesko Okocim',40],['Tarnów',56]]}
],pos:{'Kraków Lotnisko':[190,235,'b'],'Kraków Olszanica':[228,243,'t'],'Kraków Zakliki':[258,250,'b'],'Kraków Młynówka':[290,257,'t'],'Kraków Bronowice':[322,264,'b'],'Kraków Łobzów':[360,275,'t'],'Kraków Główny':[400,290,'r'],
 'Kraków Grzegórzki':[415,315,'r'],'Kraków Zabłocie':[428,340,'r'],'Kraków Płaszów':[442,365,'r'],'Kraków Prokocim':[456,390,'r'],'Kraków Bieżanów':[470,415,'l'],'Wieliczka Park':[465,460,'r'],'Wieliczka Rynek-Kopalnia':[460,490,'r'],
 'Podłęże':[530,420,'b'],'Kłaj':[580,424,'t'],'Bochnia':[635,427,'b'],'Brzesko Okocim':[700,428,'t'],'Tarnów':[765,425,'b'],
 'Kraków Batowice':[420,250,'r'],'Zastów':[432,222,'r'],'Baranówka':[442,196,'r'],'Łuczyce':[452,170,'r'],'Goszcza':[462,145,'r'],'Niedźwiedź':[470,120,'r'],'Słomniki':[480,97,'r'],'Miechów':[492,72,'r']}}};
let R,LINES,POS,WAZNE,STATIONS;
const LAST=22*60+40;

/* ---------- narzędzia ---------- */
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const hm=m=>{m=((m%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60)};
const norm=s=>s.toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
// polskie nazwy stacji za granicą (w rozkładzie nazwy miejscowe)
const OBCE={'Vilnius':'Wilno','Praha hlavní nádraží':'Praga Główna','Praha-Holešovice':'Praga-Holešovice','Berlin Hauptbahnhof':'Berlin Główny','Berlin Hbf':'Berlin Główny','Wien Hauptbahnhof':'Wiedeń Główny','Wien Hbf':'Wiedeń Główny','Bratislava hl.st.':'Bratysława Główna','Budapest-Keleti':'Budapeszt Keleti','Kyiv':'Kijów','Kyiv-Pasazhyrskyi':'Kijów Pasażerski','Lviv':'Lwów','Ostrava hl.n.':'Ostrawa Główna','Bohumín':'Bogumin','Kaunas':'Kowno','Hamburg Hbf':'Hamburg Główny','Leipzig Hbf':'Lipsk Główny','Dresden Hbf':'Drezno Główne'};
const krotko=s=>(OBCE[s]||s).replace('Wielkopolskie','Wlkp.').replace('Wielkopolski','Wlkp.').replace('koło Poznania','k. Poznania');
const bkrotko=s=>krotko(s).replace('Główny','Gł.');
const pl=(n,a,b,c)=>n+' '+(n===1?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c);
const dur=m=>m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'');
const hash=s=>{let h=7;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h};
const real=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const now=real;
/* daty: jeden zapis w całym serwisie */
const DNI=['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'],DSK=['niedz.','pon.','wt.','śr.','czw.','pt.','sob.'];
const MIES=['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const dzienD=o=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+o);return d};
const etykDnia=o=>{if(o===0)return'Dziś';if(o===1)return'Jutro';const d=dzienD(o);return DSK[d.getDay()]+' '+d.getDate()+'.'+pad(d.getMonth()+1)};
const pelnaData=o=>{const d=dzienD(o);return DNI[d.getDay()]+', '+d.getDate()+' '+MIES[d.getMonth()]};
const iso=o=>{const d=dzienD(o);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const offDz=dz=>Math.round((new Date(dz+'T12:00:00')-dzienD(0))/864e5);
const IK={
 szukaj:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 stacje:'<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.500-7 12-7 12z"/><circle cx="12" cy="9" r="2.500"/>',
 mapa:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
 moje:'<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
 zamien:'<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
 wroc:'<path d="M19 12H5M11 6l-6 6 6 6"/>', zamknij:'<path d="M6 6l12 12M18 6L6 18"/>',
 udost:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>',
 kal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 dzwonek:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
 slonce:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M19 5l-1.500 1.500M6.500 17.500L5 19"/>',
 ksiezyc:'<path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z"/>',
 dol:'<path d="M6 9l6 6 6-6"/>', gora:'<path d="M6 15l6-6 6 6"/>', strz:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 zegar:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 komunikaty:'<circle cx="12" cy="12" r="9"/><path d="M12 7.500v5.500M12 16.500v.01"/>',
 opcje:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 pieszo:'<circle cx="13" cy="4.500" r="1.800"/><path d="M10 21l2-6-2.500-2.500 1-5 3 3 3 1M9.500 12.500L7 13M12 15l3 2 1 4"/>'
};
const ic=(n,s=20)=>`<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[n]}</svg>`;

/* ---------- dane: API serwisu (te same co w obecnej wersji) ---------- */
// czas = minuty od północy dzisiejszego dnia (jutro 07:30 = 1890), tak jak w makiecie
const mn=s=>{if(!s)return null;const d=new Date();d.setHours(0,0,0,0);return Math.round((Date.parse(s)-d.getTime())/6e4)};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const API=()=>'/api'+(R.id==='mal'?'/malopolska':'');
const C=new Map(),SL={};let PT=0,ARK=null;
// dane z pamięci albo undefined (wczytywanie) / null (błąd); po pobraniu przerysowuje widok (render jest synchroniczny)
function dane(u,ttl=60,slot){const k=API()+u,e=C.get(k);
 if(e&&(e.wait||Date.now()-e.at<ttl*1e3))return e.v===undefined&&slot?SL[slot]:e.v;
 if(C.size>400)for(const[x,y]of C)if(!y.wait&&Date.now()-y.at>6e5)C.delete(x);
 const n={v:e?.v,wait:true,at:0};C.set(k,n);
 fetch(k,{credentials:'same-origin'}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(j=>{n.v=j}).catch(()=>{if(n.v===undefined)n.v=null})
  .finally(()=>{n.wait=false;n.at=Date.now();if(slot&&n.v)SL[slot]=n.v;przerysuj()});
 return n.v===undefined&&slot?SL[slot]:n.v}
// ruch: dzieci elementu wchodzą po kolei, gdy zmienia się jego treść (klucz), a nie przy każdym odświeżeniu
const AT=new WeakMap(),AK={};
function anim(el,key,id=el?.id){if(!el||AK[id]===String(key))return;AK[id]=String(key);el.classList.remove('animuj');void el.offsetWidth;el.classList.add('animuj');clearTimeout(AT.get(el));AT.set(el,setTimeout(()=>el.classList.remove('animuj'),900))}
function przerysuj(){clearTimeout(PT);PT=setTimeout(()=>{render();if(ARK?.czeka)ARK.f(ARK.a)},30)}
/* stacje */
let STN=[],SBN=new Map(),SBI=new Map();
async function wczytajStacje(){const r=await fetch(API()+'/stations');if(!r.ok)throw new Error(r.status);STN=await r.json();
 SBN=new Map(STN.map(s=>[s.name,s]));SBI=new Map(STN.map(s=>[s.id,s.name]));STATIONS=STN.map(s=>s.name).sort((a,b)=>a.localeCompare(b,'pl'))}
function resolve(v){const q=norm(v);if(!q)return null;return STATIONS.find(s=>norm(s)===q)||STATIONS.find(s=>norm(s).startsWith(q))||STATIONS.find(s=>norm(s).includes(q))||null}
/* linie i przewoźnicy */
const KOL={PKM1:'#3A76C2',PKM2:'#EA1A35',PKM3:'#3F9236',PKM4:'#823D8C',PKM5:'#E8B120',KW:'#E6000A',SKA1:'#00B1EB',SKA2:'#E82F89',SKA3:'#FBBA21',K3:'#E84D0F',K5:'#F29EC4',K7:'#008C36',K22:'#95C11F',K32:'#69BFAC',K33:'#951A80',K52:'#BD1621',K63:'#4464AC',K71:'#28235B'};
const AGN={KW:'Koleje Wielkopolskie',KML:'Koleje Małopolskie',PR:'POLREGIO',IC:'PKP Intercity'};
const AGL=a=>a==='KML'?'KMŁ':a;
function linia(route,ag,isBus){ag=ag||R.ag;const sh=route?.short||AGL(ag);if(route?.color)KOL[sh]=route.color;
 const b=sh.replace(/ ?P$/,''),lin_=/^(PKM|SKA|K)\d/.test(b); // „K7P” — linia K7 (przyspieszony)
 return{id:route?.id||sh,badge:isBus?'BUS':lin_?b:AGL(ag),linia:lin_&&!isBus?b:'',color:route?.color||KOL[sh]||'#8A8F98',ag,kto:AGN[ag]||ag}}
// plakietka bez powtórzenia przewoźnika obok numeru („KW” + „KW 77100”) — wtedy sama kropka w kolorze linii
const linN=l=>l.badge===AGL(l.ag)?`<span class="lin" style="--c:${l.color}"></span>`:lin(l);
const linesOf=n=>{const s=new Set();return(SBN.get(n)?.lines||[]).map(x=>x.replace(/ ?P$/,'')).filter(x=>!s.has(x)&&s.add(x)).map(x=>({id:x,badge:x,color:KOL[x]||'#8A8F98'}))};
const krNum=n=>String(n||'').split(' ')[0]; // „33126/7 Dunajec” → „33126/7”
const nazwaP=n=>String(n||'').split(' ').slice(1).join(' ');
const numery=n=>{const m=/^(\d+)(?:\/(\d+))?/.exec(n||'');return!m?[]:m[2]?[m[1],m[1].slice(0,m[1].length-m[2].length)+m[2]]:[m[1]]};
/* odcinek połączenia → kurs w kształcie z makiety: st = postoje od wsiadania do wysiadania */
function zOdcinka(g){const l={...linia(g.route,g.agency,g.isBus),nazwa:nazwaP(g.number)},d=g.departureDelay||0;
 const st=[{n:g.from.name,t:mn(g.departure),d:g.departureDelay,p:g.platform,tor:g.track},...(g.stops||[]).map(s=>({n:s.name,t:mn(s.departure),d:s.delay})),{n:g.to.name,t:mn(g.arrival),d:g.arrivalDelay,p:g.arrivalPlatform}];
 return{id:g.key,l,st,dep:st[0].t,arr:st.at(-1).t,num:krNum(g.number),nums:numery(g.number),label:AGL(l.ag)+' '+krNum(g.number),raw:d,arrD:g.arrivalDelay??d,kier:g.headsign,kwT:g.kwTickets,km:g.distanceKm}}
const CON={};
function zPolaczenia(c){const legs=c.legs.map(g=>{const t=zOdcinka(g);return{t,i:0,j:t.st.length-1,dep:t.dep,arr:t.arr}});
 const o={legs,dep:legs[0].dep,arr:legs.at(-1).arr,km:c.distanceKm,kmP:c.distanceApprox};o.k=legs.map(x=>x.t.id).join('|');return CON[o.k]=o}
// połączenia z API: q.min — minuta odjazdu (albo przyjazdu przy q.arrive), q.o — opcje wyszukiwania
function polaczenia(a,b,q={},slot){const A=SBN.get(a),B=SBN.get(b);if(!A||!B||a===b)return[];
 const m=q.min??now(),o=q.o||{},p=new URLSearchParams({from:A.id,to:B.id,date:iso(Math.floor(m/1440)),time:hm(((m%1440)+1440)%1440),limit:q.n||4});
 if(q.arrive)p.set('arrive','1');if(o.bezp)p.set('direct','1');if(o.minT)p.set('minTransfer',o.minT);
 if(o.bez?.length)p.set('agencies',agencje().map(x=>x[0]).filter(k=>!o.bez.includes(k)).join(','));
 const r=dane('/connections?'+p,q.ttl??60,slot);return r===undefined?undefined:r?(r._c??=r.connections.map(zPolaczenia)):null}
// najbliższe połączenia trasy (20 min wstecz, żeby opóźniony pociąg został do faktycznego odjazdu)
const nast=r=>polaczenia(r.a,r.b,{min:Math.floor((now()-20)/10)*10,n:6},'m'+r.a+'>'+r.b);
const cKey=c=>c.k;
const cFromKey=k=>CON[k]||null;
const cFrom=c=>c.legs[0].t.st[c.legs[0].i].n, cTo=c=>{const x=c.legs.at(-1);return x.t.st[x.j].n};
const delay=t=>t.raw||0;
const cDelay=c=>delay(c.legs[0].t);
const cArr=c=>c.arr+(c.legs.at(-1).t.arrD||0);
const doOdj=c=>c.dep+cDelay(c)-now();
const dzien=m=>Math.floor(m/1440);
const peron=(t,i)=>({p:t.st[i].p,tor:t.st[i].tor});
function tablica(st,mode,n){const s=SBN.get(st);if(!s)return[];const r=dane(`/stations/${s.id}/board?mode=${mode}&limit=${n}`,60,'t'+st+mode+n);return r===undefined?undefined:r?r.rows:null}
/* kurs z /trips: postoje z peronami i opóźnieniem na każdej stacji */
function kurs(key){const r=dane('/trips/'+encodeURIComponent(key),30,'k'+key);if(!r)return r;if(r._t)return r._t;
 const L=r.stops.length-1,num=krNum(r.number),l={...linia(r.route,r.agency,r.isBus),nazwa:nazwaP(r.number)};
 const st=r.stops.map((s,k)=>({n:s.station.name,t:mn(k===L?s.arrival||s.departure:s.departure||s.arrival),d:k===L?s.arrivalDelay:s.departureDelay,p:s.platform,tor:s.track,skip:s.skipped,prz:mn(s.arrival),odj:mn(s.departure),dp:s.arrivalDelay,dd:s.departureDelay,km:s.km}));
 return r._t={id:key,l,st,dep:st[0].t,arr:st[L].t,num,nums:numery(r.number),label:AGL(l.ag)+' '+num,raw:r.realtime?.delay||0,odw:r.realtime?.cancelled,km:r.distanceKm,vt:r.vehicleType,shape:r.shape||[],origin:r.origin,destination:r.destination,trimmed:r.trimmed,gps:r.position?.source==='gps'}}
/* komunikaty z serwisu w kształcie z makiety */
let KR,KC=[];
function KOM(){const r=dane('/notices',120);if(r!==KR){KR=r;const dz=s=>dzien(mn(s));
 KC=(r||[]).map(n=>({id:String(n.id),sev:{warning:'utr',danger:'pow'}[n.severity]||'info',tyt:esc(n.title),tr:esc(n.body),od:n.startsAt?dz(n.startsAt):-999,do:n.endsAt?dz(n.endsAt):null,lines:n.lines||[],st:(n.stations||[]).map(i=>SBI.get(i)).filter(Boolean),poc:(n.trains||[]).map(esc)}))}
 return KC}
const schLinia=id=>R.id==='wlkp'?SCH.LINES.find(l=>l.id===id)||SCH.PKM_LINES.find(l=>l.id===id):null;
// „77600” = pociąg przewoźnika regionu, „PR 85724” / „IC 1804” = partner
const pasuje=(p,ag,nums)=>{const m=/^(?:([A-ZŁ]+)\s*)?(\d+)/.exec(p);if(!m)return false;const pa=m[1]?(m[1]==='KMŁ'?'KML':m[1]):R.ag;return pa===ag&&nums.includes(m[2])};
/* ---------- Bus-Tramwaj-Kolej: prawdziwa taryfa z serwisu (ceny w groszach: normalny, ulga 49%, ulga 51%) ---------- */
const BTK={data:'1 września 2026',
 ulgi:['Normalny','Uczeń −49%','Student −51%'],
 ztm:{A:['Tylko Poznań','Autobusy i tramwaje w granicach Poznania.','Poznań'],'A+B':['Poznań i okolice','Także na przykład Luboń, Swarzędz, Suchy Las, Plewiska, Koziegłowy.','Poznań i okolice'],
  'A+C':['Poznań i dalsze gminy','Także na przykład Kórnik, Mosina, Tarnowo Podgórne, Dopiewo.','Poznań i dalsze gminy'],'A+B+C':['Wszystkie strefy','Wszystkie linie ZTM Poznań.','wszystkie strefy']},
 ceny:[{r:'B',p:{A:[27600,14076,13524],'A+B':[30200,15402,14798],'A+B+C':[35700,18207,17493]}},
  {r:'C',p:{A:[34800,17748,17052],'A+B':[38500,19635,18865],'A+C':[37900,19329,18571],'A+B+C':[42800,21828,20972]}},
  {r:'D',p:{A:[39100,19941,19159],'A+B':[42800,21828,20972]}},
  {r:'D',x:'czempin',p:{A:[46100,23511,22589],'A+B':[49800,25398,24402]}},
  {r:'E',p:{A:[42200,21522,20678],'A+B':[45900,23409,22491]}},
  {r:'F',p:{A:[44100,22491,21609],'A+B':[47800,24378,23422]}},
  {r:'F',x:'gniezno',p:{A:[51100,26061,25039],'A+B':[54800,27948,26852]}},
  {r:'G',p:{A:[47800,24378,23422],'A+B':[51500,26265,25235]}}],
 dod:{F:['gniezno','Dodaj autobusy MPK w Gnieźnie','MPK Gniezno','z MPK Gniezno'],D:['czempin','Dodaj autobusy gminy Czempiń','autobusy gminy Czempiń','z gminą Czempiń']},
 stacje:{A:['Poznań Główny','Poznań Antoninek','Poznań Dębiec','Poznań Dębina','Poznań Garbary','Poznań Górczyn','Poznań Junikowo','Poznań Karolin','Poznań Krzesiny','Poznań Podolany','Poznań Starołęka','Poznań Strzeszyn','Poznań Wola','Poznań Wschód','Kiekrz'],
  B:['Czerwonak','Czerwonak Osiedle','Gądki','Ligowiec','Luboń k. Poznania','Rokietnica','Swarzędz','Wiry','Złotkowo','Złotniki','Złotniki Grzybowe'],
  C:['Biskupice Wlkp.','Bolechowo','Buk','Chludowo','Dopiewo','Drużyna Poznańska','Golęczewo','Gułtowy','Iłowiec','Kobylnica','Kostrzyn Wlkp.','Kórnik','Łopuchowo','Łopuchowo Osiedle','Mosina','Murowana Goślina','Otusz','Owińska','Paczkowo','Palędzie','Pierzchno','Pobiedziska','Pobiedziska Letnisko','Promno','Przebędowo','Puszczykowo','Puszczykówko','Stęszew','Strykowo','Szreniawa','Trzebaw Rosnówko','Zielone Wzgórza'],
  D:['Baborówko','Bogdanowo','Czempiń','Fałkowo','Granowo','Kotowo','Lednogóra','Nekla','Oborniki Wlkp.','Oborniki Wlkp. Miasto','Oborzyska Stare','Opalenica','Pamiątkowo','Parkowo','Porażyn','Ptaszkowo Wlkp.','Roszkowo Wągrowieckie','Rożnowo','Skoki','Sława Wlkp.','Sulęcinek','Szamotuły','Środa Wlkp.','Wargowo','Wojnowice Wlkp.'],
  E:['Grąblewo','Grodzisk Wlkp.','Kościan','Pęckowo','Pierzyska','Podstolice','Przysieczyn','Przysieka Stara','Rogoźno Wlkp.','Sątopy','Solec Wlkp.','Stare Bojanowo','Tarnowo Rogozińskie'],
  F:['Chocicza','Chwalibogowo','Czerniejewo','Gębarzewo','Gniezno','Książno','Marzenin','Miłosław','Mokrz','Nowy Tomyśl','Obłaczkowo','Orzechowo','Wągrowiec','Wronki','Wronki Zamość','Września','Żydowo'],
  G:['Gutowo Wielkopolskie','Jankowo Dolne','Jarocin','Mieszków','Otoczna','Radlin','Słupca','Strzałkowo','Trzemeszno','Wólka','Żerków']},
 miejsc:{A:'Miasto Poznań z wyjątkiem przystanku Wielkie.',
  B:'Babki, Baranowo, Biedrusko, Bogucin, Borówiec, Bylin, Bytkowo, Cerekwica, Chyby, Czapury, Czerwonak, Dachowa, Dalekie, Daszewice, Gądki, Gowarzewo, Gruszczyn, Janikowo, Jaryszki, Jelonek, Kamionki, Kicin, Kiekrz, Kleszczewo, Kobylniki, Komorniki, Komorniki (gm. Kleszczewo), Koninko, Koziegłowy, Krzyszkowo, Luboń, Łęczyca, Mrowino, Nagradowice, Napachanie, Pawłowice, Plewiska, Poznań Wielkie, Przybroda, Przeźmierowo, Robakowo, Rogierówko, Rokietnica, Rostworowo, Skórzewo, Sobota, Starzyny, Suchy Las, Swadzim, Swarzędz, Szczytniki, Szewce, Świątniczki (gm. Kórnik), Tanibórz, Trzek, Tulce, Wiórek, Wiry, Wysogotowo, Zalasewo, Złotkowo, Złotniki, Żerniki, Żydowo.',
  C:'Annowo, Batorowo, Biernatki, Błażejewko, Błażejewo, Bolechowo, Bolechowo-Osiedle, Bolechówko, Brzezno, Bytyń, Ceradz Dolny, Ceradz Kościelny, Chludowo, Chomęcice, Dąbrowa, Dąbrówka, Dębogóra, Dopiewiec, Dopiewo, Dziećmierowo, Gaj Wielki, Głuchowo, Golęczewo, Gołuski, Góra, Grzebienisko, Jankowice, Karłowice, Kaźmierz, Kliny, Kokoszczyn, Konarzewo, Kórnik, Lisówki, Lusowo, Lusówko, Mielno, Miękowo, Młodasko, Mosina, Murowana Goślina, Otowo, Owińska, Palędzie, Piersko, Potasze, Pólko, Promnice, Prusinowo, Przebędowo, Przecław, Puszczykowo, Rosnowo, Rosnówko, Rumianek, Sady, Sierosław, Skrzynki, Szczodrzykowo, Szlachęcin, Szreniawa, Tarnowo Podgórne, Trzaskowo, Tuczno, Walerianowo, Wierzonka, Witkowice, Zakrzewo, Zielątkowo.'},
 zasady:['Bilet kupisz najwcześniej 30 dni przed pierwszym dniem ważności.','Jeśli jedziesz dalej niż strefa biletu, dokup bilet od ostatniej stacji w strefie i zgłoś to obsłudze pociągu przed tą stacją.','Niewykorzystany bilet oddasz w kasie przed pierwszym dniem ważności, z potrąceniem 20%.','Biletu nie można wymienić ani przedłużyć. Za zgubiony bilet nie ma zwrotu ani duplikatu.','Za odwołane pociągi i zmiany w komunikacji nie ma częściowego zwrotu.','Za rower, psa i bagaż płacisz osobno.','Jeśli masz bilet ulgowy, miej przy sobie legitymację.','Autobusy MPK w Gnieźnie dołączysz tylko do biletu na strefę F, a autobusy gminy Czempiń tylko do biletu na strefę D.'],
 zrodla:[['Koleje Wielkopolskie','https://koleje-wielkopolskie.com.pl/dla-pasazera/oferty-specjalne/bus-tramwaj-kolej/'],['POLREGIO','https://polregio.pl/pl/oferty-i-promocje/oferty-regionalne/bus-tramwaj-kolej/'],['Cennik ZTM','https://www.ztm.poznan.pl/pl/cennik/']]};
const zl=g=>(g/100).toFixed(2).replace('.',',')+' zł';
const bKey=n=>norm(n).replace(/\bwielkopolsk(i|a|ie)\b/g,'wlkp').replace(/\bwlkp\.?/g,'wlkp').replace(/k\/\s*|\bkolo\s+|\bk\.\s*/g,'k ').replace(/[^a-z0-9]+/g,' ').trim();
const BTK_ALL=Object.entries(BTK.stacje).flatMap(([z,l])=>l.map(n=>({n,z}))).sort((a,b)=>a.n.localeCompare(b.n,'pl'));
const BTK_BY=new Map(BTK_ALL.map(s=>[bKey(s.n),s]));
function btkSt(name){const k=bKey(name||'');if(!k)return null;return BTK_BY.get(k)||(k.startsWith('poznan ')?{n:name,z:'A'}:null)}
const btkSzukaj=v=>{const q=bKey(v);return q?btkSt(v)||BTK_ALL.find(s=>bKey(s.n).startsWith(q))||BTK_ALL.find(s=>bKey(s.n).includes(q))||null:null};
const bWiersz=(r,x)=>BTK.ceny.find(c=>c.r===r&&(c.x||null)===(x||null));
const bCena=(r,z,u,x)=>bWiersz(r,x)?.p[z]?.[u]??null;
function btkPodp(stacje){ // podpowiedź biletu miesięcznego: tylko Wielkopolska, wszystkie stacje w ofercie, najdalsza poza Poznaniem
 if(R.id!=='wlkp')return'';const f=stacje.map(btkSt);if(f.some(s=>!s))return'';
 const s=f.reduce((a,b)=>b.z>a.z?b:a),c=bCena(s.z,'A',0);if(c==null)return'';
 return `<button class="kpas" data-a="btk" data-s="${s.n}"><span class="kzn info m" aria-hidden="true">${s.z}</span><b>Bilet miesięczny Bus-Tramwaj-Kolej od ${zl(c)}</b></button>`}

/* ---------- bilet jednorazowy: cenniki przewoźników ----------
   Wygenerowane z PDF-ów przewoźników (ulgi sprawdzone z procentami co do grosza); przy zmianie cennika podmienić tabele i daty.
   KW: „Cennik biletów jednorazowych od 15-12-2024” (koleje-wielkopolskie.com.pl/dla-pasazera/pociag/ceny-biletow/) — „Taryfa Razem” to bilety grupowe, nie ta.
   Wiersz: [górna granica km, normalny, ulga 33%, 37%, 49%, 51%, 78%, 93%, 95%] w groszach.
   KW han: ulgi handlowe na bilety jednorazowe [km, 25%, 50%] z „Cennika biletów jednorazowych z ulgami handlowymi od 15-12-2024”. */
const CENY={
 KW:{opis:'cennik KW od 15.12.2024',han:[[5,457,305],[10,502,335],[15,592,395],[20,735,490],[25,885,590],[30,952,635],[35,1102,735],[40,1215,810],[47,1365,910],[53,1537,1025],[59,1650,1100],[67,1725,1150],[73,1792,1195],[80,1942,1295],[90,2092,1395],[100,2227,1485],[120,2527,1685],[140,2707,1805],[160,2902,1935],[180,3037,2025],[200,3165,2110],[240,3315,2210],[280,3472,2315],[320,3615,2410],[360,3682,2455],[400,3825,2550],[500,3990,2660],[600,4177,2785],[700,4357,2905],[800,4590,3060]],pasma:[[5,610,409,384,311,299,134,43,30],[10,670,449,422,342,328,147,47,33],[15,790,529,498,403,387,174,55,39],[20,980,657,617,500,480,216,69,49],[25,1180,791,743,602,578,260,83,59],[30,1270,851,800,648,622,279,89,63],[35,1470,985,926,750,720,323,103,73],[40,1620,1085,1021,826,794,356,113,81],[47,1820,1219,1147,928,892,400,127,91],[53,2050,1373,1291,1045,1004,451,143,102],[59,2200,1474,1386,1122,1078,484,154,110],[67,2300,1541,1449,1173,1127,506,161,115],[73,2390,1601,1506,1219,1171,526,167,119],[80,2590,1735,1632,1321,1269,570,181,129],[90,2790,1869,1758,1423,1367,614,195,139],[100,2970,1990,1871,1515,1455,653,208,148],[120,3370,2258,2123,1719,1651,741,236,168],[140,3610,2419,2274,1841,1769,794,253,180],[160,3870,2593,2438,1974,1896,851,271,193],[180,4050,2713,2551,2065,1984,891,283,202],[200,4220,2827,2659,2152,2068,928,295,211],[240,4420,2961,2785,2254,2166,972,309,221],[280,4630,3102,2917,2361,2269,1019,324,231],[320,4820,3229,3037,2458,2362,1060,337,241],[360,4910,3290,3093,2504,2406,1080,344,245],[400,5100,3417,3213,2601,2499,1122,357,255],[500,5320,3564,3352,2713,2607,1170,372,266],[600,5570,3732,3509,2841,2729,1225,390,278],[700,5810,3893,3660,2963,2847,1278,407,290],[800,6120,4100,3856,3121,2999,1346,428,306]]},};
// ulgi: ustawowe z „Tabel uprawnień do ulgowych lub bezpłatnych przejazdów na podstawie ustaw” (strona KW, bilety jednorazowe, 2. klasa),
// handlowe KW z ofert specjalnych KW (Bilet 60+ — 25%, ulga 50% dla sfery budżetowej); handlowe tylko w pociągach KW
const ULGI=[
 {id:'n',pct:0,gr:'n',kto:'Bilet normalny'},
 {id:'u100',pct:100,gr:'d',kto:'Dzieci do 4 lat'},
 {id:'u37d',pct:37,gr:'d',kto:'Dzieci od 4 lat do rozpoczęcia rocznego przygotowania przedszkolnego'},
 {id:'u37u',pct:37,gr:'d',kto:'Uczniowie, do ukończenia 24 lat'},
 {id:'u51s',pct:51,gr:'s',kto:'Studenci do 26 lat i doktoranci do 35 lat'},
 {id:'u33',pct:33,gr:'s',kto:'Nauczyciele i nauczyciele akademiccy'},
 {id:'h25',pct:25,gr:'e',h:1,kto:'Bilet 60+ — osoby, które ukończyły 60 lat'},
 {id:'u37e',pct:37,gr:'e',kto:'Emeryci i renciści oraz ich współmałżonkowie na utrzymaniu — 2 przejazdy w roku'},
 {id:'u37k',pct:37,gr:'r',kto:'Rodzice i małżonkowie rodziców z Kartą Dużej Rodziny'},
 {id:'u49',pct:49,gr:'z',kto:'Osoby niezdolne do samodzielnej egzystencji'},
 {id:'u37n',pct:37,gr:'z',kto:'Osoby niewidome całkowicie niezdolne do pracy'},
 {id:'u93',pct:93,gr:'z',kto:'Osoby niewidome niezdolne do samodzielnej egzystencji'},
 {id:'u78d',pct:78,gr:'z',kto:'Dzieci i młodzież z niepełnosprawnością w drodze do szkoły lub placówki oraz ich rodzic lub opiekun'},
 {id:'u95',pct:95,gr:'z',kto:'Opiekun osoby niezdolnej do samodzielnej egzystencji, przewodnik osoby niewidomej'},
 {id:'h50',pct:50,gr:'w',h:1,kto:'Pracownicy jednostek sfery budżetowej i żołnierze zawodowi'},
 {id:'u78w',pct:78,gr:'w',kto:'Żołnierze odbywający niezawodową służbę wojskową'},
 {id:'u51k',pct:51,gr:'w',kto:'Kombatanci, działacze opozycji antykomunistycznej i osoby represjonowane z powodów politycznych'},
 {id:'u78i',pct:78,gr:'w',kto:'Inwalidzi wojenni i wojskowi I grupy oraz kombatanci będący takimi inwalidami'},
 {id:'u37i',pct:37,gr:'w',kto:'Inwalidzi wojenni i wojskowi II i III grupy oraz kombatanci będący takimi inwalidami'},
 {id:'u37p',pct:37,gr:'i',kto:'Posiadacze Karty Polaka'}];
const GRUPY_ULG=[['n','Bez ulgi'],['d','Dzieci i uczniowie'],['s','Studenci i nauczyciele'],['e','Seniorzy, emeryci i renciści'],['r','Rodziny'],
 ['z','Osoby z niepełnosprawnością i opiekunowie'],['w','Praca w sferze budżetowej, wojsko i kombatanci'],['i','Inne']];
const KOL_ULGI={0:0,33:1,37:2,49:3,51:4,78:5,93:6,95:7};
const ulgaW=()=>ULGI.find(u=>u.id===S.ulga)||ULGI[0];
// cena biletu (grosze) z wybraną ulgą; null — brak w cenniku
function cenaU(b,u){const p=cena(b.km,b.a,b.b);if(!p)return null;if(u.pct===100)return 0;
 if(u.h){const r=CENY[R.ag]?.han?.find(r=>b.km<=r[0]);return r?r[u.pct===25?1:2]:null}
 return p[KOL_ULGI[u.pct]]}
function cena(km,a,b){const T=CENY[R.ag];if(!T||!km)return null; // cena w groszach w kolejności kolumn z cennika
 const r=T.pasma.find(r=>km<=r[0]);return r?r.slice(1):null}
// bilety na połączenie: cena tylko dla pociągów przewoźnika regionu (KW); kolejne takie odcinki to jeden bilet, POLREGIO i Intercity bez ceny
function bilety(c){const o=[];for(const x of c.legs){const ag=x.t.l.ag,own=ag===R.ag,l=o.at(-1);
  if(l&&l.ag===ag&&(own||ag!=='PR'||l.kwT===(x.t.kwT!==false)))l.legs.push(x);else o.push({own,ag,kwT:x.t.kwT!==false,legs:[x]})}
 return o.map(g=>({...g,a:g.legs[0].t.st[0].n,b:g.legs.at(-1).t.st.at(-1).n,km:g.legs.every(x=>x.t.km)?g.legs.reduce((s,x)=>s+x.t.km,0):null}))}
// cena na karcie połączenia: tylko gdy całe połączenie jest na jeden bilet przewoźnika regionu
function cenaPol(c){const b=bilety(c);if(b.length!==1||!b[0].own)return'';const p=cenaU(b[0],ulgaW());return p!=null?zl(p):''}
function biletHtml(c){const bs=bilety(c),T=CENY[R.ag],u=ulgaW(),own=bs.filter(b=>b.own),inne=bs.filter(b=>!b.own),opis=bs.length>1;
 const suma=v=>{let s=0;for(const b of own){const p=cenaU(b,v);if(p==null)return null;s+=p}return s};
 const karty=own.map(b=>{const p=cenaU(b,u);
  return `<div class="wiersz rozsun" style="align-items:flex-end;gap:12px"><div style="min-width:0"><span class="dr maly">Bilet jednorazowy ${AGL(R.ag)}${opis?' · '+bkrotko(b.a)+' – '+bkrotko(b.b):''}</span><p class="wielkie num" style="font-size:30px;margin-top:2px">${p!=null?zl(p):'—'}</p></div><span class="dr maly" style="text-align:right">${b.km?b.km+' km':''}</span></div>`}).join('');
 // lista rozwijana ulg: każda opcja z ceną tego przejazdu
 const opcja=v=>{const s=suma(v);return `<button role="option" aria-selected="${v===u}" data-a="ulga" data-k="${v.id}"><span class="pr">${v.pct?v.pct+'%':'—'}</span><span>${v.kto}${v.h?' <small class="tag">oferta KW</small>':''}</span><b class="num">${s!=null?zl(s):''}</b></button>`};
 const grupa=(t,l)=>l.length?`<p class="et">${t}</p>${l.map(opcja).join('')}`:'';
 const lista=own.length?`<div class="ulgi"><button class="ulga-wybor" data-a="ulgi" aria-expanded="${!!S.ulgiOtw}"><span><small>Ulga</small><b>${u.pct?u.pct+'% · ':''}${u.kto}</b></span>${ic(S.ulgiOtw?'gora':'dol',18)}</button>
  ${S.ulgiOtw?`<div class="ulgi-lista" role="listbox" aria-label="Ulgi">${GRUPY_ULG.map(([k,t])=>grupa(t,ULGI.filter(v=>v.gr===k))).join('')}</div>`:''}</div>`:'';
 const obce=inne.map(b=>b.ag==='PR'&&b.kwT?`<p style="font-size:14px"><b>Pociąg obsługiwany przez POLREGIO.</b> Na odcinkach wspólnych z ${R.id==='mal'?'Kolejami Małopolskimi':'Kolejami Wielkopolskimi'} obowiązuje wspólne honorowanie biletów.</p>`:b.ag==='IC'?'<p style="font-size:14px"><b>Pociąg obsługiwany przez PKP Intercity.</b> Bilety przewoźników regionalnych nie są w nim honorowane. Pamiętaj, żeby kupić osobny bilet!</p>':`<p style="font-size:14px"><b>Bilet POLREGIO</b> na odcinek ${bkrotko(b.a)} – ${bkrotko(b.b)}. Bilet ${R.kto} nie jest ważny na tym odcinku.</p>`).join('');
 if(!T)return `<section class="plyta kol" style="gap:8px">${own.length?`<b>Bilet ${R.kto}</b><p class="dr" style="font-size:14px">Kupisz go w kasie, w automacie albo u konduktora.</p>`:''}${obce}</section>`;
 return `<section class="plyta kol" style="gap:12px">${own.length?`<h3 style="font-size:17px;font-weight:700">Jaką kwotę zapłacisz za przejazd${inne.length?(own.length>1?' w pociągach ':' w pociągu ')+AGL(R.ag):''}?<sup class="przypis">*</sup></h3>`:''}${karty}${lista}${obce}
  ${own.length&&T?`<p class="dr maly"><sup class="przypis">*</sup> Cena jest sugerowana. Pochodzi ona z oficjalnego cennika ${R.kto}. Bilety zakupisz wygodnie w aplikacjach mobilnych, w kasie biletowej oraz u obsługi pociągu.</p>`:''}</section>`}
/* ---------- stan ---------- */
const S={from:'',to:'',when:null,day:0,kier:'odj',bezp:false,minT:5,bez:[],start:0,sel:null,selDay:0,station:'',tryb:'dep',
 routes:[],trips:[],walk:8,theme:'system',przyklad:true,region:'wlkp',font:'Inter',btk:{st:'Gniezno',ztm:'A',ulga:0,extra:false,tab:0,open:null},sch:{set:'reg',linia:null,stacja:null}};
const FONTS=['Inter','Instrument Sans','IBM Plex Sans','Nunito Sans','Rubik','Figtree','Plus Jakarta Sans','Onest'];
const czyt=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
Object.assign(S,czyt('zw3-tarcza-ust')||{});
if(!REG[S.region])S.region='wlkp'; if(!FONTS.includes(S.font))S.font='Inter';
function region(id){S.region=id;R=REG[id];R.id=id;LINES=R.lines;POS=R.pos;WAZNE=R.wazne; // trasy i podróże osobno dla każdego regionu
 const z=czyt('zw3-tarcza@'+id)||{routes:[{a:R.hub,b:R.cel}],trips:[],przyklad:true};
 Object.assign(S,z,{from:R.hub,to:R.cel,station:R.hub,when:null,day:0,kier:'odj',sel:null,selDay:0,mapSel:null,bezp:false,minT:5,bez:[],sch:{set:'reg',linia:null,stacja:null}});
 document.documentElement.dataset.region=id;zamknijListe();mapaStop()}
const pismo=()=>document.documentElement.style.setProperty('--f',`'${S.font}',system-ui,-apple-system,'Segoe UI',sans-serif`);
const save=()=>{try{localStorage.setItem('zw3-tarcza-ust',JSON.stringify({walk:S.walk,theme:S.theme,region:S.region,font:S.font,ulga:S.ulga}));localStorage.setItem('zw3-tarcza@'+S.region,JSON.stringify({routes:S.routes,trips:S.trips,przyklad:S.przyklad}))}catch(e){}};
async function zmienRegion(id){if(id===S.region)return;save();region(id);try{await wczytajStacje()}catch(e){toast('Nie udało się wczytać listy stacji.');return}save();ark('');$('#detal').classList.remove('otwarty');formularz();szukaj();route();toast('Wybrany region: '+R.nazwa+'.')}
let toastT;function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,2800)}

/* ---------- klocki ---------- */
const lin=l=>`<span class="lin" style="--c:${l.color}">${l.badge}</span>`;
const zaIle=m=>m<=0?'teraz':'za '+dur(m);
const wKole=m=>m>0&&m<=60; // minuty pokazuje koło, więc zdanie obok ich nie powtarza
const tarcza=m=>wKole(m)?`<div class="tarcza" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="tor" cx="20" cy="20" r="17"/><circle class="luk" cx="20" cy="20" r="17" stroke-dasharray="${(106.8*m/60).toFixed(1)} 106.8"/></svg><span>${m}<small>min</small></span></div>`:'';
/* komunikaty */
const RODZ={info:'informacja',utr:'utrudnienie',pow:'poważne utrudnienie'},waga=n=>({pow:0,utr:1,info:2})[n.sev];
const cap=s=>s[0].toUpperCase()+s.slice(1);
const dM=o=>{const d=dzienD(o);return d.getDate()+' '+MIES[d.getMonth()]};
function okres(n){if(n.od<-900)return n.do==null?'do odwołania':'do '+dM(n.do);if(n.do==null)return'od '+dM(n.od)+' do odwołania';if(n.od===n.do)return dM(n.od);
 const a=dzienD(n.od),b=dzienD(n.do);return a.getMonth()===b.getMonth()?a.getDate()+'–'+dM(n.do):dM(n.od)+' – '+dM(n.do)}
const trwa=(n,day=0)=>n.od<=day&&(n.do==null||n.do>=day);
const kStan=n=>trwa(n)?'trwa':n.od===1?'od jutra':'od '+dM(n.od);
const kzn=(n,m)=>`<span class="kzn ${n.sev}${m?' m':''}" aria-hidden="true">${n.sev==='info'?'i':'!'}</span>`;
function oOdcinku(n,t,i,j){ // czy komunikat dotyczy pociągu t między postojami i–j
 if(n.poc.some(p=>pasuje(p,t.l.ag,t.nums)))return true;
 if(t.l.ag!==R.ag)return false; // stacje i linie komunikatu dotyczą tylko pociągów przewoźnika regionu
 const sts=t.st.slice(i,j+1).map(s=>s.n);
 if(n.lines.some(id=>{const l=schLinia(id);return l&&sts.filter(s=>l.stations.includes(s)).length>=2}))return true;
 return n.st.includes(t.st[i].n)||n.st.includes(t.st[j].n)}
const oPolaczeniu=(c,day=0)=>KOM().filter(n=>trwa(n,day)&&c.legs.some(g=>oOdcinku(n,g.t,g.i,g.j))).sort((a,b)=>waga(a)-waga(b));
const oStacji=s=>KOM().filter(n=>trwa(n)&&(n.st.includes(s)||n.lines.some(id=>schLinia(id)?.stations.includes(s)))).sort((a,b)=>waga(a)-waga(b));
const kpas=n=>`<button class="kpas" data-a="kom" data-id="${n.id}">${kzn(n,1)}<b>${n.tyt}</b></button>`;
const agencje=()=>[[R.ag,R.agN],['PR','POLREGIO'],['IC','PKP Intercity']];
const ileOpcji=()=>(S.bezp?1:0)+(!S.bezp&&S.minT!==5?1:0)+S.bez.length;
function stan(c,day){ // „za 12 min” i opóźnienie zawsze słowami
 if(day)return'';const d=cDelay(c),m=doOdj(c);if(m<0)return'<span class="znak neutr">odjechał</span>';
 return `<span class="znak ${d?'op':m<=60?'ok':'neutr'}">${zaIle(m)}${d?' · +'+d+' min':''}</span>`}
function wyjscie(c,day){ // najważniejsza informacja: o której wyjść z domu albo o której odjeżdża pociąg
 const d=cDelay(c),odj=c.dep+d,o=doOdj(c);
 if(day)return{gl:'Odjazd o '+hm(odj),sub:etykDnia(day)+', '+pelnaData(day)};
 if(o<0)return{gl:'Pociąg odjechał o '+hm(odj),sub:'Wybierz późniejsze połączenie.'};
 if(S.walk>0){const m=o-S.walk;
  return m>0?{m,gl:'Wyjdź z domu o '+hm(odj-S.walk),sub:(wKole(m)?'Pociąg':zaIle(m)+' · pociąg')+' odjeżdża o '+hm(odj)}:{gl:'Wyjdź z domu teraz',sub:'Pociąg odjeżdża o '+hm(odj)+', '+zaIle(o)+'.'}}
 return{m:o,gl:'Odjazd o '+hm(odj),sub:wKole(o)?'':zaIle(o)}}
const godziny=(c,day)=>{const d=cDelay(c);return `<span class="godz">${d?`<s>${hm(c.dep)}</s>`:''}<span>${hm(c.dep+d)}</span><em>→</em><span>${hm(cArr(c))}</span></span>`};
function polKarta(c,sel,day=0){const x=c.legs[0],pr=peron(x.t,x.i);
 const ile=c.legs.length===1?'bez przesiadek':c.legs.length===2?'1 przesiadka ('+bkrotko(c.legs[0].t.st[c.legs[0].j].n)+')':pl(c.legs.length-1,'przesiadka','przesiadki','przesiadek');
 const icl=c.legs.some(l=>l.t.l.ag==='IC'),km=oPolaczeniu(c,day).filter(n=>n.sev!=='info');
 return `<button class="pol" data-a="sel" data-k="${cKey(c)}" data-d="${day}" aria-current="${sel}">
 <span class="g">${godziny(c,day)}${stan(c,day)}</span>
 <span class="meta">${c.legs.map(l=>lin(l.t.l)).join('')}<span>${dur(c.arr-c.dep)}</span><span>${ile}</span>${cenaPol(c)?`<span>${cenaPol(c)}</span>`:''}${pr.p?`<span>peron ${pr.p}</span>`:''}${icl?'<span>osobny bilet</span>':''}</span>
 ${km.length?`<span class="kpas">${kzn(km[0],1)}<b>${km[0].tyt}</b>${km.length>1?`<em>i ${pl(km.length-1,'kolejny','kolejne','kolejnych')}</em>`:''}</span>`:''}</button>`}
const kropka=s=>/\.$/.test(s)?s:s+'.'; // „Ostrów Wlkp.” bez drugiej kropki
function odcinekKursu(g){const k=kurs(g.t.id);if(!k)return null;const A=g.t.st[0].n,B=g.t.st.at(-1).n,i=k.st.findIndex(s=>s.n===A),j=k.st.findIndex((s,x)=>x>i&&s.n===B);return i<0||j<0?null:{k,i,j}}
// wiersz postoju kursu k (x — indeks postoju; i, j — pierwsza i ostatnia pokazana stacja): przyjazd i odjazd,
// peron i tor, postój, km od pierwszej pokazanej stacji; dodatek — np. plakietka „następna”
function wierszPostoju(k,x,{i=0,j=k.st.length-1,km0=k.st[i].km,cls='',c,dodatek=''}){const s=k.st[x],first=x===i,last=x===j,nw=now(),dw=!first&&!last&&s.prz!=null&&s.odj!=null?s.odj-s.prz:0;
 const T=(m,d)=>m==null?'':d?`<span class="op">${hm(m+d)}</span><s>${hm(m)}</s>`:hm(m);
 const czas=first?T(s.odj,s.dd):last?T(s.prz,s.dp):dw>0?`<small>${T(s.prz,s.dp)}</small>${T(s.odj,s.dd)}`:T(s.odj??s.prz,s.dd??s.dp);
 const tm=last?s.prz+(s.dp||0):(s.odj??s.prz)+(s.dd||0);
 const pod=[s.skip?'pociąg się tu nie zatrzyma':'',s.p?'peron '+s.p+(s.tor?' · tor '+s.tor:''):'',dw>=2?'postój '+dw+' min':''].filter(Boolean).join(' · ');
 const km=!first&&s.km!=null&&km0!=null?Math.round(s.km-km0):null;
 return `<div class="os pos ${cls} ${tm<nw?'byl':''}" style="--c:${c}"><time>${czas}</time><div class="sz"><i></i></div><div class="n"><span><span class="nz-w"><b class="nz">${krotko(s.n)}</b>${dodatek}</span>${pod?`<small>${pod}</small>`:''}</span>${km!=null?`<em>${km} km</em>`:''}</div></div>`}
function postoje(g,day=0){const o=odcinekKursu(g);if(!o)return osKursu(g.t,g.i,g.j,true,day); // przed wczytaniem kursu — dane z wyszukiwarki
 const{k,i,j}=o,km0=k.st[i].km,c=g.t.l.color;
 const row=(x,cls)=>wierszPostoju(k,x,{i,j,km0,cls,c});
 let h=row(i,'gl p');const sr=[];for(let x=i+1;x<j;x++)sr.push(row(x,''));
 if(sr.length){const otw=S.rozw?.has(g.t.id);h+=`<div class="os" style="--c:${c}"><span></span><div class="sz"></div><button class="chip" style="justify-self:start;height:36px" data-a="rozwin" data-k="${g.t.id}" aria-expanded="${!!otw}">${pl(sr.length,'przystanek','przystanki','przystanków')} po drodze ${ic(otw?'gora':'dol',14)}</button></div><div ${otw?'':'hidden'}>${sr.join('')}</div>`}
 return h+row(j,'gl k')}
function osKursu(t,i,j,zwin,day=0){const nw=now(),d=delay(t),c=t.l.color;let h='';
 const row=(k,cls)=>{const s=t.st[k],pr=peron(t,k),tm=s.t+(s.d??d),byl=tm<nw;
  return `<div class="os ${cls} ${byl?'byl':''}" style="--c:${c}"><time>${hm(tm)}</time><div class="sz"><i></i></div><div class="n"><span>${krotko(s.n)}</span>${cls.includes('gl')&&pr.p?`<small>peron ${pr.p}${pr.tor?' · tor '+pr.tor:''}</small>`:''}</div></div>`};
 h+=row(i,'gl p');
 const sr=[];for(let k=i+1;k<j;k++)sr.push(row(k,''));
 if(sr.length&&zwin)h+=`<div class="os" style="--c:${c}"><span></span><div class="sz"></div><button class="chip" style="justify-self:start;height:36px" data-a="rozwin" aria-expanded="false">${pl(sr.length,'przystanek','przystanki','przystanków')} po drodze ${ic('dol',14)}</button></div><div hidden>${sr.join('')}</div>`;
 else h+=sr.join('');
 return h+row(j,'gl k')}

/* ---------- widoki ---------- */
function rWyjazd(){const el=$('#wyjazd'),r=S.routes[0];if(!r){el.innerHTML='';return}
 const opt=bez=>({min:Math.floor(now()/5)*5,n:6,o:{bezp:S.bezp,minT:S.minT,bez}}),pierwsze=l=>l&&l.find(c=>doOdj(c)-S.walk>-1);
 const reg=polaczenia(r.a,r.b,opt([...new Set([...S.bez,'IC'])]),'w'+r.a+'>'+r.b),wsz=reg&&!pierwsze(reg)?polaczenia(r.a,r.b,opt(S.bez),'wa'+r.a+'>'+r.b):null;
 const c=pierwsze(reg)||pierwsze(wsz),cs=reg===undefined||wsz===undefined?undefined:wsz||reg;
 if(!c){el.innerHTML=`<div class="blok"><p class="dr maly" style="font-weight:600">Twoja trasa: ${bkrotko(r.a)} → ${bkrotko(r.b)}</p><p style="margin-top:6px;font-weight:600">${cs===undefined?'Sprawdzamy najbliższe połączenie…':cs===null?'Nie udało się pobrać połączeń.':'Nie ma najbliższych połączeń na tej trasie.'}</p></div>`;return}
 const w=wyjscie(c,dzien(c.dep)),d=cDelay(c),x=c.legs[0],pr=peron(x.t,x.i);anim(el,c.k);
 el.innerHTML=`<div class="blok kol wyj" style="gap:6px" data-a="sel" data-k="${cKey(c)}" data-d="${dzien(c.dep)}" role="button" tabindex="0" aria-label="Szczegóły najbliższego połączenia"><p class="dr maly wiersz rozsun" style="font-weight:600"><span>Twoja trasa: ${bkrotko(r.a)} → ${bkrotko(r.b)}</span><span class="wyj-strz" aria-hidden="true">${ic('strz',16)}</span></p>
  <div class="wiersz" style="gap:16px">${tarcza(w.m)}<div style="min-width:0"><p class="wielkie num">${w.gl}</p><p>${w.sub}</p></div></div>
  <p class="dr maly">${x.t.l.badge}${pr.p?' · peron '+pr.p:''}${c.legs.some(g=>g.t.l.ag==='IC')?' · osobny bilet':''} · ${d?'opóźnienie '+d+' min':'na czas'}${S.walk?' · dojście na stację '+S.walk+' min':''}</p>
  ${oPolaczeniu(c).filter(n=>n.sev!=='info').map(kpas).join('')}
  <div class="wiersz wyj-akcje" style="margin-top:8px;gap:8px"><button class="drugi" data-a="sel" data-k="${cKey(c)}" data-d="${dzien(c.dep)}">Szczegóły</button><button class="drugi" data-a="trasa-szukaj" data-i="0">Inne godziny</button></div></div>`}
function szukaj(){S.q={min:(S.when??now())+S.day*1440,arrive:S.kier==='prz'};S.selAuto=true;rWyniki()}
const wyniki=()=>polaczenia(S.from,S.to,{min:S.q.min,arrive:S.q.arrive,o:S});
function rWyniki(){const el=$('#wyniki');
 const obs=S.routes.some(r=>(r.a===S.from&&r.b===S.to)||(r.a===S.to&&r.b===S.from));
 if(S.from===S.to){el.innerHTML='<div class="plyta pusto">Wybierz dwie różne stacje.</div>';S.sel=null;rDetal();return}
 const res=wyniki();
 if(res===undefined){el.innerHTML='<div class="plyta pusto">Szukamy połączeń…</div>';rDetal();return}
 if(!res?.length){el.innerHTML=`<div class="plyta pusto">${res===null?'Nie udało się pobrać połączeń. Spróbuj ponownie za chwilę.':`Nie znaleźliśmy połączeń. ${ileOpcji()?'Zmień opcje wyszukiwania i wyszukaj ponownie.':'Zmień stacje albo godzinę i wyszukaj ponownie.'}`}</div>`;S.sel=null;rDetal();return}
 if(S.selAuto){S.selAuto=false;S.sel=res[0].k;S.selDay=dzien(res[0].dep)}
 anim(el,S.from+S.to+S.q.min+S.q.arrive);
 el.innerHTML=`<div class="wiersz rozsun zawin" style="padding:8px 4px 0;gap:0 12px"><div><h2>Połączenia</h2><p class="dr maly num">${pelnaData(dzien(res[0].dep))} · odjazdy ${hm(res[0].dep)}–${hm(res.at(-1).dep)}</p></div>
  <button class="tekstowy" data-a="obserwuj-trase">${ic('moje',16)}${obs?'Obserwujesz trasę':'Obserwuj trasę'}</button></div>
  ${res.map(c=>polKarta(c,c.k===S.sel,dzien(c.dep))).join('')}
  <div class="strony na-papierze"><button class="drugi" data-a="wczesniej">Wcześniejsze</button><button class="drugi" data-a="pozniej">Późniejsze</button></div>${btkPodp([S.from,S.to])}`;
 rDetal()}
function rDetal(){const el=$('#detal'),c=S.sel&&cFromKey(S.sel),day=S.selDay;
 if(!c){el.innerHTML='';el.classList.remove('otwarty');return}
 anim(el,S.sel);
 const w=wyjscie(c,day),d=cDelay(c,day),x=c.legs[0],pr=peron(x.t,x.i),zap=S.trips.some(t=>t.k===S.sel&&t.dz===iso(day));
 let osie='';c.legs.forEach((g,n)=>{
  if(n){const p=c.legs[n-1];osie+=`<div class="przes">${ic('pieszo',18)}Przesiadka na stacji ${krotko(g.t.st[g.i].n)} · ${g.dep-p.arr} min</div>`}
  const kr=kurs(g.t.id); // relacja całego pociągu, gdy kurs już wczytany
  osie+=`<section class="plyta kol" style="gap:10px"><div class="kol" style="gap:2px;padding:0 2px"><div class="wiersz zawin" style="gap:4px 10px"><span class="lin" style="--c:${g.t.l.color}"></span><button class="tekstowy" style="height:28px;color:var(--tusz);font-size:17px;font-weight:700;padding:0" data-a="poc" data-id="${g.t.id}">${g.t.label}</button></div>${g.t.l.nazwa?`<span class="nazwa-p">„${esc(g.t.l.nazwa)}”</span>`:''}
   <span class="dr maly">Przewoźnik: ${g.t.l.kto}.${g.t.l.linia?' Linia '+g.t.l.linia+'.':''} ${kropka(kr?`Pociąg relacji: ${krotko(esc(kr.origin))} – ${krotko(esc(kr.destination))}`:`Kierunek: ${krotko(esc(g.t.kier))}`)}</span></div><div>${postoje(g,day)}</div></section>`});
 el.innerHTML=`<div class="kol" style="gap:10px">
  <div class="detal-gl"><button class="kolo wroc" data-a="detal-zamknij" aria-label="Wróć do listy połączeń">${ic('wroc')}</button><b>${bkrotko(cFrom(c))} → ${bkrotko(cTo(c))}</b><button class="kolo" data-a="udostepnij" aria-label="Udostępnij">${ic('udost')}</button></div>
  <section class="blok kol" style="gap:6px">${desk()?`<p class="wielkie num">${hm(c.dep+d)} → ${hm(cArr(c))}</p><p>${day?w.sub:w.gl+(doOdj(c)>=0?', pociąg odjeżdża '+zaIle(doOdj(c)):'')}</p>`:`<div class="wiersz" style="gap:16px">${tarcza(w.m)}<div style="min-width:0"><p class="wielkie num">${w.gl}</p><p>${w.sub}</p></div></div>`}
   <p class="dr maly">${day?'Opóźnienia pokażemy w dniu podróży.':d?'Opóźnienie '+d+' min':'Na czas'}${desk()?'':' · przyjazd o '+hm(cArr(c))}</p>
   <div class="kafle" style="margin-top:8px">${pr.p?`<div class="kafel"><span>peron</span><b>${pr.p}</b></div>`:''}${pr.tor?`<div class="kafel"><span>tor</span><b>${pr.tor}</b></div>`:''}<div class="kafel"><span>czas jazdy</span><b>${dur(c.arr-c.dep)}</b></div>${c.km?`<div class="kafel"><span>odległość</span><b>${c.kmP?'ok. ':''}${c.km} km</b></div>`:''}</div></section>
  ${oPolaczeniu(c,day).map(kpas).join('')}
  ${osie}
  ${biletHtml(c)}
  <div class="strony"><button class="drugi" data-a="mock" data-t="W gotowej wersji pobierzesz tu plik do kalendarza.">${ic('kal',18)}Do kalendarza</button><button class="drugi" data-a="mock" data-t="W gotowej wersji powiadomimy Cię o opóźnieniu i zmianie peronu.">${ic('dzwonek',18)}Powiadom mnie</button></div>
  <div class="cta"><button class="glowny" data-a="obserwuj-podroz">${zap?'Obserwujesz podróż':'Obserwuj podróż'}</button><button class="kolo" data-a="na-mape" aria-label="Pokaż na mapie">${ic('mapa')}</button></div></div>`}
function rStacje(){if(document.activeElement!==$('#stacja'))$('#stacja').value=S.station;
 $('#tryb').innerHTML=[['dep','Odjazdy'],['arr','Przyjazdy']].map(([k,t])=>`<button data-a="tryb" data-k="${k}" aria-pressed="${S.tryb===k}">${t}</button>`).join('');
 $('#szybkie').innerHTML=R.szybkie.filter(s=>s!==S.station).slice(0,3).map(s=>`<button class="chip" style="height:40px" data-a="stacja" data-s="${s}">${bkrotko(s)}</button>`).join('');
 const b=tablica(S.station,S.tryb,desk()?20:12),ks=oStacji(S.station);
 const ls=linesOf(S.station),nad=ks.map(kpas).join('')+btkPodp([S.station])+(desk()&&SBN.has(S.station)?`<section class="plyta kol" style="gap:10px">${ls.length?`<span class="dr maly">Linie na tej stacji</span><div class="wiersz zawin" style="gap:10px">${ls.map(lin).join('')}</div>`:''}<div class="wiersz zawin" style="gap:8px"><button class="drugi" data-a="stad" data-s="${S.station}">Połączenie stąd</button><button class="drugi" data-a="stacja-mapa" data-s="${S.station}">${ic('mapa',18)}Na mapie</button></div></section>`:'');$('#st-kom').hidden=!nad;$('#st-kom').innerHTML=nad;
 $('#tablica').innerHTML=tabl(b,S.tryb);anim($('#tablica'),S.station+S.tryb+(b?1:0))}
const tabl=(b,mode)=>b===undefined?'<p class="pusto">Wczytujemy tablicę…</p>':!b?'<p class="pusto">Nie udało się pobrać tablicy. Spróbuj ponownie za chwilę.</p>':b.length?b.map(x=>rzad(x,mode)).join(''):'<p class="pusto">W najbliższej dobie nie ma tu pociągów.</p>';
function rzad(x,mode){const d=x.delay||0,ag=x.agency||R.ag,l=linia(x.route,ag,x.isBus),tm=mn(x.scheduled),m=tm+d-now(),kier=mode==='dep'?x.destination:x.origin,num=krNum(x.number);
 return `<button class="rzad" data-a="poc" data-id="${esc(x.key)}"><span class="g ${d||x.cancelled?'op':''}">${x.cancelled?`<s>${hm(tm)}</s>`:hm(tm+d)}${d&&!x.cancelled?`<s>${hm(tm)}</s>`:''}</span>
 <span class="c"><b>${mode==='dep'?'':'ze stacji '}${krotko(esc(kier))}</b><span>${linN(l)}<span>${AGL(ag)} ${num}</span><span>${x.cancelled?'odwołany':x.skipped?'nie zatrzyma się':zaIle(m)+(d?' · +'+d+' min':'')}</span>${ag==='IC'?'<span>osobny bilet</span>':''}${KOM().some(n=>trwa(n)&&n.poc.some(p=>pasuje(p,ag,numery(x.number))))?'<span class="znak op" style="padding:1px 7px;font-size:12px">komunikat</span>':''}</span></span>${x.platform?`<span class="pe">peron<b>${x.platform}</b></span>`:''}</button>`}
/* mapa: MapLibre i podkład OpenFreeMap jak w obecnej wersji, przemalowany na barwy Tarczy (zmienne CSS motywu) */
let ML=null,MAP=null,MAPST='',BAZA=null;const MKP=new Map();let MKK=[];
const cssv=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const desk=()=>matchMedia('(min-width:920px)').matches;
async function stylMapy(){BAZA??=fetch('https://tiles.openfreemap.org/styles/positron').then(r=>r.ok?r.json():Promise.reject(r.status)).catch(e=>{BAZA=null;throw e});
 const s=structuredClone(await BAZA),bg=cssv('--papier'),pl=cssv('--plyta'),p2=cssv('--plyta-2'),kr=cssv('--kreska'),t2=cssv('--tusz-2');
 for(const l of s.layers){const id=l.id,p=(l.paint??={});
  if(l.type==='background')p['background-color']=bg;
  else if(l.type==='fill'){if(id.startsWith('water'))p['fill-color']=p2;else if(/wood|park|grass/.test(id))p['fill-color']=pl;else if(id==='building'||/^land(use|cover)/.test(id)){p['fill-color']=bg;if(id==='building')p['fill-outline-color']=kr}else if(/^(road|aeroway)/.test(id))p['fill-color']=pl}
  else if(l.type==='line'){if(id.startsWith('waterway'))p['line-color']=p2;else if(id.startsWith('railway'))p['line-color']=id.includes('dash')?bg:kr;else if(id.startsWith('boundary'))p['line-color']=t2;else if(id.includes('casing'))p['line-color']=kr;else if(/^(highway|road|aeroway|tunnel)/.test(id))p['line-color']=pl}
  else if(l.type==='symbol'&&l.layout?.['text-field']){p['text-color']=t2;p['text-halo-color']=bg}}
 // jak w obecnej wersji: bez tarcz i nazw dróg, lotnisk, granic gmin, rzek, dróg lokalnych i nazwy województwa; nazwy po polsku
 s.layers=s.layers.filter(l=>!/shield|highway-name|aeroway|airport|boundary_3|boundary_disputed|waterway|water_name_line|highway_path|highway_minor|road_pier|road_area_pier|label_state/.test(l.id));
 for(const l of s.layers){if(l.layout?.['text-field']&&l.id.startsWith('label_'))l.layout['text-field']=['coalesce',['get','name:pl'],['get','name']];if(l.id==='label_village')l.minzoom=11}
 return s}
function mapaStop(){if(MAP)MAP.remove();MAP=null;MAPST='';MKP.clear();MKK=[];$('#mapa-okno').innerHTML=''}
async function mapaStart(){const key=R.id+(ciemny()?'d':'j');if(MAPST===key)return;mapaStop();MAPST=key;const el=$('#mapa-okno');
 try{ML??=await import('./maplibre-gl.mjs');const style=await stylMapy();if(MAPST!==key)return;const h=SBN.get(R.hub);
  const m=MAP=new ML.Map({container:el,style,center:h?[h.lon,h.lat]:[17,52],zoom:desk()?8:8.6,dragRotate:false,pitchWithRotate:false,touchPitch:false,attributionControl:{compact:true}});
  m.touchZoomRotate.disableRotation();m.addControl(new ML.NavigationControl({showCompass:false}),'bottom-left');
  m.on('load',()=>{warstwy(m);m._ok=true;el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');rMapa()});m.on('moveend',uklad);
  m.on('click',ev=>{if(ev.originalEvent.target.closest?.('.mpoc,.mkom'))return;const p=ev.point,f=m.queryRenderedFeatures([[p.x-12,p.y-12],[p.x+12,p.y+12]],{layers:['st0','st1','st2']});if(f[0])arkStacja(f[0].properties.name)});
 }catch(e){if(MAPST===key){MAPST='';el.innerHTML='<p class="pusto">Nie udało się wczytać mapy. Spróbuj ponownie za chwilę.</p>'}}}
function warstwy(m){const e={type:'FeatureCollection',features:[]},pap=cssv('--papier'),tu=cssv('--tusz'),t2=cssv('--tusz-2'),lr={'line-join':'round','line-cap':'round'},w=(a,b)=>['interpolate',['linear'],['zoom'],7,a,13,b];
 for(const s of['siec','kurs','stacje','utr'])m.addSource(s,{type:'geojson',data:e});
 m.addLayer({id:'siec-p',type:'line',source:'siec',filter:['==',['get','partner'],true],layout:lr,paint:{'line-color':['get','color'],'line-opacity':.35,'line-width':w(1,3)}});
 m.addLayer({id:'siec',type:'line',source:'siec',filter:['!=',['get','partner'],true],layout:lr,paint:{'line-color':['get','color'],'line-width':w(2,6)}});
 m.addLayer({id:'kurs-tlo',type:'line',source:'kurs',layout:lr,paint:{'line-color':pap,'line-width':w(8,14)}});
 m.addLayer({id:'kurs',type:'line',source:'kurs',layout:lr,paint:{'line-color':['get','color'],'line-width':w(4,9)}});
 m.addLayer({id:'utr',type:'circle',source:'utr',paint:{'circle-radius':w(7,13),'circle-opacity':0,'circle-stroke-color':cssv('--opoz'),'circle-stroke-width':2.5}});
 // stacje według ważności: 3 węzeł regionu, 2 ważne, 1 ≥ 80 kursów (od przybliżenia 8), 0 przystanki (od 9,5)
 for(const[r,z,zt]of[[0,9.5,10.5],[1,8,9],[2,0,0]]){const f=r<2?['==',['get','r'],r]:['>=',['get','r'],2];
  m.addLayer({id:'st'+r,type:'circle',source:'stacje',minzoom:z,filter:f,paint:{'circle-radius':['match',['get','r'],3,6.5,2,5,1,4,3],'circle-color':pap,'circle-stroke-color':tu,'circle-stroke-width':r>=2?2.5:1.5}});
  m.addLayer({id:'stn'+r,type:'symbol',source:'stacje',minzoom:zt,filter:f,layout:{'text-field':['get','l'],'text-font':[r>=2?'Noto Sans Bold':'Noto Sans Regular'],'text-size':r>=2?13:11.5,'text-anchor':'left','text-offset':[.8,0],'text-optional':true},paint:{'text-color':r>=2?tu:t2,'text-halo-color':pap,'text-halo-width':1.5}})}}
function rMapa(){const net=dane('/network',3600),live=dane('/live',30,'live'),tr=(live?.trains||[]).filter(t=>t.key);
 $('#mapa-opis').textContent='W ruchu: '+pl(tr.length,'pociąg','pociągi','pociągów')+' · godz. '+hm(now())+(R.id==='mal'&&tr.some(t=>t.source==='gps')?'. Pozycja na żywo dzięki Kolejom Małopolskim.':'');
 mapaStart();const m=MAP;if(!m?._ok)return;m.resize();
 if(net&&m._net!==net){m._net=net;m.getSource('siec').setData(net);let a=180,b=-180,c=90,d=-90;
  for(const f of net.features)for(const[x,y]of f.geometry.coordinates){if(x<a)a=x;if(x>b)b=x;if(y<c)c=y;if(y>d)d=y}
  m._bb=[[a,c],[b,d]];if(!m._fit){m._fit=1;if(desk())m.fitBounds(m._bb,{padding:30,duration:0})}}
 if(m._stn!==STN){m._stn=STN;m.getSource('stacje').setData({type:'FeatureCollection',features:STN.filter(s=>R.id!=='wlkp'||s.kw!==false).map(s=>({type:'Feature',
  properties:{name:s.name,l:R.etyk?R.etyk(s.name):bkrotko(s.name),r:s.name===R.hub?3:WAZNE.includes(s.name)?2:s.daily>=80?1:0},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}))})}
 // trasa wybranego pociągu; „Pokaż na mapie” dopasowuje widok do całej trasy, dotknięta pastylka — nie
 if(S.mapCel){m.flyTo({center:S.mapCel,zoom:12});S.mapCel=null}
 if(!S.mapSel)S.mapFit=false;
 const sel=S.mapSel?kurs(S.mapSel):null,shape=sel?.shape?.length?sel.shape.map(([y,x])=>[x,y]):null;
 if(m._sel!==sel){m._sel=sel;m.getSource('kurs').setData(shape?{type:'Feature',properties:{color:sel.l.color},geometry:{type:'LineString',coordinates:shape}}:{type:'FeatureCollection',features:[]})}
 if(S.mapFit&&shape){S.mapFit=false;let a=180,b=-180,c=90,d=-90;for(const[x,y]of shape){if(x<a)a=x;if(x>b)b=x;if(y<c)c=y;if(y>d)d=y}
  m.fitBounds([[a,c],[b,d]],{padding:desk()?{top:48,bottom:48,left:48,right:480}:40})}
 // utrudnienia: pierścień przy stacjach komunikatu i koło z wykrzyknikiem
 const ut=[],kk=[];
 for(const n of KOM()){if(!trwa(n)||n.sev==='info')continue;const sts=(n.st.length?n.st:n.lines.flatMap(id=>schLinia(id)?.stations||[])).map(s=>SBN.get(s)).filter(Boolean);if(!sts.length)continue;
  for(const s of sts)ut.push({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[s.lon,s.lat]}});kk.push([n,sts[Math.floor(sts.length/2)]])}
 const kkey=kk.map(([n])=>n.id+n.sev).join();
 if(m._kk!==kkey){m._kk=kkey;m.getSource('utr').setData({type:'FeatureCollection',features:ut});MKK.forEach(x=>x.remove());
  MKK=kk.map(([n,s])=>{const el=document.createElement('button');el.className='mkom '+n.sev;el.dataset.a='kom';el.dataset.id=n.id;el.textContent='!';el.setAttribute('aria-label',cap(RODZ[n.sev])+': '+n.tyt.replace(/&[a-z]+;/g,''));
   return new ML.Marker({element:el,offset:[18,-18]}).setLngLat([s.lon,s.lat]).addTo(m)})}
 // pociągi: pastylki HTML; pozycję ustawia MapLibre (transform), wygląd w klasie .mpoc
 const jest=new Set();
 for(const t of tr){jest.add(t.key);const d=t.delay||0,col=t.route?.color||KOL[t.route?.short]||'#8A8F98',h=`<i style="--c:${col}"></i><b>${krNum(t.number).split('/')[0]}${d?` <em>+${d}</em>`:''}</b>`;
  let o=MKP.get(t.key);
  if(!o){const el=document.createElement('div');el.className='mpoc';el.dataset.a='poc';el.dataset.id=t.key;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Pociąg '+AGL(t.agency||R.ag)+' '+krNum(t.number));
   o={el,mk:new ML.Marker({element:el,anchor:'left',offset:[-11,0]}).setLngLat([t.lon,t.lat]).addTo(m)};MKP.set(t.key,o)}
  else o.mk.setLngLat([t.lon,t.lat]);
  if(o.h!==h){o.h=h;o.el.innerHTML=h}o.d=d;o.w=30+(krNum(t.number).split('/')[0].length+(d?String(d).length+2:0))*7;o.el.classList.toggle('wybrany',t.key===S.mapSel)}
 for(const[k,o]of MKP)if(!jest.has(k)){o.mk.remove();MKP.delete(k)}
 uklad()}
// pastylka, która zasłoniłaby inną, staje się kołem w kolorze linii (pierwszeństwo: wybrany, opóźnione)
function uklad(){if(!MAP)return;const zaj=[],kol=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3],wyb=o=>o.el.classList.contains('wybrany');
 for(const o of [...MKP.values()].sort((a,b)=>wyb(b)-wyb(a)||b.d-a.d)){const p=MAP.project(o.mk.getLngLat()),box=[p.x-11,p.y-11,p.x+o.w,p.y+11],pig=wyb(o)||!zaj.some(x=>kol(x,box));if(pig)zaj.push(box);o.el.classList.toggle('kropka',!pig)}}
function rMoje(){const el=$('#v-moje');
 const trasy=S.routes.map((r,i)=>{const all=nast(r),cs=(all||[]).filter(c=>doOdj(c)>=0).slice(0,3);
  return `<section class="plyta"><div class="wiersz rozsun"><h2 style="min-width:0">${bkrotko(r.a)} → ${bkrotko(r.b)}</h2><span class="wiersz" style="gap:6px"><button class="kolo" style="background:var(--papier)" data-a="trasa-odwroc" data-i="${i}" aria-label="Odwróć kierunek trasy">${ic('zamien',18)}</button><button class="kolo" style="background:var(--papier)" data-a="trasa-usun" data-i="${i}" aria-label="Przestań obserwować trasę">${ic('zamknij',18)}</button></span></div>
  ${cs.length?cs.map(c=>`<button class="nast" data-a="sel" data-k="${cKey(c)}" data-d="0"><span class="wiersz" style="gap:10px"><span class="num">${hm(c.dep+cDelay(c))} → ${hm(cArr(c))}</span>${c.legs.map(l=>lin(l.t.l)).join('')}</span>${stan(c,dzien(c.dep))}</button>`).join(''):`<p class="pusto">${all===undefined?'Sprawdzamy połączenia…':all===null?'Nie udało się pobrać połączeń.':'Nie ma najbliższych połączeń na tej trasie.'}</p>`}
  <button class="tekstowy" data-a="trasa-szukaj" data-i="${i}">Więcej połączeń ${ic('strz',16)}</button></section>`}).join('');
 const pod=S.trips.map(t=>{const day=offDz(t.dz);let c=CON[t.k];if(!c&&day>=0&&t.a){const l=polaczenia(t.a,t.b,{min:day*1440+t.m-1,n:3,ttl:300});c=l&&l.find(x=>x.k===t.k)}return{c,day}}).filter(x=>x.c&&x.day>=0&&(x.day>0||cArr(x.c)>=now()-10));
 el.innerHTML=`<h1>Moje</h1><div class="moje-gl"><div class="kol" style="gap:12px">
  <section class="plyta kol" style="gap:10px"><div class="wiersz rozsun zawin"><div style="min-width:0;flex:1 1 220px"><b>Dojście na stację</b><p class="dr" style="font-size:14px">Podaj, ile minut idziesz na stację. Pokażemy, o której wyjść z domu.</p></div>
   <div class="krok"><button data-a="walk" data-d="-1" aria-label="Zmniejsz czas dojścia o minutę">−</button><b>${S.walk?S.walk+' min':'nie podano'}</b><button data-a="walk" data-d="1" aria-label="Zwiększ czas dojścia o minutę">+</button></div></div></section>
  <h2 style="padding:8px 4px 0">Moje trasy${S.przyklad&&S.routes.length?' <span class="dr maly" style="font-weight:500">(przykład)</span>':''}</h2>
  ${trasy||'<div class="plyta pusto">Nie obserwujesz żadnej trasy. Wyszukaj połączenie i wybierz „Obserwuj trasę”.</div>'}
  <h2 style="padding:8px 4px 0">Moje podróże</h2>
  ${pod.length?`<div class="kol" style="gap:8px">${pod.map(x=>`<div class="kol" style="gap:4px">${x.day?`<p class="dr maly" style="padding:0 4px">${etykDnia(x.day)}, ${pelnaData(x.day)}</p>`:''}${polKarta(x.c,false,x.day)}</div>`).join('')}</div>`:'<div class="plyta pusto">Nie obserwujesz żadnej podróży. Otwórz szczegóły połączenia i wybierz „Obserwuj podróż”.</div>'}
  </div><aside class="kol moje-bok" style="gap:12px"><h2 style="padding:8px 4px 0">Ustawienia</h2>
  <section class="plyta wiersz rozsun zawin"><b>Region</b><div class="seg">${Object.entries(REG).map(([k,r])=>`<button data-a="region" data-k="${k}" aria-pressed="${S.region===k}">${r.nazwa}</button>`).join('')}</div></section>
  <section class="plyta wiersz rozsun zawin"><b>Motyw</b><div class="seg">${[['system','Automatyczny'],['light','Jasny'],['dark','Ciemny']].map(([k,t])=>`<button data-a="motyw-ust" data-k="${k}" aria-pressed="${S.theme===k}">${t}</button>`).join('')}</div></section>
  <div class="wiersz zawin" style="gap:8px">${R.id==='wlkp'?`<a class="drugi" href="#btk">Bilet Bus-Tramwaj-Kolej ${ic('strz',16)}</a>`:''}<a class="drugi" href="#onas">O nas ${ic('strz',16)}</a><a class="drugi" href="#schemat">Schemat połączeń ${ic('strz',16)}</a><a class="drugi" href="#system">System projektowy „Tarcza” ${ic('strz',16)}</a></div></aside></div>`}
function rBtk(){const el=$('#v-btk'),b=S.btk;
 if(R.id!=='wlkp'){el.innerHTML=`<h1>Bus-Tramwaj-Kolej</h1><div class="plyta pusto">Bilet Bus-Tramwaj-Kolej jest ważny tylko w Wielkopolsce. Zmień region, żeby zobaczyć ceny.</div>`;return}
 const st=b.st?btkSt(b.st):null,z=st?st.z:null,opc=z&&z!=='A'?Object.keys(bWiersz(z).p):[];
 if(z&&!opc.includes(b.ztm))b.ztm='A';
 const dod=z&&z!=='A'?BTK.dod[z]:null,x=dod&&b.extra?dod[0]:null,cena=z&&z!=='A'?bCena(z,b.ztm,b.ulga,x):null;
 const zasieg=z==='A'?'A':'A–'+z,lit=l=>`<span class="kzn info m" aria-hidden="true">${l}</span>`;
 /* bilet: wynik w kształcie biletu, zmienia się od razu przy każdej opcji */
 const bilet=`<section class="blok bilet kol" aria-live="polite"><p class="dr maly" style="font-weight:600">Bilet miesięczny Bus-Tramwaj-Kolej</p>
  ${!st?`<p class="wielkie" style="font-size:26px">Wybierz stację</p><p class="dr">Pokażemy cenę biletu z tej stacji do Poznania.</p>`
  :cena==null?`<p class="wielkie" style="font-size:26px">Wystarczy bilet ZTM</p><p class="dr">Po Poznaniu i do stacji Kiekrz pojedziesz pociągiem na bilecie okresowym ZTM ze strefą A.</p>`
  :`<p class="bilet-trasa">${st.n} – Poznań</p><p class="bilet-cena num">${zl(cena)}<span>za miesiąc</span></p><hr class="perforacja">
   <div class="fakty"><div><span>pociągi</span><b>strefy ${zasieg}</b></div><div><span>autobusy i tramwaje</span><b>${BTK.ztm[b.ztm][2]}</b></div><div><span>rodzaj</span><b>${BTK.ulgi[b.ulga]}</b></div>${x?`<div><span>dodatkowo</span><b>${dod[2]}</b></div>`:''}</div>
   ${x==='czempin'?'<p class="dr maly">Ten bilet kupisz na razie tylko w kasach Kolei Wielkopolskich.</p>':''}`}</section>`;
 /* tarcza stref: Poznań w środku, każda strefa to kolejny pierścień; zakres biletu przyciemniony */
 const zi=z?'ABCDEFG'.indexOf(z):-1,Rr=i=>16+i*15.5;
 let ang=-35;if(st){const k=STATIONS.find(n=>bKey(n)===bKey(st.n));const p=SBN.get(k),h=SBN.get(R.hub);if(k&&k!==R.hub&&p&&h){ang=Math.atan2(h.lat-p.lat,(p.lon-h.lon)*.62)*180/Math.PI}}
 const gora=ang>-125&&ang<-55?1:-1; // litery po drugiej stronie niż kropka stacji
 let svg='';for(let i=6;i>=0;i--)svg+=`<circle cx="120" cy="120" r="${Rr(i)}" fill="${i<=zi?'var(--tusz)':'none'}" fill-opacity="${i<=zi?.07:0}" stroke="${i===zi?'var(--tusz)':'var(--kreska)'}" stroke-width="${i===zi?2.5:1.2}"/>`;
 'ABCDEFG'.split('').forEach((l,i)=>{const y=i?120+gora*(Rr(i)+Rr(i-1))/2:120;svg+=`<text x="120" y="${y+4}" text-anchor="middle" class="${i===zi?'wyb':''}">${l}</text>`});
 if(zi>=1){const m=(Rr(zi)+Rr(zi-1))/2,a=ang*Math.PI/180;svg+=`<circle cx="${(120+m*Math.cos(a)).toFixed(1)}" cy="${(120+m*Math.sin(a)).toFixed(1)}" r="6" fill="var(--tusz)" stroke="var(--plyta)" stroke-width="2.500"/>`}
 const opis=!st?'Strefy liczymy od Poznania. Im dalej od miasta, tym dalsza litera.':z==='A'?`${st.n} leży w strefie A, czyli w Poznaniu.`:`${st.n} leży w strefie ${z}. Bilet obejmuje też wszystkie stacje bliżej Poznania.`;
 const tarcza=`<figure class="plyta btk-tarcza"><svg viewBox="0 0 240 240" role="img" aria-label="Strefy biletu od A w Poznaniu do G${z?', wybrana strefa '+z:''}">${svg}</svg><figcaption>${opis}</figcaption></figure>`;
 const ster=`<section class="plyta ster kol" style="gap:14px">
  <label class="pole"><span>Skąd dojeżdżasz?</span><input id="btk-st" data-lista="btk" role="combobox" aria-autocomplete="list" aria-controls="lista" aria-expanded="false" autocomplete="off" name="btk-stacja" value="${st?st.n:''}"></label>
  ${opc.length?`<div class="kol" style="gap:6px"><b>Autobusy i tramwaje ZTM</b><div class="seg" style="align-self:flex-start">${opc.map(o=>`<button data-a="btk-ztm" data-k="${o}" aria-pressed="${b.ztm===o}">${BTK.ztm[o][0]}</button>`).join('')}</div><p class="dr maly">${BTK.ztm[b.ztm][1]}</p></div>
  <div class="kol" style="gap:6px"><b>Rodzaj biletu</b><div class="seg" style="align-self:flex-start">${BTK.ulgi.map((u,i)=>`<button data-a="btk-ulga" data-k="${i}" aria-pressed="${b.ulga===i}">${u}</button>`).join('')}</div></div>
  ${dod?`<div class="przel-rz"><b>${dod[1]}</b><button class="przel" role="switch" aria-checked="${!!x}" aria-label="${dod[1]}" data-a="btk-extra"><i></i></button></div>`:''}`:''}</section>`;
 const sek=(k,t,h)=>`<section class="plyta" style="padding:4px 16px"><button class="akord" data-a="btk-sek" data-k="${k}" aria-expanded="${b.open===k}"><b>${t}</b>${ic(b.open===k?'gora':'dol',18)}</button>${b.open===k?`<div style="padding:4px 0 12px">${h}</div>`:''}</section>`;
 const Z=['A','A+B','A+C','A+B+C'];
 const cennik=`<div class="seg" style="margin-bottom:8px">${BTK.ulgi.map((u,i)=>`<button data-a="btk-tab" data-k="${i}" aria-pressed="${b.tab===i}">${u}</button>`).join('')}</div>
  <div style="overflow-x:auto"><table class="cennik"><tr><th>Strefa kolejowa</th>${Z.map(s=>`<th>ZTM ${s}</th>`).join('')}</tr>
  ${BTK.ceny.map(w=>{const tu=w.r===z&&(w.x||null)===(x||null);return `<tr><td>${lit(w.r)}${w.x?`<span class="dr maly">${BTK.dod[w.r][3]}</span>`:''}</td>${Z.map(s=>`<td class="${tu&&s===b.ztm?'wyb':''}">${w.p[s]?zl(w.p[s][b.tab]).replace(' zł',''):'–'}</td>`).join('')}</tr>`}).join('')}</table></div>
  <p class="dr maly" style="margin-top:8px">Ceny w złotych za miesiąc, od ${BTK.data}. Strefy ZTM: A to Poznań, B to najbliższe gminy, C to dalsze gminy.</p>`;
 const strefy=`<div class="strefy">${Object.keys(BTK.stacje).map(s=>`${lit(s)}<span>${s==='A'?'Wszystkie stacje w Poznaniu oraz Kiekrz':BTK.stacje[s].join(', ')}</span>`).join('')}</div>`;
 const Q=[['Imienny','Wpisz na nim imię i nazwisko i miej przy sobie dokument ze zdjęciem.'],['Miesiąc od wybranego dnia','Kupisz go najwcześniej 30 dni przed pierwszym dniem ważności.'],['Także bliżej Poznania','Bilet na dalszą strefę obejmuje wszystkie stacje po drodze.'],['Bez PKP Intercity','Jest ważny w pociągach Kolei Wielkopolskich i POLREGIO.']];
 el.innerHTML=`<h1>Bus-Tramwaj-Kolej</h1><p class="dr" style="max-width:62ch">Jeden bilet miesięczny na pociąg do Poznania i komunikację miejską ZTM.</p>
 <div class="btk-gl">${bilet}${ster}${tarcza}</div>
 <div class="zasady">${Q.map(([t,o])=>`<section class="plyta"><b>${t}</b><p class="dr" style="font-size:14px">${o}</p></section>`).join('')}</div>
 <h2 style="padding:8px 4px 0">Szczegóły</h2>
 ${sek('cennik','Cennik',cennik)}${sek('strefy','Stacje w strefach',strefy)}
 ${sek('ztm','Miejscowości w strefach ZTM',`<div class="strefy">${Object.entries(BTK.miejsc).map(([s,t])=>lit(s)+`<span>${t}</span>`).join('')}</div>`)}
 ${sek('zasady','Zwroty i pozostałe zasady',`<div class="tresc"><ul>${BTK.zasady.slice(1).map(r=>`<li>${r}</li>`).join('')}</ul></div>`)}
 <div class="zrodla"><span>Źródła:</span>${BTK.zrodla.map(([t,h])=>`<a href="${h}" target="_blank" rel="noopener">${t}</a>`).join('')}</div>`}
function rSystem(){const K=[['--papier','Papier','tło strony'],['--plyta','Płyta','tło treści'],['--plyta-2','Płyta 2','najechanie, wybrany wiersz'],['--kreska','Kreska','jedyna linia podziału'],['--tusz','Tusz','tekst, wybrane opcje'],['--tusz-2','Tusz 2','tekst pomocniczy'],['--akcja','Akcja','tylko główny przycisk'],['--blok','Blok','najbliższy wyjazd'],['--ok-tlo','Na czas','odjazd w ciągu godziny'],['--opoz-tlo','Opóźnienie','pociąg opóźniony']];
 const J=[['Zwracamy się na „ty”','„Wyjdź z domu o 07:22”, „Wybierz stację”. Bez form bezosobowych i bez „Państwo”.'],
  ['Połączenie','Przejazd ze stacji do stacji o konkretnej godzinie. Może mieć przesiadkę.'],
  ['Trasa','Para stacji, którą obserwujesz na stałe, na przykład dom i praca.'],
  ['Podróż','Jedno połączenie, które obserwujesz w wybranym dniu.'],
  ['Godzina','Zawsze cztery cyfry: 07:30. Nigdy „7.30” ani „7:30”.'],
  ['Czas trwania','„49 min”, „1 h 20 min”. Do odjazdu: „za 12 min”, „teraz”.'],
  ['Dzień','„Dziś”, „Jutro”, dalej skrót dnia i data: „śr. 18.11”. Pełny zapis: „środa, 18 listopada”.'],
  ['Stan pociągu','„na czas” albo „+6 min”. Nie piszemy „punktualnie” ani „zgodnie z rozkładem”.'],
  ['Komunikat','Wiadomość od przewoźnika. Ma jeden z trzech rodzajów: „informacja”, „utrudnienie”, „poważne utrudnienie”. Tytuł mówi, co się dzieje i gdzie.'],
  ['Okres','„13–26 listopada”, „28 listopada – 5 grudnia”, „od 16 listopada do odwołania”. Obok stan: „trwa”, „od jutra”.'],
  ['Nazwy stacji','W zdaniu nie odmieniamy nazw: „między stacjami Września i Konin”, „ze stacji Gniezno”.'],
  ['Cena','Zawsze z groszami i walutą: „441,00 zł”. W tabeli sama liczba, a waluta w opisie pod tabelą.'],
  ['Peron i tor','„peron 1 · tor 16”, małą literą, bez skrótów.'],
  ['Skróty','Tylko: min, h, ok., Gł., Wlkp., k. oraz skróty dni tygodnia.'],
  ['Przyciski','Mówią, co się stanie: „Szukaj połączeń”, „Obserwuj trasę”. Po włączeniu: „Obserwujesz trasę”.'],
  ['Nazwa serwisu','Zawsze małymi literami i z końcówką: zanimwyjdziesz.pl.']];
 $('#v-system').innerHTML=`<h1>Tarcza</h1><p class="dr" style="max-width:62ch">Propozycja systemu projektowego zanimwyjdziesz.pl 2.0. Serwis ma odpowiadać na jedno pytanie: o której wyjść z domu. Dlatego godziny piszemy dużymi, zwykłymi cyframi, a wszystko inne schodzi na drugi plan.</p>
 <div class="zasady">
  <section class="plyta"><h2>Najpierw godzina</h2><p class="dr">Największy napis na ekranie to godzina wyjścia albo odjazdu. Obok piszemy słowami, ile minut zostało.</p></section>
  <section class="plyta"><h2>Koło i płyta</h2><p class="dr">Koło to przycisk, stacja albo liczba minut. Minuty podajemy raz: w kole, a obok stoi godzina. Płyta niesie treść. Nie ma obrysów, a cień ma tylko lista podpowiedzi, bo unosi się nad stroną.</p></section>
  <section class="plyta"><h2>Jedna czerwień</h2><p class="dr">Kolor akcji ma tylko główny przycisk ekranu. Stan pociągu ma własne kolory: zielony i bursztynowy.</p></section>
 </div>
 <h2 style="padding-top:8px">Godzina i data</h2>
 <section class="plyta kol" style="gap:12px"><div class="wiersz zawin" style="gap:8px 20px"><span class="godz"><span>07:30</span><em>→</em><span>08:19</span></span><span class="znak ok">za 12 min</span><span class="znak op">za 18 min · +6 min</span><span class="znak neutr">za 1 h 20 min</span></div>
  <p class="dr maly">Godzinę i dzień wybiera się we własnym oknie systemu, takim samym w każdej przeglądarce i w telefonie.</p>
  <button class="drugi" style="background:var(--papier);align-self:flex-start" data-a="kiedy">${ic('zegar',18)}Otwórz wybór dnia i godziny</button></section>
 <h2 style="padding-top:8px">Pismo</h2>
 <section class="plyta kol" style="gap:12px"><p class="dr maly">Jeden krój do wszystkiego. Wybierz próbkę, a krój zmieni się w całej makiecie.</p>
  <div class="kroje">${FONTS.map(f=>`<button class="kroj" data-a="font" data-k="${f}" aria-pressed="${S.font===f}" style="font-family:'${f}',sans-serif"><small>${f}${f==='Figtree'?' · obecny krój serwisu':''}</small><b class="num">Wyjdź z domu o 07:22</b><span>Pociąg odjeżdża o 07:30 z peronu 1. Żółć, gęś, źdźbło.</span></button>`).join('')}</div></section>
 <h2 style="padding-top:8px">Kolory</h2><div class="plyta"><div class="siatka">${K.map(([v,n,o])=>`<div class="probka"><i style="background:var(${v})"></i><b>${n}</b><span>${o}</span></div>`).join('')}</div></div>
 <h2 style="padding-top:8px">Elementy</h2>
 <section class="plyta kol" style="gap:14px"><div class="wiersz zawin"><button class="glowny" style="width:auto;padding:0 28px" data-a="mock" data-t="Główny przycisk: jeden na ekran.">Szukaj połączeń</button><button class="drugi" style="background:var(--papier)" data-a="mock" data-t="Przycisk pomocniczy.">Do kalendarza</button><button class="kolo" style="background:var(--papier)" aria-label="Przykład przycisku z ikoną">${ic('zamien')}</button><button class="tekstowy">Obserwuj trasę</button></div>
 <label class="pole" style="max-width:380px"><span>Lista podpowiedzi</span><input id="sys-st" data-lista="stacje" role="combobox" aria-autocomplete="list" aria-controls="lista" aria-expanded="false" autocomplete="off" name="system-stacja" placeholder="Zacznij pisać, na przykład „gnie”"></label>
 <div class="wiersz zawin">${LINES.map(lin).join('')}<span class="znak neutr">osobny bilet</span></div>
 <div class="wiersz zawin" style="gap:8px 20px">${['info','utr','pow'].map(s=>`<span class="wiersz" style="gap:8px">${kzn({sev:s})}${RODZ[s]}</span>`).join('')}</div>
 <div class="wiersz zawin"><button class="chip" data-a="opcje">${ic('opcje',18)}Opcje · 2</button><span class="przel" role="img" aria-label="Przełącznik włączony" aria-checked="true"><i></i></span><span class="przel" role="img" aria-label="Przełącznik wyłączony"><i></i></span><div class="seg"><button aria-pressed="true">Odjazdy</button><button aria-pressed="false">Przyjazdy</button></div></div>
 <p class="dr maly">Zaokrąglenia: 10 px znaczniki, 16 px przyciski i pola, 28 px płyty, pełne koło dla przycisków z ikoną.</p></section>
 <h2 style="padding-top:8px">Język</h2>
 <section class="plyta"><div class="slownik">${J.map(([a,b])=>`<b>${a}</b><span class="dr">${b}</span>`).join('')}</div></section>`}

/* ---------- schemat: dane z web/src/utils/scheme.ts ---------- */
const SCH=(()=>{
const NODES = {
  poz: { x: 360, y: 380, name: 'Poznań Główny', label: 'Poznań Gł.', at: 'bl', major: true },
  wsch: { x: 410, y: 380, name: 'Poznań Wschód', label: 'Poznań Wsch.', at: 'b' },
  lubon: { x: 360, y: 435, name: 'Luboń koło Poznania', label: 'Luboń', at: 'tl' },
  // północ: Piła, Krzyż
  obor: { x: 360, y: 295, name: 'Oborniki Wielkopolskie', label: 'Oborniki\nWlkp.', at: 'l' },
  rogo: { x: 360, y: 245, name: 'Rogoźno Wielkopolskie', label: 'Rogoźno\nWlkp.', at: 'l' },
  chodz: { x: 360, y: 190, name: 'Chodzież', label: 'Chodzież', at: 'l' },
  pila: { x: 360, y: 130, name: 'Piła Główna', label: 'Piła Gł.', at: 't', major: true },
  trzc: { x: 275, y: 130, name: 'Trzcianka', label: 'Trzcianka', at: 't' },
  b_pila1: { x: 210, y: 130 },
  b_pila2: { x: 190, y: 150 },
  wielen: { x: 190, y: 172, name: 'Wieleń', label: 'Wieleń', at: 'l' },
  krzyz: { x: 190, y: 210, name: 'Krzyż', label: 'Krzyż Wlkp.', at: 'l', major: true },
  wronki: { x: 240, y: 260, name: 'Wronki', label: 'Wronki', at: 'l' },
  szam: { x: 280, y: 300, name: 'Szamotuły', label: 'Szamotuły', at: 'l' },
  rokiet: { x: 320, y: 340, name: 'Rokietnica', label: 'Rokietnica', at: 'l' },
  // północny wschód: Gołańcz, Mogilno
  b_gol1: { x: 425, y: 380 },
  b_gol2: { x: 445, y: 360 },
  murg: { x: 445, y: 300, name: 'Murowana Goślina', label: 'Murowana\nGoślina', at: 'l' },
  b_gol3: { x: 445, y: 290 },
  wagr: { x: 485, y: 250, name: 'Wągrowiec', label: 'Wągrowiec', at: 'l' },
  golancz: { x: 520, y: 215, name: 'Gołańcz', label: 'Gołańcz', at: 't', major: true },
  b_mog: { x: 440, y: 380 },
  pobiedz: { x: 465, y: 355, name: 'Pobiedziska', label: 'Pobiedziska', at: 'r' },
  gniezno: { x: 560, y: 260, name: 'Gniezno', label: 'Gniezno', at: 'r', major: true },
  mogilno: { x: 610, y: 210, name: 'Mogilno', label: 'Mogilno', at: 'r', major: true },
  // wschód: Kutno
  wrzesnia: { x: 560, y: 380, name: 'Września', label: 'Września', at: 'bl' },
  b_kut1: { x: 590, y: 380 },
  slupca: { x: 615, y: 405, name: 'Słupca', label: 'Słupca', at: 'tr' },
  b_kut2: { x: 640, y: 430 },
  konin: { x: 720, y: 430, name: 'Konin', label: 'Konin', at: 't' },
  kolo: { x: 790, y: 430, name: 'Koło', label: 'Koło', at: 't' },
  kutno: { x: 930, y: 430, name: 'Kutno', label: 'Kutno', at: 't', major: true },
  // południowy wschód: Jarocin, Ostrów, Kalisz, Łódź
  sroda: { x: 460, y: 480, name: 'Środa Wielkopolska', label: 'Środa Wlkp.', at: 'tr' },
  jarocin: { x: 560, y: 580, name: 'Jarocin', label: 'Jarocin', at: 'tr' },
  pleszew: { x: 617, y: 637, name: 'Pleszew', label: 'Pleszew', at: 'tr' },
  ostrow: { x: 675, y: 695, name: 'Ostrów Wielkopolski', label: 'Ostrów Wlkp.', at: 'r', major: true },
  krotoszyn: { x: 560, y: 695, name: 'Krotoszyn', label: 'Krotoszyn', at: 'l', major: true },
  odolanow: { x: 630, y: 740, name: 'Odolanów', label: 'Odolanów', at: 'l', major: true },
  ostrzeszow: { x: 675, y: 770, name: 'Ostrzeszów', label: 'Ostrzeszów', at: 'r' },
  kepno: { x: 675, y: 815, name: 'Kępno', label: 'Kępno', at: 'r' },
  leka: { x: 675, y: 860, name: 'Łęka Opatowska', label: 'Łęka Opatowska', at: 'r', major: true },
  kalisz: { x: 735, y: 635, name: 'Kalisz', label: 'Kalisz', at: 't', major: true },
  opatowek: { x: 785, y: 635, name: 'Opatówek', label: 'Opatówek', at: 'b' },
  sieradz: { x: 835, y: 635, name: 'Sieradz', label: 'Sieradz', at: 't' },
  zdwola: { x: 875, y: 635, name: 'Zduńska Wola', label: 'Zduńska\nWola', at: 'b' },
  pabianice: { x: 915, y: 595, name: 'Pabianice', label: 'Pabianice', at: 'l' },
  lodz: { x: 955, y: 555, name: 'Łódź Kaliska', label: 'Łódź Kal.', at: 't', major: true },
  // zachód: Zbąszynek, Wolsztyn
  buk: { x: 255, y: 380, name: 'Buk', label: 'Buk', at: 't' },
  b_zb1: { x: 210, y: 380 },
  nt: { x: 180, y: 410, name: 'Nowy Tomyśl', label: 'Nowy Tomyśl', at: 'tl' },
  b_zb2: { x: 150, y: 440 },
  zbaszyn: { x: 150, y: 465, name: 'Zbąszyń', label: 'Zbąszyń', at: 'bl' },
  zbaszynek: { x: 80, y: 465, name: 'Zbąszynek', label: 'Zbąszynek', at: 't', major: true },
  steszew: { x: 325, y: 470, name: 'Stęszew', label: 'Stęszew', at: 'tl' },
  grodzisk: { x: 290, y: 505, name: 'Grodzisk Wielkopolski', label: 'Grodzisk\nWlkp.', at: 'b' },
  wolsztyn: { x: 190, y: 505, name: 'Wolsztyn', label: 'Wolsztyn', at: 'tr', major: true },
  powodowo: { x: 120, y: 505, name: 'Powodowo', label: 'Powodowo', at: 'b', major: true },
  boszkowo: { x: 235, y: 550, name: 'Boszkowo', label: 'Boszkowo', at: 'l' },
  // południe: Leszno, Rawicz, Głogów
  koscian: { x: 360, y: 505, name: 'Kościan', label: 'Kościan', at: 'r' },
  b_kos: { x: 360, y: 515 },
  leszno: { x: 280, y: 595, name: 'Leszno', label: 'Leszno', at: 'l', major: true },
  rawicz: { x: 280, y: 675, name: 'Rawicz', label: 'Rawicz', at: 'r', major: true },
  wschowa: { x: 230, y: 645, name: 'Wschowa', label: 'Wschowa', at: 'tl' },
  glogow: { x: 180, y: 695, name: 'Głogów', label: 'Głogów', at: 'l', major: true },
  kobylin: { x: 430, y: 595, name: 'Kobylin', label: 'Kobylin', at: 't' },
  b_kob: { x: 460, y: 595 },
}

// wspólne odcinki list stacji
const POZ_WSCH = ['Poznań Główny', 'Poznań Garbary', 'Poznań Wschód']
const POZ_LUBON = ['Poznań Główny', 'Poznań Dębiec', 'Luboń koło Poznania']
const POZ_JAROCIN = [
  'Poznań Główny', 'Poznań Dębina', 'Poznań Starołęka', 'Poznań Krzesiny', 'Gądki', 'Kórnik', 'Pierzchno', 'Środa Wielkopolska',
  'Sulęcinek', 'Solec Wielkopolski', 'Chocicza', 'Mieszków', 'Jarocin',
]
const JAROCIN_OSTROW = ['Witaszyce', 'Kotlin', 'Pleszew', 'Taczanów', 'Bronów', 'Biniew', 'Ostrów Wielkopolski']
const JAROCIN_KROTOSZYN = ['Golina', 'Obra Stara', 'Koźmin Wielkopolski', 'Wolenice', 'Bożacin', 'Krotoszyn']
const SE_TRUNK = ['poz', 'sroda', 'jarocin']
const OSTROW_TRUNK = [...SE_TRUNK, 'pleszew', 'ostrow']

/** Kolejność na liście = kolejność linii w wiązkach na wspólnych odcinkach. */
const LINES = [
  {
    id: 'pila-krzyz', name: 'Krzyż – Piła', color: '#C7A28E',
    path: ['krzyz', 'wielen', 'b_pila2', 'b_pila1', 'trzc', 'pila'],
    stations: ['Krzyż', 'Wieleń', 'Biernatowo', 'Siedlisko Czarnkowskie', 'Trzcianka', 'Biała Pilska', 'Stobno', 'Piła Główna'],
  },
  {
    id: 'krzyz', name: 'Poznań – Krzyż Wlkp.', color: '#EF7D00',
    path: ['poz', 'rokiet', 'szam', 'wronki', 'krzyz'],
    stations: ['Poznań Główny', 'Poznań Wola', 'Kiekrz', 'Rokietnica', 'Pamiątkowo', 'Baborówko', 'Szamotuły', 'Pęckowo', 'Wronki', 'Wronki Zamość', 'Mokrz', 'Miały', 'Drawski Młyn', 'Krzyż'],
  },
  {
    id: 'pila', name: 'Poznań – Piła', color: '#7B4A2A',
    path: ['poz', 'obor', 'rogo', 'chodz', 'pila'],
    stations: [
      'Poznań Główny', 'Poznań Podolany', 'Poznań Strzeszyn', 'Złotniki Grzybowe', 'Złotniki', 'Złotkowo', 'Golęczewo', 'Chludowo', 'Wargowo', 'Bogdanowo',
      'Oborniki Wielkopolskie Miasto', 'Oborniki Wielkopolskie', 'Rożnowo', 'Parkowo', 'Rogoźno Wielkopolskie', 'Tarnowo Rogozińskie', 'Sokołowo Budzyńskie',
      'Budzyń', 'Ostrówki koło Chodzieży', 'Chodzież', 'Milcz', 'Dziembówko', 'Piła Kalina', 'Piła Główna',
    ],
  },
  {
    id: 'golancz', name: 'Poznań – Gołańcz', color: '#16A34A',
    path: ['poz', 'wsch', 'b_gol1', 'b_gol2', 'murg', 'b_gol3', 'wagr', 'golancz'],
    stations: [
      ...POZ_WSCH, 'Poznań Karolin', 'Czerwonak', 'Czerwonak Osiedle', 'Owińska', 'Bolechowo', 'Zielone Wzgórza', 'Murowana Goślina', 'Przebędowo', 'Łopuchowo',
      'Łopuchowo Osiedle', 'Sława Wielkopolska', 'Skoki', 'Roszkowo Wągrowieckie', 'Przysieczyn', 'Wągrowiec', 'Kobylec', 'Grylewo', 'Laskownica', 'Gołańcz',
    ],
  },
  {
    id: 'mogilno', name: 'Poznań – Mogilno', color: '#F5A700',
    path: ['poz', 'wsch', 'b_gol1', 'b_mog', 'pobiedz', 'gniezno', 'mogilno'],
    stations: [
      ...POZ_WSCH, 'Ligowiec', 'Kobylnica', 'Biskupice Wielkopolskie', 'Promno', 'Pobiedziska Letnisko', 'Pobiedziska', 'Lednogóra', 'Fałkowo', 'Pierzyska',
      'Gniezno', 'Jankowo Dolne', 'Trzemeszno', 'Wydartowo', 'Mogilno',
    ],
  },
  {
    id: 'kutno', name: 'Poznań – Kutno', color: '#E30613',
    path: ['poz', 'wsch', 'b_gol1', 'b_mog', 'wrzesnia', 'b_kut1', 'slupca', 'b_kut2', 'konin', 'kolo', 'kutno'],
    stations: [
      ...POZ_WSCH, 'Poznań Antoninek', 'Swarzędz', 'Paczkowo', 'Kostrzyn Wielkopolski', 'Gułtowy', 'Nekla', 'Podstolice', 'Września', 'Gutowo Wielkopolskie',
      'Otoczna', 'Wólka', 'Strzałkowo', 'Słupca', 'Cienin', 'Cienin Kościelny', 'Spławie', 'Kawnice', 'Konin Zachód', 'Konin', 'Patrzyków', 'Kramsk',
      'Budki Nowe', 'Koło', 'Barłogi', 'Kłodawa', 'Turzynów', 'Krzewie', 'Nowe Kutnowskie', 'Kutno',
    ],
  },
  {
    id: 'gniezno-krotoszyn', name: 'Gniezno – Krotoszyn', color: '#9BCB6A',
    path: ['gniezno', 'wrzesnia', 'jarocin', 'krotoszyn'],
    stations: [
      'Gniezno', 'Gębarzewo', 'Żydowo', 'Czerniejewo', 'Marzenin', 'Września', 'Obłaczkowo', 'Chwalibogowo', 'Książno', 'Miłosław', 'Orzechowo', 'Żerków',
      'Radlin Wielkopolski', 'Jarocin', ...JAROCIN_KROTOSZYN,
    ],
  },
  {
    id: 'kalisz', name: 'Poznań – Kalisz', color: '#3FA9A9',
    path: [...OSTROW_TRUNK, 'kalisz', 'opatowek'],
    stations: [...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Czekanów', 'Ociąż', 'Nowe Skalmierzyce', 'Kalisz Szczypiorno', 'Kalisz', 'Kalisz Winiary', 'Opatówek'],
  },
  {
    id: 'lodz', name: 'Poznań – Łódź', color: '#7D6BB3',
    path: [...OSTROW_TRUNK, 'kalisz', 'opatowek', 'sieradz', 'zdwola', 'pabianice', 'lodz'],
    stations: [
      'Poznań Główny', 'Poznań Dębina', 'Poznań Starołęka', 'Środa Wielkopolska', 'Jarocin', 'Pleszew', 'Ostrów Wielkopolski', 'Nowe Skalmierzyce', 'Kalisz',
      'Opatówek', 'Sieradz', 'Zduńska Wola', 'Łask', 'Kolumna', 'Pabianice', 'Pabianice Północne', 'Łódź Retkinia', 'Łódź Kaliska',
    ],
    note: 'Pociągi pospieszne KW — zatrzymują się tylko na wymienionych stacjach.',
  },
  {
    id: 'leka', name: 'Poznań – Łęka Opatowska', color: '#FFCC00',
    path: [...OSTROW_TRUNK, 'ostrzeszow', 'kepno', 'leka'],
    stations: [
      ...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Janków Przygodzki', 'Przygodzice', 'Antonin', 'Niedźwiedź Wielkopolski', 'Ostrzeszów', 'Domanin', 'Kępno', 'Słupia',
      'Łęka Opatowska',
    ],
  },
  {
    id: 'odolanow', name: 'Poznań – Odolanów', color: '#E6007E',
    path: [...OSTROW_TRUNK, 'odolanow'],
    stations: [...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Topola-Osiedle', 'Tarchały Wielkie', 'Odolanów'],
  },
  {
    id: 'krotoszyn', name: 'Poznań – Krotoszyn', color: '#A3237F',
    path: [...SE_TRUNK, 'krotoszyn'],
    stations: [...POZ_JAROCIN, ...JAROCIN_KROTOSZYN],
  },
  {
    id: 'leszno-ostrow', name: 'Leszno – Ostrów Wlkp.', color: '#1F1F1F', dark: '#E6E6E6',
    path: ['leszno', 'kobylin', 'b_kob', 'krotoszyn', 'ostrow'],
    stations: [
      'Leszno', 'Leszno Grzybowo', 'Kąkolewo', 'Pawłowice', 'Poniec', 'Dzięczyn', 'Karzec', 'Krobia', 'Włostowo', 'Pępowo', 'Czeluścin', 'Kobylin', 'Kuklinów',
      'Dzierżanów Wielkopolski', 'Krotoszyn', 'Gorzupia', 'Biadki', 'Daniszyn', 'Łąkociny', 'Ostrów Wielkopolski Gorzyce', 'Ostrów Wielkopolski',
    ],
  },
  {
    id: 'rawicz', name: 'Poznań – Rawicz', color: '#C0601A',
    path: ['poz', 'lubon', 'koscian', 'b_kos', 'leszno', 'rawicz'],
    stations: [
      ...POZ_LUBON, 'Puszczykowo', 'Puszczykówko', 'Mosina', 'Drużyna Poznańska', 'Iłowiec', 'Czempiń', 'Oborzyska Stare', 'Kościan', 'Przysieka Stara',
      'Stare Bojanowo', 'Górka Duchowna', 'Lipno Nowe', 'Leszno', 'Rydzyna', 'Kaczkowo', 'Bojanowo', 'Rawicz',
    ],
  },
  {
    id: 'glogow', name: 'Leszno – Głogów', color: '#7F9A1E',
    path: ['leszno', 'wschowa', 'glogow'],
    stations: ['Leszno', 'Lasocice', 'Wschowa', 'Stare Drzewce', 'Głogówko', 'Głogów'],
  },
  {
    id: 'wolsztyn', name: 'Poznań – Wolsztyn – Powodowo', color: '#0B5A86',
    path: ['poz', 'lubon', 'steszew', 'grodzisk', 'wolsztyn', 'powodowo'],
    stations: [
      ...POZ_LUBON, 'Wiry', 'Szreniawa', 'Trzebaw Rosnówko', 'Stęszew', 'Strykowo Poznańskie', 'Granowo', 'Kotowo', 'Ptaszkowo', 'Grąblewo',
      'Grodzisk Wielkopolski', 'Ruchocice', 'Drzymałowo', 'Rakoniewice', 'Rostarzewo', 'Tłoki', 'Adamowo', 'Wolsztyn', 'Powodowo',
    ],
  },
  {
    id: 'zbaszynek', name: 'Poznań – Zbąszynek', color: '#2AA7DF',
    path: ['poz', 'buk', 'b_zb1', 'nt', 'b_zb2', 'zbaszyn', 'zbaszynek'],
    stations: [
      'Poznań Główny', 'Poznań Górczyn', 'Poznań Junikowo', 'Palędzie', 'Dopiewo', 'Otusz', 'Buk', 'Wojnowice Wielkopolskie', 'Opalenica', 'Porażyn', 'Sątopy',
      'Nowy Tomyśl', 'Jastrzębsko', 'Chrośnica', 'Zbąszyń', 'Zbąszynek',
    ],
  },
  {
    id: 'zbaszynek-leszno', name: 'Zbąszynek – Leszno', color: '#9A9A9A',
    path: ['zbaszynek', 'zbaszyn', 'wolsztyn', 'boszkowo', 'leszno'],
    stations: [
      'Zbąszynek', 'Zbąszyń', 'Zbąszyń Przedmieście', 'Stefanowo', 'Belęcin Wielkopolski', 'Tuchorza', 'Wolsztyn', 'Nowy Widzim', 'Wroniawy', 'Nowy Solec',
      'Nowawieś Mochy', 'Perkowo', 'Błotnica', 'Starkowo', 'Boszkowo', 'Włoszakowice', 'Krzycko Wielkie', 'Wilkowice', 'Leszno',
    ],
  },
]

/** Kolejność na liście linii (jak w legendzie mapy przewoźnika). */
const LEGEND = [
  'kutno', 'mogilno', 'golancz', 'pila', 'pila-krzyz', 'krzyz', 'zbaszynek', 'wolsztyn', 'zbaszynek-leszno', 'rawicz', 'leszno-ostrow', 'glogow',
  'krotoszyn', 'odolanow', 'leka', 'lodz', 'kalisz', 'gniezno-krotoszyn',
].map((id) => LINES.find((l) => l.id === id))

/** Poznańska Kolej Metropolitalna — kolory linii z rozkładu. */
const PKM_LINES = [
  {
    id: 'pkm4', badge: 'PKM4', name: 'Wronki – Poznań Gł. – Środa Wlkp.', color: '#823D8C',
    path: ['wronki', 'szam', 'rokiet', 'poz', 'sroda'],
    stations: ['Wronki', 'Pęckowo', 'Szamotuły', 'Baborówko', 'Pamiątkowo', 'Rokietnica', 'Kiekrz', 'Poznań Wola', ...POZ_JAROCIN.slice(0, 8)],
  },
  {
    id: 'pkm5', badge: 'PKM5', name: 'Poznań Gł. – Rogoźno Wlkp.', color: '#E8B120',
    path: ['poz', 'obor', 'rogo'],
    stations: LINES.find((l) => l.id === 'pila').stations.slice(0, 15),
  },
  {
    id: 'pkm3', badge: 'PKM3', name: 'Grodzisk Wlkp. – Poznań Gł. – Wągrowiec', color: '#3F9236',
    path: ['grodzisk', 'steszew', 'lubon', 'poz', 'wsch', 'b_gol1', 'b_gol2', 'murg', 'b_gol3', 'wagr'],
    stations: [
      'Grodzisk Wielkopolski', 'Grąblewo', 'Ptaszkowo', 'Kotowo', 'Granowo', 'Strykowo Poznańskie', 'Stęszew', 'Trzebaw Rosnówko', 'Szreniawa', 'Wiry',
      ...[...POZ_LUBON].reverse(), ...POZ_WSCH.slice(1), 'Poznań Karolin', 'Czerwonak', 'Czerwonak Osiedle', 'Owińska', 'Bolechowo', 'Zielone Wzgórza',
      'Murowana Goślina', 'Przebędowo', 'Łopuchowo', 'Łopuchowo Osiedle', 'Sława Wielkopolska', 'Skoki', 'Roszkowo Wągrowieckie', 'Przysieczyn', 'Wągrowiec',
    ],
  },
  {
    id: 'pkm1', badge: 'PKM1', name: 'Kościan – Poznań Gł. – Gniezno', color: '#3A76C2',
    path: ['koscian', 'lubon', 'poz', 'wsch', 'b_gol1', 'b_mog', 'pobiedz', 'gniezno'],
    stations: [
      'Kościan', 'Oborzyska Stare', 'Czempiń', 'Iłowiec', 'Drużyna Poznańska', 'Mosina', 'Puszczykówko', 'Puszczykowo', ...[...POZ_LUBON].reverse(),
      ...POZ_WSCH.slice(1), 'Ligowiec', 'Kobylnica', 'Biskupice Wielkopolskie', 'Promno', 'Pobiedziska Letnisko', 'Pobiedziska', 'Lednogóra', 'Fałkowo',
      'Pierzyska', 'Gniezno',
    ],
  },
  {
    id: 'pkm2', badge: 'PKM2', name: 'Nowy Tomyśl – Poznań Gł. – Września', color: '#EA1A35',
    path: ['nt', 'b_zb1', 'buk', 'poz', 'wsch', 'b_gol1', 'b_mog', 'wrzesnia'],
    stations: [
      'Nowy Tomyśl', 'Sątopy', 'Porażyn', 'Opalenica', 'Wojnowice Wielkopolskie', 'Buk', 'Otusz', 'Dopiewo', 'Palędzie', 'Poznań Junikowo', 'Poznań Górczyn',
      ...POZ_WSCH, 'Poznań Antoninek', 'Swarzędz', 'Paczkowo', 'Kostrzyn Wielkopolski', 'Gułtowy', 'Nekla', 'Podstolice', 'Września',
    ],
  },
]

/** Granica województwa wielkopolskiego (PRG) przekształcona na współrzędne schematu: rzeczywiste położenie każdej stacji z rozkładu
 *  trafia w jej miejsce na schemacie (funkcja sklejana cienkiej płyty), więc stacje leżą po tej samej stronie granicy co w terenie. */
const REGION =
  'M440 -24 L446 -31 L453 -32 L453 -27 L450 -23 L450 -20 L453 -17 L453 -12 L457 -5 L456 -1 L457 4 L456 7 L460 8 L463 6 L468 8 L468 13 L465 15 L468 19 L472 21 L480 20 L487 13 L503 20 L505 19 L522 20 L527 18 L530 19 L533 23 L536 23 L534 27 L538 27 L538 31 L543 34 L546 32 L551 33 L552 34 L548 42 L539 48 L534 54 L524 59 L523 66 L520 69 L509 74 L510 78 L514 81 L526 86 L528 85 L532 92 L532 95 L537 99 L539 105 L541 107 L545 106 L548 111 L544 116 L545 118 L541 121 L541 124 L538 126 L529 127 L519 130 L518 132 L522 136 L519 142 L518 146 L521 148 L518 151 L532 153 L530 157 L522 159 L524 163 L523 172 L517 176 L514 176 L517 185 L519 187 L520 194 L515 195 L513 202 L518 203 L519 208 L533 205 L539 201 L544 202 L556 203 L563 200 L565 202 L569 200 L567 203 L569 206 L570 211 L568 213 L567 216 L542 241 L571 214 L565 221 L571 217 L568 227 L578 216 L575 216 L579 212 L581 211 L581 213 L582 214 L585 210 L587 211 L590 215 L595 216 L598 224 L596 232 L599 236 L604 239 L604 243 L607 244 L610 248 L613 246 L613 260 L615 261 L615 255 L620 257 L627 267 L628 263 L635 265 L638 273 L635 275 L635 281 L639 286 L642 286 L643 291 L646 294 L650 293 L661 301 L661 309 L666 312 L672 312 L676 316 L682 309 L693 302 L692 295 L694 293 L703 301 L702 313 L705 323 L705 326 L714 331 L714 328 L724 332 L723 325 L725 325 L729 321 L737 325 L743 333 L745 333 L749 342 L754 344 L756 344 L758 347 L768 351 L772 363 L776 363 L779 372 L785 372 L791 380 L792 382 L797 387 L800 396 L805 396 L806 393 L811 390 L816 393 L820 391 L822 387 L830 386 L829 381 L833 381 L830 374 L835 377 L838 382 L842 382 L844 387 L842 388 L851 392 L850 395 L855 398 L859 398 L859 403 L857 403 L858 409 L860 410 L859 418 L861 417 L869 418 L869 420 L870 427 L867 428 L870 438 L869 440 L865 436 L860 435 L851 437 L850 440 L846 439 L845 443 L846 455 L848 459 L852 462 L853 461 L855 464 L855 468 L853 469 L854 477 L848 476 L845 473 L841 476 L842 479 L841 481 L838 480 L835 482 L831 480 L828 476 L825 481 L829 494 L835 505 L833 508 L837 514 L838 518 L836 518 L838 522 L839 520 L842 530 L846 532 L845 543 L845 554 L842 557 L844 562 L844 572 L839 573 L838 571 L837 573 L835 572 L832 569 L827 573 L825 579 L822 577 L821 573 L817 577 L818 589 L816 588 L815 590 L817 599 L817 601 L813 605 L817 611 L815 619 L816 621 L813 626 L812 633 L804 643 L800 650 L803 650 L799 656 L796 658 L796 661 L790 668 L794 666 L781 688 L780 691 L780 694 L774 710 L769 716 L759 734 L754 740 L750 738 L744 738 L741 734 L731 742 L734 744 L733 748 L728 758 L722 765 L715 765 L711 771 L708 779 L705 781 L700 780 L693 786 L697 789 L695 797 L697 804 L693 818 L691 821 L692 823 L689 828 L688 833 L693 827 L694 830 L696 830 L698 824 L701 825 L695 842 L695 844 L693 853 L688 859 L684 870 L686 870 L680 880 L672 884 L666 891 L664 891 L663 887 L658 896 L648 905 L621 916 L616 915 L612 918 L607 920 L603 915 L593 914 L594 906 L601 902 L612 887 L613 879 L610 877 L605 880 L597 877 L594 870 L596 861 L595 858 L597 852 L605 838 L611 833 L610 829 L613 827 L609 824 L612 818 L608 817 L608 815 L603 816 L603 814 L607 811 L611 806 L615 805 L619 800 L623 799 L626 796 L625 794 L619 793 L616 795 L615 799 L609 803 L601 799 L597 802 L592 799 L586 801 L583 800 L577 805 L564 807 L559 805 L555 802 L562 797 L562 794 L555 787 L559 785 L557 782 L560 779 L559 773 L564 769 L578 769 L587 765 L591 757 L593 749 L589 747 L590 740 L577 738 L578 731 L568 725 L563 721 L543 714 L528 705 L496 678 L454 656 L442 658 L430 656 L426 668 L429 677 L426 682 L427 693 L415 688 L406 690 L385 688 L379 681 L359 685 L360 692 L355 693 L350 690 L339 692 L333 694 L323 694 L322 697 L315 698 L313 693 L303 695 L299 693 L294 683 L291 683 L278 687 L272 692 L268 693 L267 690 L263 691 L266 685 L261 686 L263 682 L271 673 L248 688 L251 684 L245 687 L246 684 L251 675 L260 668 L267 659 L264 657 L264 652 L268 642 L272 635 L271 632 L266 636 L263 637 L261 636 L265 627 L259 634 L262 627 L251 636 L246 638 L241 643 L238 642 L241 633 L240 625 L242 614 L239 614 L241 609 L234 597 L237 590 L231 588 L223 583 L221 587 L216 585 L212 601 L209 606 L206 605 L202 597 L196 599 L187 593 L173 594 L173 590 L181 576 L176 573 L177 566 L174 562 L179 560 L177 550 L171 542 L163 541 L140 553 L111 555 L104 549 L87 550 L77 543 L73 537 L88 534 L83 529 L90 527 L78 526 L77 524 L67 523 L66 522 L56 522 L47 528 L40 527 L34 525 L29 526 L27 522 L26 519 L51 513 L77 504 L68 501 L76 499 L90 491 L91 484 L109 478 L115 468 L118 458 L131 452 L137 447 L131 437 L132 429 L124 418 L123 412 L118 402 L118 396 L116 390 L118 382 L116 376 L109 377 L107 375 L102 376 L97 369 L94 366 L91 360 L98 355 L99 357 L98 361 L102 362 L110 356 L110 354 L114 350 L114 334 L112 328 L107 324 L115 317 L112 312 L111 313 L114 308 L110 303 L110 300 L116 294 L111 294 L117 287 L126 284 L128 281 L129 273 L139 273 L157 269 L168 265 L171 261 L172 250 L174 249 L175 244 L168 242 L166 239 L169 230 L173 228 L174 232 L180 227 L179 222 L182 222 L184 220 L184 208 L180 199 L181 192 L178 180 L174 169 L172 159 L171 147 L172 130 L178 129 L180 127 L182 128 L182 131 L184 131 L197 116 L211 110 L217 110 L219 113 L225 113 L232 111 L255 107 L258 99 L263 100 L270 98 L276 99 L282 95 L282 93 L285 92 L290 98 L294 97 L297 99 L301 97 L308 98 L309 100 L313 102 L314 100 L320 98 L325 93 L326 91 L330 91 L334 89 L339 90 L342 93 L341 96 L343 100 L350 98 L351 94 L348 93 L355 86 L360 82 L363 82 L367 80 L376 80 L371 75 L371 71 L367 69 L362 58 L355 57 L352 52 L349 52 L344 43 L342 45 L337 38 L332 36 L333 33 L332 30 L331 14 L330 11 L337 4 L344 11 L354 11 L366 14 L367 12 L380 15 L396 7 L399 8 L402 5 L404 -1 L406 -4 L407 -8 L410 -7 L412 -10 L412 -13 L419 -24 L419 -26 L433 -26 L434 -30 L437 -30 L439 -24Z'


return {NODES,LINES,LEGEND,PKM_LINES,REGION}})();
/* geometria z web/src/utils/scheme.ts: równoległe tory na wspólnych odcinkach, zaokrąglone załamania, znaczniki stacji */
const GAP=6;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),unit=v=>{const len=Math.hypot(v.x,v.y)||1;return{x:v.x/len,y:v.y/len}};
const edgeKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
const canonicalDir=(a,b)=>{const d=unit(sub(b,a));return d.x>1e-9||(Math.abs(d.x)<=1e-9&&d.y>0)?d:{x:-d.x,y:-d.y}};
const parallel=(a,b)=>Math.abs(a.x*b.y-a.y*b.x)<1e-6;
function edgeOffsets(lines,nodes){const dir=key=>{const[a,b]=key.split('|');return canonicalDir(nodes[a],nodes[b])};
 const loads=new Map(),parent=new Map(),find=k=>{const p=parent.get(k)??k;if(p===k)return k;const r=find(p);parent.set(k,r);return r};
 for(const line of lines)for(let i=1;i<line.path.length;i++){const key=edgeKey(line.path[i-1],line.path[i]),list=loads.get(key)??[];
  if(!list.includes(line.id))list.push(line.id);loads.set(key,list);
  if(i>1){const prev=edgeKey(line.path[i-2],line.path[i-1]);if(parallel(dir(prev),dir(key)))parent.set(find(prev),find(key))}}
 const chains=new Map();for(const key of loads.keys())chains.set(find(key),[...(chains.get(find(key))??[]),key]);
 const out=new Map();
 for(const keys of chains.values()){const ids=lines.map(l=>l.id).filter(id=>keys.some(k=>loads.get(k).includes(id)));
  const cover=ids.map(id=>keys.filter(k=>loads.get(k).includes(id)).length),mx=Math.max(...cover);
  const longest=ids.map((_,i)=>i).filter(i=>cover[i]===mx),zero=longest.reduce((s,i)=>s+i,0)/longest.length;
  for(const k of keys)out.set(k,new Map(loads.get(k).map(id=>[id,(ids.indexOf(id)-zero)*GAP])))}
 return out}
function linePoints(line,offsets,nodes){const pts=line.path.map(id=>nodes[id]);
 const segs=pts.slice(1).map((b,i)=>{const a=pts[i],off=offsets.get(edgeKey(line.path[i],line.path[i+1]))?.get(line.id)??0,d=canonicalDir(a,b),n={x:-d.y,y:d.x};
  return{a:{x:a.x+n.x*off,y:a.y+n.y*off},b:{x:b.x+n.x*off,y:b.y+n.y*off},d:unit(sub(b,a))}});
 const out=[segs[0].a];
 for(let i=1;i<segs.length;i++){const p=segs[i-1],q=segs[i],stop=!!nodes[line.path[i]].name,cross=p.d.x*q.d.y-p.d.y*q.d.x;
  if(Math.abs(cross)<1e-6){out.push({...p.b,stop});if(Math.hypot(p.b.x-q.a.x,p.b.y-q.a.y)>.01)out.push({...q.a,stop});continue}
  const t=((q.a.x-p.a.x)*q.d.y-(q.a.y-p.a.y)*q.d.x)/cross;out.push({x:p.a.x+p.d.x*t,y:p.a.y+p.d.y*t,stop})}
 out.push(segs[segs.length-1].b);return out}
const r1=n=>Math.round(n*10)/10;
function roundedPath(pts,radius=16,stopRadius=5){if(pts.length<2)return'';let d=`M${r1(pts[0].x)} ${r1(pts[0].y)}`;
 for(let i=1;i<pts.length-1;i++){const prev=pts[i-1],cur=pts[i],next=pts[i+1],r=Math.min(cur.stop?stopRadius:radius,Math.hypot(cur.x-prev.x,cur.y-prev.y)/2,Math.hypot(next.x-cur.x,next.y-cur.y)/2),a=unit(sub(cur,prev)),b=unit(sub(next,cur));
  d+=` L${r1(cur.x-a.x*r)} ${r1(cur.y-a.y*r)} Q${r1(cur.x)} ${r1(cur.y)} ${r1(cur.x+b.x*r)} ${r1(cur.y+b.y*r)}`}
 const last=pts[pts.length-1];return`${d} L${r1(last.x)} ${r1(last.y)}`}
function stationMarkers(lines,offsets,nodes){const ends=new Set(lines.flatMap(l=>[l.path[0],l.path.at(-1)])),used=new Set(lines.flatMap(l=>l.path));
 return Object.entries(nodes).filter(([id,n])=>n.name&&used.has(id)).map(([id,n])=>{let best=null;
  for(const[key,map]of offsets){const[a,b]=key.split('|');if((a!==id&&b!==id)||(best&&map.size<=best.offs.length))continue;best={offs:[...map.values()],d:canonicalDir(nodes[a],nodes[b])}}
  const offs=best?.offs??[0],d=best?.d??{x:1,y:0},lo=Math.min(...offs),hi=Math.max(...offs),mid=(lo+hi)/2;
  return{id,x:n.x-d.y*mid,y:n.y+d.x*mid,span:hi-lo,angle:Math.atan2(d.y,d.x)*180/Math.PI+90,terminal:ends.has(id)}})}
/* ---------- schemat połączeń ---------- */
const SCHID={PKM1:'pkm1',KWK:'kutno',KWL:'rawicz'}; // linie z rozkładu makiety → linie schematu
const ciemny=()=>S.theme==='dark'||(S.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);
let SCHM=null;
function schDane(){
 if(R.id==='wlkp'){const pkm=S.sch.set==='pkm';return{nodes:SCH.NODES,lista:pkm?SCH.PKM_LINES:SCH.LEGEND,draw:pkm?SCH.PKM_LINES:SCH.LINES,region:SCH.REGION,vb:[40,60,960,880],ref:SCH.NODES.poz}}
 if(!SCHM){const nodes={};for(const[n,[x,y,m]]of Object.entries(R.pos))nodes[n]={x,y,name:n,label:R.etyk(n),at:{L:'l',l:'l',r:'r',t:'t',b:'b'}[m],major:R.wazne.includes(n)};
  const lines=R.lines.filter(l=>l.ag==='KML').map(l=>({id:l.id,badge:l.badge,name:R.etyk(l.stops[0][0])+' – '+R.etyk(l.stops.at(-1)[0]),color:l.color,path:l.stops.map(s=>s[0]),stations:l.stops.map(s=>s[0])}));
  SCHM={nodes,lista:lines,draw:lines,region:null,vb:[140,40,680,500],ref:nodes['Kraków Główny']}}
 return SCHM}
const kLinii=l=>KOM().filter(n=>(n.do==null||n.do>=0)&&(n.lines.some(i=>(SCHID[i]||i)===l.id)||n.st.filter(s=>l.stations.includes(s)).length>=2)).sort((a,b)=>waga(a)-waga(b));
function rSchemat(){const el=$('#v-schemat'),D=schDane(),c=S.sch,dark=ciemny(),col=l=>dark&&l.dark?l.dark:l.color,klucz=R.id+c.set;
 if(el.dataset.k!==klucz){el.dataset.k=klucz;
  el.innerHTML=`<div class="wiersz rozsun zawin"><h1>Schemat połączeń</h1><div class="na-papierze" id="sch-seg"></div></div>
  <p class="dr" style="max-width:62ch">${R.id==='wlkp'?'Linie Kolei Wielkopolskich. Wspólne odcinki są narysowane obok siebie, kolor linii jest taki jak w pociągu i na mapie.':'Linie Kolei Małopolskich. Ten schemat jest przykładowy.'}</p>
  <div class="sch-gl"><div class="kol" style="gap:8px"><div class="mapa-okno sch-okno" id="sch-okno"></div><p class="dr maly">Wybierz linię albo stację. Schemat pokazuje układ linii, a nie dokładne położenie stacji.</p></div><div class="sch-panel kol" id="sch-panel" style="gap:12px"></div></div>`}
 $('#sch-seg').innerHTML=R.id==='wlkp'?`<div class="seg">${[['reg','Linie regionalne'],['pkm','PKM']].map(([k,t])=>`<button data-a="sch-set" data-k="${k}" aria-pressed="${c.set===k}">${t}</button>`).join('')}</div>`:'';
 const selL=c.linia&&D.draw.find(l=>l.id===c.linia),selS=c.stacja,aktywna=l=>(!selL&&!selS)||l===selL||(!selL&&l.stations.includes(selS));
 const off=edgeOffsets(D.draw,D.nodes),paths=D.draw.map(l=>({l,d:roundedPath(linePoints(l,off,D.nodes))}));
 let g=D.region?`<path d="${D.region}" fill="var(--papier)" stroke="var(--kreska)" stroke-width="1.500"/>`:'';
 g+=paths.map(({l,d})=>`<path d="${d}" fill="none" stroke="${col(l)}" stroke-width="${l===selL?7:5}" stroke-linecap="round" stroke-linejoin="round" opacity="${aktywna(l)?1:.15}"/>`).join('');
 g+=paths.map(({l,d})=>`<path d="${d}" class="sch-hit" data-a="sch-linia" data-k="${l.id}" role="button" tabindex="0" aria-label="Linia ${l.badge?l.badge+' ':''}${l.name}"/>`).join('');
 const POS_={l:[-1,0,'end'],r:[1,0,'start'],t:[0,-1,'middle'],b:[0,1,'middle'],tl:[-1,-1,'end'],tr:[1,-1,'start'],bl:[-1,1,'end'],br:[1,1,'start']};
 for(const m of stationMarkers(D.draw,off,D.nodes)){const n=D.nodes[m.id],w=m.span+10,sel=selS===n.name,act=sel||(selL?selL.path.includes(m.id):!selS||D.draw.some(l=>l.path.includes(m.id)&&l.stations.includes(selS)));
  const A=POS_[n.at||'r'],ls=(n.label||n.name).split('\n'),e=m.span/2+9,tx=r1(m.x+A[0]*e),ty=r1(A[1]<0?m.y-e-(ls.length-1)*13:A[1]>0?m.y+e+10:m.y+4-(ls.length-1)*6.5);
  g+=`<g opacity="${act?1:.3}"><rect x="${-w/2}" y="-5" width="${w}" height="10" rx="5" transform="translate(${r1(m.x)},${r1(m.y)}) rotate(${r1(m.angle)})" fill="${sel?'var(--tusz)':'var(--papier)'}" stroke="var(--tusz)" stroke-width="${n.major?2.5:1.8}"/>
   <text x="${tx}" y="${ty}" text-anchor="${A[2]}" class="${n.major||sel?'wazna':''}">${ls.map((t,i)=>`<tspan x="${tx}" dy="${i?13:0}">${t}</tspan>`).join('')}</text>
   <circle class="st-hit" cx="${r1(m.x)}" cy="${r1(m.y)}" r="${Math.max(13,w/2+4)}" data-a="sch-stacja" data-s="${n.name}" tabindex="0" role="button" aria-label="Stacja ${n.name}"/></g>`}
 const ok=$('#sch-okno'),pierwszy=!ok.firstChild,[vx,vy,vw,vh]=D.vb;
 ok.innerHTML=`<svg viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="Schemat linii">${g}</svg>`;
 if(pierwszy)ok.scrollLeft=Math.max(0,(D.ref.x-vx)/vw*ok.scrollWidth-ok.clientWidth/2);
 const wroc=`<button class="tekstowy" style="color:var(--tusz);align-self:flex-start;padding:0" data-a="sch-wroc">${ic('wroc',18)}Wszystkie linie</button>`;
 const major=new Set(Object.values(D.nodes).filter(n=>n.major).map(n=>n.name));
 let p;
 if(selL){const st=selL.stations,k=kLinii(selL);
  p=`${wroc}<div><span class="lin" style="--c:${col(selL)}">${selL.badge||'Linia'}</span><h2 style="font-size:24px;line-height:1.2;text-wrap:balance">${selL.name}</h2><p class="dr maly">${pl(st.length,'stacja','stacje','stacji')}</p></div>
  ${k.map(kpas).join('')}${selL.note?`<section class="plyta"><p style="font-size:14px">${selL.note}</p></section>`:''}
  <section class="plyta">${st.map((s,i)=>{const inne=D.lista.filter(l=>l!==selL&&l.stations.includes(s));
   return `<div class="os bez-czasu ${i===0?'p ':''}${i===st.length-1?'k ':''}${i===0||i===st.length-1||major.has(s)?'gl':''}" style="--c:${col(selL)}"><div class="sz"><i></i></div><div class="n"><button class="sch-st" data-a="sch-stacja" data-s="${s}">${krotko(s)}</button>${inne.length?`<span class="kropki" aria-label="Przesiadka na ${pl(inne.length,'linię','linie','linii')}">${inne.map(l=>`<i style="--c:${col(l)}"></i>`).join('')}</span>`:''}</div></div>`}).join('')}</section>`}
 else if(selS){const ls=D.lista.filter(l=>l.stations.includes(selS)),k=oStacji(selS);
  p=`${wroc}<div><h2 style="font-size:24px">${krotko(selS)}</h2><p class="dr maly">${ls.length?pl(ls.length,'linia','linie','linii'):'Żadna linia z tego widoku nie zatrzymuje się na tej stacji.'}</p></div>
  ${k.map(kpas).join('')}
  ${ls.length?`<section class="plyta" style="padding:6px">${ls.map(l=>`<button class="sch-wiersz" data-a="sch-linia" data-k="${l.id}"><span class="lin" style="--c:${col(l)}">${l.badge||''}</span><span class="nz">${l.name}</span>${ic('strz',16)}</button>`).join('')}</section>`:''}
  ${STATIONS.includes(selS)?`<div class="strony"><button class="drugi" data-a="stacja" data-s="${selS}">Tablica odjazdów</button><button class="drugi" data-a="stad" data-s="${selS}">Połączenie stąd</button></div>`:''}
  ${btkPodp([selS])}`}
 else p=`<h2>${R.id==='wlkp'&&c.set==='pkm'?'Linie PKM':'Linie'}</h2><section class="plyta" style="padding:6px">${D.lista.map(l=>{const k=kLinii(l).filter(n=>trwa(n)&&n.sev!=='info');
  return `<button class="sch-wiersz" data-a="sch-linia" data-k="${l.id}"><span class="lin" style="--c:${col(l)}">${l.badge||''}</span><span class="nz">${l.name}</span>${k.length?`<span aria-label="${cap(RODZ[k[0].sev])}">${kzn(k[0],1)}</span>`:''}${ic('strz',16)}</button>`}).join('')}</section>`;
 $('#sch-panel').innerHTML=p}
const schPanel=el=>{if(el.closest('svg')&&matchMedia('(max-width:919px)').matches)$('#sch-panel').scrollIntoView({behavior:'smooth',block:'start'})};

/* ---------- O nas: poranek pasażera zamiast listy funkcji ---------- */
function rONas(){const W=R.id==='wlkp',a=bkrotko(R.hub),b=bkrotko(R.cel);
 const kroki=[
  ['07:10','Sprawdzasz, czy wszystko jedzie',`„Moje trasy” pokazują najbliższe połączenia ${a} – ${b} razem z opóźnieniami.`,'moje','Moje trasy'],
  ['07:14','Telefon daje znać',`Gdy pociąg się spóźnia albo jest odwołany, dostajesz powiadomienie. Nie musisz sprawdzać co chwilę.`,'',''],
  ['07:22','Wychodzisz z domu','Podajesz, ile idziesz na stację, a my pokazujemy, o której wyjść. Nie tylko, o której odjeżdża pociąg.','szukaj','Wyszukiwarka'],
  ['07:27','Jesteś na stacji','Tablica pokazuje peron, tor i opóźnienie każdego pociągu. Utrudnienia widać od razu przy pociągu.','stacje','Tablica'],
  ['07:30','Jedziesz','Na mapie widzisz, gdzie jest pociąg i ile zostało do następnej stacji.','mapa','Mapa'],
  ['08:19','Jesteś na miejscu','Jutro rano zrobisz to samo, tylko szybciej.','','']];
 const zr=[
  ['Rozkład jazdy',`Dane GTFS <a href="https://mkuran.pl/gtfs/" target="_blank" rel="noopener">Mikołaja Kuranowskiego</a> na podstawie danych PKP Polskich Linii Kolejowych, aktualizowane codziennie w nocy. Obejmują ${W?'Koleje Wielkopolskie':'Koleje Małopolskie'} oraz pociągi POLREGIO i PKP Intercity na stacjach w województwie.`],
  ['Opóźnienia','Z systemu PKP PLK, odświeżane co około 2 minuty. Gdy źródło nie odpowiada, pokazujemy sam rozkład.'],
  ['Punktualność','Liczymy ją z tych samych opóźnień: odsetek kursów, które dojechały na stację końcową z opóźnieniem do 5 min.'],
  ['Położenie pociągów',W?'Wyliczamy je z rozkładu i opóźnień wzdłuż trasy, więc to szacunek, a nie GPS.':'Pociągi Kolei Małopolskich nadają pozycję GPS. Pozostałe położenia wyliczamy z rozkładu i opóźnień.'],
  ...(W?[['Rodzaj pojazdu','Z rozkładu GTFS Kolei Wielkopolskich, udostępnianego jako informacja publiczna. Przewoźnik może podstawić inny pojazd.'],['Bilet Bus-Tramwaj-Kolej','Ceny i strefy ze stron Kolei Wielkopolskich i POLREGIO.']]
   :[['GPS Kolei Małopolskich','Koleje Małopolskie sp. z o.o., <a href="https://gtfs.kolejemalopolskie.com.pl/" target="_blank" rel="noopener">otwarte dane GTFS</a>. Łączymy je z opóźnieniami PKP PLK. To nasze opracowanie, a nie oficjalna informacja przewoźnika.']]),
  ['Mapa','Podkład <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> i OpenMapTiles, dane © autorzy <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.']];
 const pryw=[
  ['Tylko na Twoim telefonie',['ulubione stacje','obserwowane trasy i podróże','ostatnie wyszukiwanie i jego opcje','region, motyw i ustawienia'],'Usuniesz je, czyszcząc dane tej strony w przeglądarce.'],
  ['Na naszym serwerze, na krótko',['adres powiadomień i pociągi podróży, do końca podróży','stacje i godziny trasy z powiadomieniami, do ich wyłączenia albo 90 dni bez wizyty','skrót adresu IP do ochrony przed nadużyciami, przez dobę'],'Powiadomienia dostarcza usługa producenta przeglądarki (Google, Mozilla, Apple, Microsoft).'],
  ['Nigdzie',['konta i hasła','reklamy','statystyki odwiedzin','ciasteczka'],'Ciasteczko zapisuje tylko panel administratora. Lokalizacji używamy tylko po kliknięciu „Najbliższa stacja”, a najbliższą stację wylicza Twoja przeglądarka.']];
 $('#v-onas').innerHTML=`
 <section class="onas-hero kol" style="gap:14px"><p class="dr maly" style="font-weight:600">O nas</p>
  <h1>Zanim wyjdziesz z domu, już wiesz, jak pojedziesz.</h1>
  <p class="dr" style="font-size:17px;max-width:52ch">zanimwyjdziesz.pl to nieoficjalny serwis dla pasażerów kolei w Wielkopolsce i Małopolsce. Bez reklam i bez konta.</p></section>
 <section class="onas-sek"><div class="kol" style="gap:6px"><h2>Jeden poranek</h2><p class="dr">Tak wygląda zwykły dojazd ${a} – ${b} z zanimwyjdziesz.pl.</p></div>
  <div class="plyta dzien">${kroki.map(([t,h,o,v,l])=>`<div class="wpis"><time>${t}</time><div class="sz"><i></i></div><div class="kol" style="gap:2px"><b>${h}</b><p>${o}</p>${v?`<a class="tekstowy" style="padding:0;height:36px;align-self:flex-start" href="#${v}">${l} ${ic('strz',16)}</a>`:''}</div></div>`).join('')}</div></section>
 <section class="onas-sek"><div class="kol" style="gap:6px"><h2>Co wiemy o Tobie</h2><p class="dr">Najmniej, jak się da.</p></div>
  <div class="kol" style="gap:12px"><div class="pryw">${pryw.map(([h,l,o],i)=>`<section class="plyta kol" style="gap:10px"><b>${h}</b><ul class="${i===2?'nie':''}">${l.map(x=>`<li>${x}</li>`).join('')}</ul><p class="dr maly">${o}</p></section>`).join('')}</div>
  <p class="dr maly" style="max-width:62ch">Podkład mapy pobieramy z OpenFreeMap, więc ta usługa widzi Twój adres IP. Hosting może zapisywać standardowe logi serwera.</p></div></section>
 <section class="onas-sek"><div class="kol" style="gap:6px"><h2>Skąd mamy dane</h2><p class="dr">Z otwartych źródeł. Nie jesteśmy przewoźnikiem, więc w razie wątpliwości rozstrzyga informacja na stacji.</p></div>
  <dl class="zr">${zr.map(([t,o])=>`<div><dt>${t}</dt><dd>${o}</dd></div>`).join('')}</dl></section>
 <section class="blok kol" style="gap:14px"><h2 style="font-size:24px">Wesprzyj nas</h2><p>Wesprzyj nas na buycoffee.to/zanimwyjdziesz. Za każde wsparcie dziękujemy!</p>
  <a class="glowny" style="text-decoration:none;max-width:280px" href="https://buycoffee.to/zanimwyjdziesz" target="_blank" rel="noopener">Postaw kawę</a></section>`}

/* ---------- arkusze ---------- */
let AZ=0;
function blokada(){const okno=$('#ark').firstChild&&!$('.tlo-ark.zamyka')&&!$('.tlo-ark.boczny'),detal=$('#detal').classList.contains('otwarty')&&!desk();
 document.documentElement.classList.toggle('zablokuj',!!(okno||detal))}
new MutationObserver(blokada).observe($('#ark'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
new MutationObserver(blokada).observe($('#detal'),{attributes:true,attributeFilter:['class']});
addEventListener('resize',blokada);
function ark(html){if(!html)ARK=null;clearTimeout(AZ);const box=$('#ark');
 if(!html&&box.firstChild&&!matchMedia('(prefers-reduced-motion:reduce)').matches){box.firstChild.classList.add('zamyka');AZ=setTimeout(()=>box.innerHTML='',170);return}
 if(html&&box.firstChild){box.querySelector('.ark').innerHTML=html;box.firstChild.classList.remove('zamyka');return} // zmiana treści otwartego okna bez ponownego wjazdu
 $('#ark').innerHTML=html?`<div class="tlo-ark${view==='mapa'?' boczny':''}" data-a="ark-tlo"><div class="ark" role="dialog" aria-modal="true">${html}</div></div>`:''}
const zamk=`<button class="kolo" data-a="ark-zamknij" aria-label="Zamknij">${ic('zamknij')}</button>`;
function arkPociag(id){S.mapSel=id;const t=kurs(id);
 if(!t){ark(`<div class="wiersz rozsun"><h2 style="font-size:24px">Pociąg</h2>${zamk}</div><p class="pusto">${t===null?'Nie udało się pobrać danych pociągu.':'Wczytujemy dane pociągu…'}</p>`);ARK={f:arkPociag,a:id,czeka:true};return}
 const nw=now(),d=delay(t),L=t.st.length-1,c=t.l.color,tm=k=>t.st[k].t+(t.st[k].d??d),ni=t.st.findIndex((s,k)=>tm(k)>=nw),przed=nw<tm(0),po=ni<0,dz=dzien(t.dep);
 const post=po?100:przed?0:Math.max(2,Math.min(98,Math.round((nw-tm(0))/Math.max(1,tm(L)-tm(0))*100)));
 const m=przed?tm(0)-nw:po?0:tm(ni)-nw,p0=peron(t,0).p;
 const gl=t.odw?'Pociąg odwołany':przed?'Odjazd '+(dz?etykDnia(dz).toLowerCase()+' ':'')+'o '+hm(tm(0)):po?'Pociąg dojechał do stacji końcowej':'Następna stacja: '+krotko(t.st[ni].n);
 const sub=t.odw?'Wybierz inne połączenie.':przed?(wKole(m)||dz?'':zaIle(m)+' · ')+krotko(t.st[0].n)+(p0?', peron '+p0:''):po?'Przyjazd o '+hm(tm(L)):'Przyjazd o '+hm(tm(ni))+(wKole(m)?'':', '+zaIle(m));
 const row=k=>wierszPostoju(t,k,{c,cls:(k===0?'p ':'')+(k===L?'k ':'')+(k===0||k===L||(k===ni&&!przed)?'gl':''),dodatek:k===ni&&!przed?'<span class="znak neutr">następna</span>':''});
 let os='';
 if(!po&&ni>1){os+=`<div class="os" style="--c:${c}"><span></span><div class="sz"></div><button class="chip" style="justify-self:start;height:36px" data-a="rozwin" aria-expanded="false">${pl(ni,'stacja','stacje','stacji')} za pociągiem ${ic('dol',14)}</button></div><div hidden>${t.st.slice(0,ni).map((s,k)=>row(k)).join('')}</div>`;for(let k=ni;k<=L;k++)os+=row(k)}
 else for(let k=0;k<=L;k++)os+=row(k);
 const POJ={emu:'zespół elektryczny',dmu:'szynobus',steam:'parowóz',diesel:'lokomotywa spalinowa'},vt=t.vt;
 ark(`<section class="blok kol" style="gap:12px">
  <div class="wiersz rozsun" style="align-items:flex-start"><div style="min-width:0"><div class="wiersz zawin" style="gap:4px 10px"><span class="lin" style="--c:${t.l.color}"></span><span class="dr maly">${[t.l.linia,t.l.kto].filter(Boolean).join(' · ')}</span></div><h2 class="num" style="font-size:26px;line-height:1.2">${t.label}</h2>${t.l.nazwa?`<p class="nazwa-p">„${esc(t.l.nazwa)}”</p>`:''}</div>${zamk}</div>
  <div class="wiersz" style="gap:16px">${t.odw?'':tarcza(m)}<div style="min-width:0"><p class="num" style="font-weight:700;font-size:19px;line-height:1.25">${gl}</p><p class="dr">${sub}</p></div></div>
  <div><div class="bieg" style="--c:${c};--p:${post}%"><i></i></div>
  <div class="wiersz rozsun maly num" style="align-items:flex-start;margin-top:8px"><span><b>${hm(tm(0))}</b><br>${bkrotko(t.st[0].n)}</span><span style="text-align:right"><b>${hm(tm(L))}</b><br>${bkrotko(t.st[L].n)}</span></div></div>
  <div class="wiersz zawin" style="gap:6px"><span class="znak ${t.odw||d?'op':'ok'}">${t.odw?'odwołany':d?'opóźnienie '+d+' min':'na czas'}</span>${t.l.ag==='IC'?'<span class="znak neutr">osobny bilet</span>':''}</div>
 </section>
 <section class="plyta kol" style="gap:12px"><div class="fakty"><div><span>czas jazdy</span><b>${dur(t.arr-t.dep)}</b></div>${t.km?`<div><span>odległość</span><b>${t.km} km</b></div>`:''}<div><span>stacje</span><b>${L+1}</b></div>${vt?`<div><span>pojazd</span><b>${POJ[vt.kind]||'pociąg'}</b></div>`:''}</div>
  ${vt?.bikes||vt?.wheelchair?`<div class="wiersz zawin" style="gap:6px">${vt.bikes?'<span class="znak neutr">miejsca na rowery</span>':''}${vt.wheelchair?'<span class="znak neutr">miejsce na wózek</span>':''}</div>`:''}
  ${t.trimmed?`<p class="dr maly">${kropka(`Pociąg relacji ${krotko(esc(t.origin))} – ${krotko(esc(t.destination))}`)} Pokazujemy stacje w regionie.</p>`:''}${t.gps&&R.id==='mal'?'<p class="dr maly">Pozycja na żywo dzięki Kolejom Małopolskim.</p>':''}</section>
 ${KOM().filter(n=>trwa(n)&&oOdcinku(n,t,0,L)).sort((a,b)=>waga(a)-waga(b)).map(kpas).join('')}
 <section class="plyta">${os}</section>
 <div class="strony">${t.shape.length?`<button class="drugi" data-a="poc-mapa">${ic('mapa',18)}Pokaż na mapie</button>`:''}<button class="drugi" data-a="poc-link" data-n="${t.nums[0]||t.num}">${ic('udost',18)}Udostępnij</button></div>`);
 ARK={f:arkPociag,a:id}}
function arkStacja(n){const b=tablica(n,'dep',5);
 ark(`<div class="wiersz rozsun"><div style="min-width:0"><h2 style="font-size:24px">${krotko(n)}</h2><div class="wiersz zawin" style="gap:10px">${linesOf(n).map(lin).join('')}</div></div>${zamk}</div>
 ${oStacji(n).map(kpas).join('')}
 <div class="plyta" style="padding:8px">${tabl(b,'dep')}</div>
 <div class="strony"><button class="drugi" data-a="stacja" data-s="${n}">Pełna tablica</button><button class="drugi" data-a="stad" data-s="${n}">Połączenie stąd</button></div>`);
 ARK={f:arkStacja,a:n,czeka:b===undefined}}
/* wybór dnia i godziny: własny element systemu zamiast okna przeglądarki */
let P=null;
function arkKiedy(){if(!P){const t=S.when??now();P={day:S.day,h:Math.floor(t/60)%24,m:t%60,kier:S.kier}}
 const slup=(k,v,et)=>`<div class="slup"><button class="kolo" data-a="pk" data-k="${k}" data-d="1" aria-label="${et}: później">${ic('gora')}</button><b aria-live="polite">${pad(v)}</b><button class="kolo" data-a="pk" data-k="${k}" data-d="-1" aria-label="${et}: wcześniej">${ic('dol')}</button><span>${et.toLowerCase()}</span></div>`;
 ark(`<div class="wiersz rozsun"><h2 style="font-size:24px">Kiedy jedziesz?</h2>${zamk}</div>
 <div class="na-papierze"><div class="seg">${[['odj','Odjazd'],['prz','Przyjazd']].map(([k,t])=>`<button data-a="pk-kier" data-k="${k}" aria-pressed="${P.kier===k}">${t}</button>`).join('')}</div></div>
 <div class="kol" style="gap:6px"><b>Dzień</b><div class="dni na-papierze">${[0,1,2,3,4,5,6].map(o=>`<button class="chip" data-a="pk-dzien" data-d="${o}" aria-pressed="${P.day===o}">${etykDnia(o)}</button>`).join('')}</div><p class="dr maly">${pelnaData(P.day)}</p></div>
 <div class="kol" style="gap:6px"><b>Godzina</b><div class="zegar">${slup('h',P.h,'Godzina')}<span class="dw" aria-hidden="true">:</span>${slup('m',P.m,'Minuty')}</div></div>
 <div class="strony"><button class="drugi" data-a="pk-teraz">Teraz</button><button class="glowny" style="height:48px;font-size:15px" data-a="pk-ok">Pokaż połączenia</button></div>`)}
function rKomunikaty(){const f=S.kfiltr||'wsz';setTimeout(()=>anim($('.kom-gl>.kol'),f+(KR?1:0),'kom-lista'));
 const moje=n=>S.routes.some(r=>(nast(r)||[]).some(c=>c.legs.some(g=>oOdcinku(n,g.t,g.i,g.j))));
 const l=KOM().filter(n=>n.do==null||n.do>=0).filter(n=>f==='wsz'||(f==='utr'?n.sev!=='info':moje(n))).sort((a,b)=>waga(a)-waga(b)||a.od-b.od);
 const sel=desk()&&(l.find(n=>n.id===S.kSel)||l[0]);
 $('#v-komunikaty').innerHTML=`<h1>Komunikaty</h1>
 <div class="na-papierze"><div class="seg">${[['wsz','Wszystkie'],['utr','Utrudnienia'],['moje','Moje trasy']].map(([k,t])=>`<button data-a="kfiltr" data-k="${k}" aria-pressed="${f===k}">${t}</button>`).join('')}</div></div>
 <div class="kom-gl"><div class="kol" style="gap:8px">${l.length?l.map(n=>`<button class="kom" data-a="kom" data-id="${n.id}" aria-current="${!!sel&&sel.id===n.id}">${kzn(n)}<span><span class="t">${n.tyt}</span><span class="o">${n.tr.split('\n')[0]}</span>
  <span class="meta"><span>${RODZ[n.sev]}</span><span>${okres(n)}</span><span>${kStan(n)}</span>${n.lines.map(schLinia).filter(Boolean).map(l=>lin({badge:l.badge||l.name,color:l.color})).join('')}</span></span></button>`).join(''):`<div class="plyta pusto">${KR===undefined?'Wczytujemy komunikaty…':f==='moje'?'Na Twoich trasach nie ma teraz komunikatów.':f==='utr'?'Nie ma teraz utrudnień.':'Nie ma teraz komunikatów.'}</div>`}</div>${sel?`<aside class="kom-panel plyta kol" style="gap:14px">${komHtml(sel,'')}</aside>`:''}</div>`}
function komHtml(n,zam){
 const bl=n.tr.split('\n\n').map(b=>b.startsWith('- ')?`<ul>${b.split('\n').map(x=>`<li>${x.slice(2)}</li>`).join('')}</ul>`:`<p>${b}</p>`).join('');
 const ls=n.lines.map(schLinia).filter(Boolean),pc=n.poc;
 return `<div class="wiersz rozsun" style="align-items:flex-start"><div class="wiersz" style="gap:10px">${kzn(n)}<div><b>${cap(RODZ[n.sev])}</b><p class="dr maly">${okres(n)} · ${kStan(n)}</p></div></div>${zam}</div>
 <h2 style="font-size:22px;line-height:1.25;text-wrap:balance">${n.tyt}</h2>
 <div class="tresc">${bl}</div>
 ${ls.length||n.st.length||pc.length?`<section class="plyta kol" style="gap:12px"><b>Czego dotyczy</b>
  ${ls.length?`<div class="kol" style="gap:4px"><span class="dr maly">Linia</span>${ls.map(l=>`<button class="sch-wiersz" style="padding:6px 0;min-height:44px" data-a="sch-pokaz" data-k="${l.id}">${lin({badge:l.badge||'Linia',color:l.color})}<span class="nz maly">${l.name}</span><span class="dr maly">na schemacie</span>${ic('strz',16)}</button>`).join('')}</div>`:''}
  ${n.st.length?`<div class="kol" style="gap:4px"><span class="dr maly">${n.st.length===1?'Stacja':'Stacje'}</span><div class="wiersz zawin" style="gap:6px">${n.st.map(s=>`<button class="chip" style="height:40px" data-a="stacja" data-s="${s}">${bkrotko(s)}</button>`).join('')}</div></div>`:''}
  ${pc.length?`<div class="kol" style="gap:4px"><span class="dr maly">Pociągi</span><div class="wiersz zawin" style="gap:6px">${pc.map(p=>`<button class="chip" style="height:40px" data-a="poc-nr" data-n="${p}">${p}</button>`).join('')}</div></div>`:''}
 </section>`:'<p class="dr maly">Komunikat dotyczy wszystkich linii.</p>'}
 `}
function arkKomunikat(id){const n=KOM().find(x=>x.id===id);if(!n)return;if(view==='komunikaty'&&desk()){S.kSel=id;rKomunikaty();return}ark(komHtml(n,zamk))}
/* opcje wyszukiwania: jedno okno zamiast rzędu przełączników w formularzu */
let O=null;
function arkOpcje(){if(!O)O={bezp:S.bezp,minT:S.minT,bez:[...S.bez]};
 ark(`<div class="wiersz rozsun"><h2 style="font-size:24px">Opcje wyszukiwania</h2>${zamk}</div>
 <div class="kol" style="gap:6px"><b>Przesiadki</b><div class="wybor">${[[0,'Z przesiadkami','Także połączenia z jedną przesiadką'],[1,'Bez przesiadek','Tylko pociągi bezpośrednie']].map(([v,t,o])=>`<button data-a="op-przes" data-k="${v}" aria-pressed="${O.bezp===!!v}"><b>${t}</b><span>${o}</span></button>`).join('')}</div></div>
 <div class="kol na-papierze" style="gap:6px"><b>Najkrótszy czas na przesiadkę</b><div class="seg" style="align-self:flex-start">${[5,10,15].map(v=>`<button data-a="op-min" data-k="${v}" aria-pressed="${O.minT===v}" ${O.bezp?'disabled style="opacity:.4"':''}>${v} min</button>`).join('')}</div>${O.bezp?'<p class="dr maly">Nie dotyczy połączeń bez przesiadek.</p>':''}</div>
 <div class="kol" style="gap:6px"><b>Przewoźnicy</b><div class="plyta" style="padding:4px 16px">${agencje().map(([k,n])=>`<div class="przel-rz"><span><b>${n}</b>${k==='IC'?'<small>osobny bilet</small>':''}</span><button class="przel" role="switch" aria-checked="${!O.bez.includes(k)}" aria-label="${n}" data-a="op-ag" data-k="${k}"><i></i></button></div>`).join('')}</div></div>
 <div class="strony"><button class="drugi" data-a="op-reset">Przywróć domyślne</button><button class="glowny" style="height:48px;font-size:15px" data-a="op-ok">Pokaż połączenia</button></div>`)}

/* ---------- nawigacja i zdarzenia ---------- */
const VIEWS=[['szukaj','Szukaj'],['stacje','Stacje'],['mapa','Mapa'],['komunikaty','Komunikaty'],['moje','Moje'],['system','System'],['btk','Bilet BTK'],['schemat','Schemat'],['onas','O nas']];
let view='szukaj';
function go(v){location.hash=v;if(view===v)route()}
function route(){const h=location.hash.slice(1);if($('.tlo-ark.boczny'))ark(''); // panel z boku mapy nie przechodzi na inne widoki
 view=VIEWS.some(x=>x[0]===h)?h:'szukaj';
 VIEWS.forEach(([k])=>$('#v-'+k).hidden=k!==view);
 const a={system:'moje',btk:'moje',onas:'moje',schemat:'mapa'}[view]||view;
 $('#menu').innerHTML=VIEWS.slice(0,5).map(([k,t])=>`<a href="#${k}" ${k===(view==='system'?view:a)?'aria-current="page"':''}>${t}</a>`).join('');
 $('#dol').innerHTML=VIEWS.slice(0,5).map(([k,t])=>`<a href="#${k}" ${k===a?'aria-current="page"':''}><i>${ic(k)}</i>${t}</a>`).join('');
 $('#reg').innerHTML=R.nazwa+ic('dol',14);
 render();window.scrollTo(0,0);anim($('#v-'+view),view+Date.now())}
function render(){({szukaj:()=>{rWyjazd();rWyniki()},stacje:rStacje,mapa:rMapa,komunikaty:rKomunikaty,moje:rMoje,system:rSystem,btk:rBtk,schemat:rSchemat,onas:rONas})[view]()}
function motyw(){const r=document.documentElement;if(S.theme==='system')r.removeAttribute('data-theme');else r.dataset.theme=S.theme;
 const dark=S.theme==='dark'||(S.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);$('#motyw').innerHTML=ic(dark?'slonce':'ksiezyc');if(view==='schemat')rSchemat();else if(view==='mapa')rMapa()}
function formularz(){$('#skad').value=S.from;$('#dokad').value=S.to;
 const k=S.kier==='prz'?'Przyjazd':'Odjazd';
 $('#kiedy').innerHTML=ic('zegar',18)+(S.when==null&&!S.day?k+': teraz':k+': '+etykDnia(S.day).toLowerCase()+', '+hm(S.when??now()));
 const n=ileOpcji();$('#opcje').innerHTML=ic('opcje',18)+(n?'Opcje · '+n:'Opcje')}
function czytaj(){const va=$('#skad').value,vb=$('#dokad').value,a=resolve(va),b=resolve(vb);
 if(!a||!b){const zla=(!a?va:vb).trim();toast(zla?`Nie znaleźliśmy stacji „${zla}”. Wybierz stację z listy.`:'Wybierz stację z listy.');return false}
 S.from=a;S.to=b;formularz();return true}

document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,i=+el.dataset.i;
 if(a==='ark-tlo'){if(e.target===el){ark('');P=O=null}return}
 switch(a){
  case'motyw':{const dark=matchMedia('(prefers-color-scheme:dark)').matches;const cur=S.theme==='system'?(dark?'dark':'light'):S.theme;S.theme=cur==='dark'?'light':'dark';save();motyw();if(view==='moje')rMoje();break}
  case'region':zmienRegion(el.dataset.k);break;
  case'region-zmien':zmienRegion(S.region==='wlkp'?'mal':'wlkp');break;
  case'font':S.font=el.dataset.k;save();pismo();rSystem();break;
  case'motyw-ust':S.theme=el.dataset.k;save();motyw();rMoje();break;
  case'zamien':{const x=$('#skad').value;$('#skad').value=$('#dokad').value;$('#dokad').value=x;if(czytaj())szukaj();break}
  case'kiedy':P=null;arkKiedy();break;
  case'pk':{const d=+el.dataset.d;if(el.dataset.k==='h')P.h=(P.h+d+24)%24;else P.m=((Math.round(P.m/5)+d)*5+60)%60;arkKiedy();break}
  case'pk-dzien':P.day=+el.dataset.d;arkKiedy();break;
  case'pk-kier':P.kier=el.dataset.k;arkKiedy();break;
  case'pk-teraz':S.when=null;S.day=0;S.kier='odj';P=null;ark('');formularz();if(view==='szukaj'&&czytaj())szukaj();break;
  case'pk-ok':S.when=P.h*60+P.m;S.day=P.day;S.kier=P.kier;P=null;ark('');formularz();if(view!=='szukaj'){szukaj();go('szukaj')}else if(czytaj())szukaj();break;
  case'btk':S.btk.st=el.dataset.s;S.btk.extra=false;ark('');$('#detal').classList.remove('otwarty');go('btk');break;
  case'btk-ztm':S.btk.ztm=el.dataset.k;rBtk();break;
  case'btk-ulga':S.btk.ulga=+el.dataset.k;rBtk();break;
  case'btk-tab':S.btk.tab=+el.dataset.k;rBtk();break;
  case'btk-extra':S.btk.extra=!S.btk.extra;rBtk();break;
  case'btk-sek':S.btk.open=S.btk.open===el.dataset.k?null:el.dataset.k;rBtk();break;
  case'kom':arkKomunikat(el.dataset.id);break;
  case'sch-linia':S.sch.linia=el.dataset.k;S.sch.stacja=null;rSchemat();schPanel(el);break;
  case'sch-stacja':S.sch.stacja=el.dataset.s;S.sch.linia=null;rSchemat();schPanel(el);break;
  case'sch-wroc':S.sch.linia=S.sch.stacja=null;rSchemat();break;
  case'sch-set':S.sch.set=el.dataset.k;S.sch.linia=S.sch.stacja=null;rSchemat();break;
  case'sch-pokaz':{const k=el.dataset.k;if(R.id==='wlkp')S.sch.set=SCH.PKM_LINES.some(l=>l.id===k)?'pkm':'reg';S.sch.linia=k;S.sch.stacja=null;ark('');go('schemat');break}
  case'kfiltr':S.kfiltr=el.dataset.k;rKomunikaty();break;
  case'opcje':O=null;arkOpcje();break;
  case'op-przes':O.bezp=el.dataset.k==='1';arkOpcje();break;
  case'op-min':O.minT=+el.dataset.k;arkOpcje();break;
  case'op-ag':{const k=el.dataset.k,ix=O.bez.indexOf(k);if(ix>=0)O.bez.splice(ix,1);else if(O.bez.length<2)O.bez.push(k);else toast('Zostaw co najmniej jednego przewoźnika.');arkOpcje();break}
  case'op-reset':O={bezp:false,minT:5,bez:[]};arkOpcje();break;
  case'op-ok':Object.assign(S,O);O=null;ark('');formularz();if(czytaj())szukaj();break;
  case'wczesniej':{const r=wyniki();if(r?.length){S.q={min:r[0].arr-1,arrive:true};S.selAuto=true;rWyniki();$('#wyniki').scrollIntoView({block:'start'})}break}
  case'pozniej':{const r=wyniki();if(r?.length){S.q={min:r.at(-1).dep+1,arrive:false};S.selAuto=true;rWyniki();$('#wyniki').scrollIntoView({block:'start'})}break}
  case'sel':{const c=cFromKey(el.dataset.k);ark('');if(!c)break;S.sel=c.k;S.selDay=dzien(c.dep);S.selAuto=false;
    if(view!=='szukaj'||cFrom(c)!==S.from||cTo(c)!==S.to||!(wyniki()||[]).some(x=>x.k===c.k)){S.from=cFrom(c);S.to=cTo(c);S.day=S.selDay;S.when=((c.dep%1440)+1440)%1440;S.kier='odj';S.q={min:c.dep,arrive:false};formularz()}
    if(view!=='szukaj')go('szukaj');else rWyniki();$('#detal').classList.add('otwarty');$('#detal').scrollTop=0;break}
  case'detal-zamknij':$('#detal').classList.remove('otwarty');break;
  case'rozwin':{const box=el.closest('.os').nextElementSibling;box.hidden=!box.hidden;el.setAttribute('aria-expanded',!box.hidden);if(el.dataset.k){S.rozw??=new Set();S.rozw[box.hidden?'delete':'add'](el.dataset.k)}break}
  case'udostepnij':{const c=cFromKey(S.sel),t=`${cFrom(c)} → ${cTo(c)}, ${etykDnia(S.selDay).toLowerCase()} ${hm(c.dep)}–${hm(cArr(c))} · zanimwyjdziesz.pl`;
   (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Skopiowano opis połączenia.')).catch(()=>toast(t));break}
  case'mock':toast(el.dataset.t);break;
  case'obserwuj-podroz':{const dz=iso(S.selDay),k=S.trips.findIndex(t=>t.k===S.sel&&t.dz===dz);if(k<0){{const c=cFromKey(S.sel);S.trips.push({k:S.sel,dz,a:cFrom(c),b:cTo(c),m:((c.dep%1440)+1440)%1440})};toast('Dodano podróż do zakładki „Moje”.')}else{S.trips.splice(k,1);toast('Nie obserwujesz już tej podróży.')}save();rDetal();break}
  case'obserwuj-trase':{const k=S.routes.findIndex(r=>(r.a===S.from&&r.b===S.to)||(r.a===S.to&&r.b===S.from));
   if(k<0){if(S.przyklad){S.routes=[];S.przyklad=false}S.routes.unshift({a:S.from,b:S.to});toast('Dodano trasę do zakładki „Moje”.')}else{S.routes.splice(k,1);S.przyklad=false;toast('Nie obserwujesz już tej trasy.')}save();rWyjazd();rWyniki();break}
  case'na-mape':{const c=cFromKey(S.sel);S.mapSel=c.legs[0].t.id;S.mapFit=true;$('#detal').classList.remove('otwarty');go('mapa');break}
  case'poc':arkPociag(el.dataset.id);if(view==='mapa')rMapa();break;
  case'poc-mapa':S.mapFit=true;ark('');go('mapa');break;
  case'stacja-mapa':{const s=SBN.get(el.dataset.s);S.mapCel=[s.lon,s.lat];go('mapa');break}
  case'ulga':S.ulga=el.dataset.k;S.ulgiOtw=false;save();rWyniki();break;
  case'ulgi':S.ulgiOtw=!S.ulgiOtw;rDetal();break;
  case'mapa-cala':if(MAP?._bb)MAP.fitBounds(MAP._bb,{padding:30});break;
  case'poc-nr':fetch(API()+'/trains?q='+encodeURIComponent(el.dataset.n)).then(r=>r.json()).then(j=>{const x=j.trains?.[0];if(x)arkPociag(x.key);else toast('Nie znaleźliśmy tego pociągu w rozkładzie.')}).catch(()=>toast('Nie udało się wyszukać pociągu.'));break;
  case'poc-link':{const u='https://zanimwyjdziesz.pl'+(R.id==='mal'?'/malopolska':'')+'/pociag/'+el.dataset.n;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Skopiowano link do pociągu.')).catch(()=>toast(u));break}
  case'ark-zamknij':ark('');P=O=null;if(view==='mapa'&&S.mapSel){S.mapSel=null;rMapa()}break;
  case'stacja-ark':arkStacja(el.dataset.s);break;
  case'stacja':S.station=el.dataset.s;ark('');if(view!=='stacje')go('stacje');else rStacje();break;
  case'stad':S.from=el.dataset.s;if(S.to===S.from)S.to=S.from===R.hub?R.cel:R.hub;S.when=null;S.day=0;S.kier='odj';ark('');formularz();szukaj();go('szukaj');break;
  case'tryb':S.tryb=el.dataset.k;rStacje();break;
  case'walk':S.walk=Math.max(0,Math.min(30,S.walk+ +el.dataset.d));save();rMoje();break;
  case'trasa-odwroc':{const r=S.routes[i];[r.a,r.b]=[r.b,r.a];save();rMoje();break}
  case'trasa-usun':S.routes.splice(i,1);S.przyklad=false;save();rMoje();break;
  case'trasa-szukaj':{const r=S.routes[i];S.from=r.a;S.to=r.b;S.when=null;S.day=0;S.kier='odj';formularz();szukaj();if(view!=='szukaj')go('szukaj');else $('#wyniki').scrollIntoView({block:'start'});break}
 }});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ark('');P=O=null;$('#detal').classList.remove('otwarty')}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-a],.mpoc,.wyj')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
$('#f').addEventListener('submit',e=>{e.preventDefault();if(czytaj())szukaj()});
['skad','dokad'].forEach(id=>$('#'+id).addEventListener('change',()=>{if(resolve($('#skad').value)&&resolve($('#dokad').value)&&czytaj())szukaj()}));
['skad','dokad','stacja'].forEach(id=>$('#'+id).addEventListener('focus',e=>e.target.select()));
$('#stacja').addEventListener('change',e=>{const s=resolve(e.target.value);if(s){S.station=s;rStacje()}else toast(`Nie znaleźliśmy stacji „${e.target.value.trim()}”. Wybierz stację z listy.`)});
document.addEventListener('change',e=>{if(e.target.id!=='btk-st')return;const v=e.target.value.trim(),s=btkSzukaj(v);
 if(s||!v){S.btk.st=s?s.n:null;S.btk.extra=false;rBtk()}else toast(`Stacja „${v}” nie jest objęta biletem Bus-Tramwaj-Kolej. Wybierz stację z listy.`)});
document.addEventListener('focusin',e=>{if(e.target.id==='btk-st')e.target.select()});
/* lista podpowiedzi: własny element systemu zamiast <datalist> przeglądarki */
const ZRODLA={
 stacje:q=>({et:'Najczęściej wybierane',l:(q?STATIONS:R.szybkie).map(n=>({v:n,meta:`<span class="k">${linesOf(n).map(l=>`<i style="--c:${l.color}"></i>`).join('')}</span>`}))}),
 btk:q=>({et:'Przykładowe stacje w ofercie',l:(q?BTK_ALL:BTK_ALL.filter(s=>['Gniezno','Swarzędz','Września','Kościan','Mosina','Szamotuły'].includes(s.n))).map(s=>({v:s.n,meta:`<span class="kzn info m" aria-hidden="true">${s.z}</span>`}))})};
let LI=null,LT;
const zazn=(v,q)=>{const i=q?norm(v).indexOf(q):-1;return i<0?v:v.slice(0,i)+'<mark>'+v.slice(i,i+q.length)+'</mark>'+v.slice(i+q.length)};
function pokazListe(inp,q){const r=ZRODLA[inp.dataset.lista](q),sc=x=>{const k=norm(x.v);return k.startsWith(q)?0:(' '+k).includes(' '+q)?1:2};
 const l=(q?r.l.filter(x=>norm(x.v).includes(q)).sort((a,b)=>sc(a)-sc(b)):r.l).slice(0,8);
 const el=$('#lista'),nowa=el.hidden||el.classList.contains('zam');clearTimeout(LT);el.classList.remove('zam');el.classList.toggle('otw',nowa);LI={inp,l,act:q&&l.length?0:-1};
 el.innerHTML=(q?'':`<div class="et" aria-hidden="true">${r.et}</div>`)+(l.length?l.map((x,i)=>`<div role="option" id="op-${i}" data-i="${i}" style="--i:${i}" aria-selected="${i===LI.act}"><span class="n">${zazn(x.v,q)}</span>${x.meta}</div>`).join(''):'<p class="pusto dr">Nie znaleźliśmy takiej stacji.</p>');
 const b=(inp.closest('.pole')||inp).getBoundingClientRect();
 Object.assign(el.style,{left:b.left+scrollX+'px',top:b.bottom+scrollY+6+'px',width:b.width+'px'});el.hidden=false;
 inp.setAttribute('aria-expanded','true');if(LI.act>=0)inp.setAttribute('aria-activedescendant','op-0');else inp.removeAttribute('aria-activedescendant')}
function zamknijListe(){if(!LI)return;LI.inp.setAttribute('aria-expanded','false');LI.inp.removeAttribute('aria-activedescendant');LI=null;const el=$('#lista');el.classList.add('zam');clearTimeout(LT);LT=setTimeout(()=>{el.hidden=true;el.classList.remove('zam')},matchMedia('(prefers-reduced-motion:reduce)').matches?0:150)}
function wybierz(i){const x=LI.l[i],inp=LI.inp;if(!x)return;inp.value=x.v;zamknijListe();inp.dispatchEvent(new Event('change',{bubbles:true}))}
document.addEventListener('focusin',e=>{if(e.target.dataset?.lista)pokazListe(e.target,'')});
document.addEventListener('input',e=>{if(e.target.dataset?.lista)pokazListe(e.target,norm(e.target.value))});
document.addEventListener('focusout',e=>{if(LI&&e.target===LI.inp)zamknijListe()});
document.addEventListener('click',e=>{if(e.target.dataset?.lista&&!LI)pokazListe(e.target,'')}); // ponowne otwarcie po Esc
// strzałka i reszta pola przełączają listę; bez tego mousedown na etykiecie zdejmował fokus, a klik etykiety od razu otwierał listę z powrotem
const poleListy=e=>{const p=e.target.closest?.('.pole'),inp=p&&p.querySelector('input[data-lista]');return inp&&e.target!==inp?inp:null};
document.addEventListener('mousedown',e=>{const inp=poleListy(e);if(!inp)return;e.preventDefault();if(LI&&LI.inp===inp)zamknijListe();else{inp.focus();if(!LI)pokazListe(inp,'')}});
document.addEventListener('click',e=>{if(poleListy(e))e.preventDefault()});
document.addEventListener('keydown',e=>{if(!LI||e.target!==LI.inp)return;const n=LI.l.length;
 if((e.key==='ArrowDown'||e.key==='ArrowUp')&&n){e.preventDefault();LI.act=(LI.act+(e.key==='ArrowDown'?1:n-1))%n;
  $('#lista').querySelectorAll('[role="option"]').forEach((o,i)=>o.setAttribute('aria-selected',i===LI.act));LI.inp.setAttribute('aria-activedescendant','op-'+LI.act);$('#op-'+LI.act).scrollIntoView({block:'nearest'})}
 else if(e.key==='Enter'&&LI.act>=0){e.preventDefault();wybierz(LI.act)}
 else if(e.key==='Escape'){e.stopPropagation();zamknijListe()}},true);
$('#lista').addEventListener('mousedown',e=>{e.preventDefault();const o=e.target.closest('[role="option"]');if(o)wybierz(+o.dataset.i)});
window.addEventListener('resize',zamknijListe);
window.addEventListener('hashchange',route);
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',motyw);

region(S.region);pismo();
$('.zamien').innerHTML=ic('zamien',18);
motyw();
wczytajStacje().then(()=>{formularz();szukaj();route()}).catch(()=>{$('#demo').hidden=false;$('#demo').textContent='Nie udało się wczytać listy stacji. Odśwież stronę.'});
setInterval(()=>{if($('#ark').firstChild||document.activeElement?.matches('input'))return;if(S.when==null&&!S.day)formularz();render()},30000);
