/* Find Lowell — store locator prototype */
const LEAN_NAME = {I:"Indica", S:"Sativa", H:"Hybrid", V:"Variety"};
const LINE_ORDER = ["Quicks","Smokes","35's","Outlaws","Littles","Ground Flower","Flower","2-Pack"];

let doors = [], map, cluster, markers = new Map(), ring = null, originMark = null;
let fLine=null, fLean=null, fState=null, stockOnly=true, showUnconfirmed=false;
let radius=50, origin=null, sel=null, rows=[];

const $ = id => document.getElementById(id);

fetch('data/doors.json').then(r => r.json()).then(data => {
  doors = data.doors;
  $('asof').textContent = 'AS OF ' + data.asof;
  $('foot').innerHTML = data.note;
  buildMap();
  buildChips();
  wireSearch();
  render();
});

/* ---------------- map ---------------- */
function buildMap(){
  map = L.map('map', {scrollWheelZoom:true, zoomControl:true}).setView([39.5,-95],4);
  // OpenStreetMap standard tiles: no API key, and they carry the city, road and
  // neighbourhood labels a shopper needs to orient themselves.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:19
  }).addTo(map);
  cluster = L.markerClusterGroup({
    showCoverageOnHover:false, maxClusterRadius:45, disableClusteringAtZoom:11
  });
  map.addLayer(cluster);

  const legend = L.control({position:'bottomright'});
  legend.onAdd = () => {
    const d = L.DomUtil.create('div','legend');
    d.innerHTML =
      '<div><i style="background:#2e6b4a"></i>In stock now</div>'+
      '<div><i style="background:#8a6314"></i>Carries Lowell, out today</div>'+
      '<div><i style="background:transparent;border:2px dashed #8a6314"></i>We ship it, no menu feed</div>'+
      '<div><i style="background:#6e6a63;opacity:.8"></i>Partner-reported</div>';
    return d;
  };
  legend.addTo(map);
}

function pinFor(d){
  const cls = d.C ? 'pin-tc' : (d.B ? 'pin-tb' : (d.k>0 ? 'pin-stock' : 'pin-carry'));
  const size = (sel===d) ? 18 : 12;
  return L.divIcon({className:'', html:`<div class="pin ${cls}" style="width:${size}px;height:${size}px"></div>`,
                    iconSize:[size,size], iconAnchor:[size/2,size/2]});
}

function drawMarkers(){
  cluster.clearLayers(); markers.clear();
  rows.forEach(d => {
    const m = L.marker([d.la,d.lo], {icon:pinFor(d), title:d.n});
    m.bindPopup(popup(d), {closeButton:true});
    m.on('click', () => { sel=d; render(); scrollToCard(d); });
    markers.set(d, m); cluster.addLayer(m);
  });
}

function popup(d){
  const badge = d.C ? `<span class="badge b-grey">${d.src||'Partner-reported'}</span>`
    : d.B ? `<span class="badge b-carry">Carries Lowell · shipped ${d.last}</span>`
    : d.k>0 ? `<span class="badge b-stock">In stock · ${d.k} product${d.k>1?'s':''}</span>`
    : `<span class="badge b-carry">Carries Lowell</span>`;
  const tel = d.tel ? `<div class="pa"><a href="tel:${d.tel.replace(/[^0-9+]/g,'')}">${d.tel}</a></div>` : '';
  const link = d.u ? `<a class="cta" href="${d.u}" target="_blank" rel="noopener">${d.uk==='verified'?'See Lowell here':'View menu'} →</a>` : '';
  return `<div class="pop"><b>${esc(d.n)}</b><div class="pa">${esc(d.a)}</div>${tel}${badge}<div>${link}</div></div>`;
}
const esc = s => String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- filters ---------------- */
function chip(wrap, label, pressed, onclick, data){
  const b=document.createElement('button');
  b.className='chip'; b.textContent=label; b.setAttribute('aria-pressed',String(pressed));
  Object.assign(b.dataset, data||{}); b.onclick=onclick; wrap.appendChild(b); return b;
}
function buildChips(){
  const sts=[...new Set(doors.map(d=>d.s))].sort();
  sts.forEach(s => chip($('stChips'), s, false, () => {
    fState = (fState===s?null:s); origin=null; $('q').value='';
    [...$('stChips').children].forEach(x => x.dataset && x.setAttribute && x.dataset.st && x.setAttribute('aria-pressed', String(x.dataset.st===fState)));
    render(); fitState();
  }, {st:s}));
  [25,50,100,null].forEach(r => chip($('radChips'), r?r+' mi':'Any', r===radius, () => {
    radius=r; [...$('radChips').children].forEach(x => x.dataset.r!==undefined && x.setAttribute('aria-pressed', String(x.dataset.r===String(r))));
    render();
  }, {r:String(r)}));
  LINE_ORDER.filter(l => doors.some(d => (d.L||[]).includes(l))).forEach(l =>
    chip($('lineChips'), l, false, () => {
      fLine=(fLine===l?null:l);
      [...$('lineChips').children].forEach(x => x.dataset.line && x.setAttribute('aria-pressed', String(x.dataset.line===fLine)));
      render();
    }, {line:l}));
  ['I','S','H','V'].filter(c => doors.some(d => (d.E||[]).includes(c))).forEach(c =>
    chip($('leanChips'), LEAN_NAME[c], false, () => {
      fLean=(fLean===c?null:c);
      [...$('leanChips').children].forEach(x => x.dataset.lean && x.setAttribute('aria-pressed', String(x.dataset.lean===fLean)));
      render();
    }, {lean:c}));
  $('stockOnly').onclick = () => { stockOnly=!stockOnly; $('stockOnly').setAttribute('aria-pressed',String(stockOnly)); render(); };
}

/* ---------------- search ---------------- */
const zipIdx={}, cityIdx={};
function wireSearch(){
  doors.forEach(d => {
    if (d.z && !zipIdx[d.z]) zipIdx[d.z]=[d.la,d.lo];
    const c=(d.c||'').toLowerCase();
    if (c) (cityIdx[c]=cityIdx[c]||[]).push([d.la,d.lo]);
  });
  let t; $('q').addEventListener('input', e => {
    clearTimeout(t); t=setTimeout(() => { origin=resolve(e.target.value); if(origin) fState=null; render(); frame(); }, 180);
  });
}
function resolve(q){
  q=q.trim().toLowerCase(); if(!q) return null;
  if(/^\d{5}$/.test(q)) return zipIdx[q]||null;
  const hit=Object.keys(cityIdx).find(c=>c===q)||Object.keys(cityIdx).find(c=>c.startsWith(q));
  if(!hit) return null;
  const p=cityIdx[hit];
  return [p.reduce((s,x)=>s+x[0],0)/p.length, p.reduce((s,x)=>s+x[1],0)/p.length];
}
function miles(a,b,c,d){
  const R=3958.8,p=Math.PI/180,dLa=(c-a)*p,dLo=(d-b)*p;
  const x=Math.sin(dLa/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}

/* ---------------- view framing ---------------- */
function frame(){
  if (ring){ map.removeLayer(ring); ring=null; }
  if (originMark){ map.removeLayer(originMark); originMark=null; }
  if (!origin) return;
  originMark = L.circleMarker(origin,{radius:6,color:'#b4622a',weight:2,fillColor:'#b4622a',fillOpacity:.9})
                .addTo(map).bindTooltip('Your search');
  if (radius){
    ring = L.circle(origin,{radius:radius*1609.34,color:'#b4622a',weight:1.5,dashArray:'5 4',
                            fillColor:'#b4622a',fillOpacity:.05}).addTo(map);
    map.fitBounds(ring.getBounds(),{padding:[24,24]});
  } else if (rows.length){
    map.fitBounds(L.latLngBounds(rows.map(d=>[d.la,d.lo])),{padding:[28,28]});
  }
}
function fitState(){
  if (!fState) { if(rows.length) map.fitBounds(L.latLngBounds(rows.map(d=>[d.la,d.lo])),{padding:[28,28]}); return; }
  const pts = doors.filter(d=>d.s===fState).map(d=>[d.la,d.lo]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts),{padding:[30,30]});
}
function scrollToCard(d){
  const i=rows.indexOf(d); const el=$('list').children[i];
  if (el) el.scrollIntoView({block:'nearest',behavior:'smooth'});
}

/* ---------------- render ---------------- */
function visible(){
  return doors.filter(d => {
    if ((d.B || d.C) && !showUnconfirmed) return false;
    if (!d.B && !d.C && stockOnly && d.k<=0) return false;
    if (fState && d.s!==fState) return false;
    if (fLine && !(d.L||[]).includes(fLine)) return false;
    if (fLean && !(d.E||[]).includes(fLean)) return false;
    return true;
  });
}
function render(){
  rows = visible();
  if (origin){
    rows.forEach(d => d._m = miles(origin[0],origin[1],d.la,d.lo));
    if (radius) rows = rows.filter(d => d._m<=radius);
  }
  rows.sort(origin ? (a,b)=>a._m-b._m : (a,b)=> (b.k||0)-(a.k||0) || a.n.localeCompare(b.n));

  $('rcount').textContent = rows.length + (rows.length===1?' store':' stores');
  $('rnote').textContent = origin ? (radius?`within ${radius} miles, nearest first`:'nearest first')
                                  : (stockOnly?'with Lowell in stock today':'carrying Lowell');

  const rev=$('reveal');
  const inScope = d => (!fState || d.s===fState) && (!origin || !radius || miles(origin[0],origin[1],d.la,d.lo)<=radius);
  if (!showUnconfirmed){
    const hid = doors.filter(d => (d.B||d.C) && inScope(d)).length;
    if (hid){
      rev.hidden=false;
      rev.innerHTML = `<span><strong>${hid}</strong> more ${hid===1?'store':'stores'} carry Lowell but aren't on a live menu feed.</span>`;
      const b=document.createElement('button'); b.textContent='Show them';
      b.onclick=()=>{showUnconfirmed=true;render();}; rev.appendChild(b);
    } else rev.hidden=true;
  } else {
    rev.hidden=false;
    rev.innerHTML = `<span>Including <strong>${rows.filter(d=>d.B||d.C).length}</strong> stores we can't confirm stock for.</span>`;
    const b=document.createElement('button'); b.textContent='Hide them';
    b.onclick=()=>{showUnconfirmed=false;render();}; rev.appendChild(b);
  }

  const list=$('list'); list.innerHTML='';
  if (!rows.length){
    const e=document.createElement('div'); e.className='empty';
    e.textContent = origin&&radius ? `No stores within ${radius} miles. Try a wider radius.` : 'No stores match those filters.';
    list.appendChild(e);
  }
  rows.slice(0,200).forEach(d => list.appendChild(card(d)));
  drawMarkers();
}

function card(d){
  const c=document.createElement('button');
  c.type='button'; c.className='card'+(sel===d?' sel':'')+((d.B||d.C)?' tb':'');
  const badge = d.C ? `<span class="badge b-grey">Partner-reported</span>`
    : d.B ? `<span class="badge b-carry">Carries Lowell · shipped ${d.last}</span>`
    : d.k>0 ? `<span class="badge b-stock">In stock · ${d.k} product${d.k>1?'s':''}</span>`
    : `<span class="badge b-carry">Carries Lowell</span>`;
  const price = (d.k>0&&d.p) ? `<span class="price">${d.p==d.ph?'$'+d.p:'$'+d.p+'–$'+d.ph}</span>` : '';
  const dist = (origin&&d._m!=null) ? `<span class="cdist">${d._m<10?d._m.toFixed(1):Math.round(d._m)} mi</span>` : '';
  const tel = d.tel ? `<div class="ctel"><a href="tel:${d.tel.replace(/[^0-9+]/g,'')}">${d.tel}</a></div>` : '';
  const P = d.P||[]; const shown = (sel===d)?P:P.slice(0,5);
  const prows = shown.map(([nm,ln,le,pp,sp]) =>
    `<div class="prow"><span class="pline">${(ln?ln+' — ':'')+esc(nm)}</span>`+
    `<span class="ptags">${le?`<span class="tag t-${le}">${LEAN_NAME[le]}</span>`:''}</span>`+
    `<span class="pprice">${pp?'$'+pp:''}</span>${sp?`<span class="pspec">${sp}</span>`:''}</div>`).join('');
  const hidden = P.length-shown.length+(d.more||0);
  const prods = P.length ? `<div class="prods">${prows}${hidden>0?`<div class="pmore">+${hidden} more — tap to see all</div>`:''}</div>` : '';
  const link = d.u ? `<a class="cta${d.uk==='verified'?'':' ghost'}" href="${d.u}" target="_blank" rel="noopener">${d.uk==='verified'?'See Lowell at this store':'View their menu'} →</a>`
    : (d.B ? `<div class="pmore" style="margin-top:8px">Call ahead — not on a menu feed we can read.</div>` : '');
  const src = d.C && d.src ? `<div class="src">${d.src}${d.approx?' · location approximate':''}</div>` : '';
  c.innerHTML = `<div class="ctop"><span class="cname">${esc(d.n)}</span>${dist}</div>
    <div class="caddr">${esc(d.a)}</div>${tel}<div class="cmeta">${badge}${price}</div>${prods}${src}${link}`;
  c.onclick = ev => {
    if (ev.target.closest('a')) return;
    sel = (sel===d?null:d); render();
    if (sel){ map.setView([d.la,d.lo], Math.max(map.getZoom(),12)); markers.get(d)?.openPopup(); }
  };
  return c;
}
