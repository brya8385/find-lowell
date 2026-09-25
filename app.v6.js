/* Find Lowell — store locator prototype */
const LEAN_NAME = {I:"Indica", S:"Sativa", H:"Hybrid", V:"Variety"};
const LINE_ORDER = ["Quicks","Smokes","35's","Outlaws","Littles","Ground Flower","Flower","2-Pack"];

let doors = [], map, cluster, markers = new Map(), ring = null, originMark = null;
let fLine=null, fLean=null, fState=null, hideOut=true;
let radius=50, origin=null, sel=null, rows=[], started=false;

const $ = id => document.getElementById(id);

fetch('data/doors.json').then(r => r.json()).then(data => {
  doors = data.doors;
  freshness(data);
  $('foot').innerHTML = data.note;
  buildMap();
  buildChips();
  wireSearch();
  render();
});

/* ---------------- freshness ---------------- */
// "Updated" is when the file was last rebuilt; "menus as of" is the date of the
// newest menu-feed data behind it. More than two days behind today, say so.
const fmtDay = iso => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  .toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
function freshness(data){
  const parts = [];
  if (data.built) parts.push('Updated ' + fmtDay(data.built));
  if (data.asof) parts.push('menus as of ' + fmtDay(data.asof));
  $('asof').textContent = parts.join(' · ') || '—';
  if (!data.asof) return;
  const t = new Date(); t.setHours(12,0,0,0);
  const days = Math.round((t - new Date(data.asof + 'T12:00:00')) / 864e5);
  if (days > 2){
    $('stale').hidden = false;
    $('stale').textContent = 'Menu data is ' + days + ' days old and may be out of date.';
  }
}

/* ---------------- map ---------------- */
function buildMap(){
  map = L.map('map', {scrollWheelZoom:true, zoomControl:true}).setView([39.5,-95],4);
  // OpenStreetMap standard tiles: no API key, and they carry the city, road and
  // neighbourhood labels a shopper needs to orient themselves.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:19
  }).addTo(map);
  // No clustering: one pin per store at every zoom. Dense metros look busy when
  // zoomed out, which is the honest picture of where our distribution actually is.
  cluster = L.layerGroup().addTo(map);

  const legend = L.control({position:'bottomright'});
  legend.onAdd = () => {
    const d = L.DomUtil.create('div','legend');
    d.innerHTML =
      '<div><i style="background:#2e6b4a"></i>In stock now</div>'+
      '<div><i style="background:#8a6314"></i>Currently out of stock</div>'+
      '<div><i style="background:#6e6a63"></i>Lowell store</div>';
    return d;
  };
  legend.addTo(map);
}

// st: in_stock | out_of_stock | carries (no live menu we can read: no stock claim).
// Files built before 25 Sep 2026 have no st; derive it the same way.
const status = d => d.st || ((d.B || d.C) ? 'carries' : (d.k > 0 ? 'in_stock' : 'out_of_stock'));
const ST_ORDER = {in_stock:0, carries:1, out_of_stock:2};
function badge(d){
  const st = status(d);
  if (st === 'in_stock') return `<span class="badge b-stock">In stock · ${d.k} product${d.k>1?'s':''}</span>`;
  if (st === 'out_of_stock') return `<span class="badge b-carry">Currently out of stock</span>`;
  return '';
}
function pinFor(d){
  const cls = {in_stock:'pin-stock', out_of_stock:'pin-carry', carries:'pin-tc'}[status(d)];
  const size = (sel===d) ? 16 : 9;
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
  const tel = d.tel ? `<div class="pa"><a href="tel:${d.tel.replace(/[^0-9+]/g,'')}">${d.tel}</a></div>` : '';
  const link = d.u ? `<a class="cta" href="${d.u}" target="_blank" rel="noopener">${d.uk==='verified'?'See Lowell here':'View menu'} →</a>` : '';
  return `<div class="pop"><b>${esc(d.n)}</b><div class="pa">${esc(d.a)}</div>${tel}${badge(d)}<div>${link}</div></div>`;
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
    fState = (fState===s?null:s); origin=null; $('q').value=''; started = !!fState || started;
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
  $('stockOnly').onclick = () => { hideOut=!hideOut; $('stockOnly').setAttribute('aria-pressed',String(hideOut)); render(); };
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
    clearTimeout(t); t=setTimeout(() => { origin=resolve(e.target.value); if(origin){ fState=null; started=true; } render(); frame(); }, 180);
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
  if (!started) return doors.slice();
  return doors.filter(d => {
    if (hideOut && status(d) === 'out_of_stock') return false;
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
  rows.sort(origin ? (a,b)=>a._m-b._m
    : (a,b)=> ST_ORDER[status(a)]-ST_ORDER[status(b)] || (b.k||0)-(a.k||0) || a.n.localeCompare(b.n));

  $('rcount').textContent = rows.length + (rows.length===1?' store':' stores');
  $('rnote').textContent = origin ? (radius?`within ${radius} miles, nearest first`:'nearest first')
                                  : 'carrying Lowell';

  const list=$('list'); list.innerHTML='';
  if (!started){
    $('rcount').textContent = doors.length + ' stores';
    $('rnote').textContent  = 'across ' + new Set(doors.map(d=>d.s)).size + ' states';
    const g=document.createElement('div'); g.className='gate';
    g.innerHTML = '<p class="gh">Where are you?</p>'+
      '<p class="gp">Enter a ZIP code above, or pick a state, and we\'ll show what is on the shelf near you.</p>';
    const row=document.createElement('div'); row.className='gstates';
    [...new Set(doors.map(d=>d.s))].sort().forEach(st => {
      const n=doors.filter(x=>x.s===st).length;
      const b=document.createElement('button'); b.className='gbtn';
      b.innerHTML = `<strong>${st}</strong><span>${n} stores</span>`;
      b.onclick=()=>{ fState=st; started=true;
        [...$('stChips').children].forEach(x=>x.dataset.st&&x.setAttribute('aria-pressed',String(x.dataset.st===st)));
        render(); fitState(); };
      row.appendChild(b);
    });
    g.appendChild(row); list.appendChild(g);
    drawMarkers(); return;
  }
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
  c.type='button'; c.className='card'+(sel===d?' sel':'');
  const price = (status(d)==='in_stock'&&d.p) ? `<span class="price">${d.p==d.ph?'$'+d.p:'$'+d.p+'–$'+d.ph}</span>` : '';
  const dist = (origin&&d._m!=null) ? `<span class="cdist">${d._m<10?d._m.toFixed(1):Math.round(d._m)} mi</span>` : '';
  const tel = d.tel ? `<div class="ctel"><a href="tel:${d.tel.replace(/[^0-9+]/g,'')}">${d.tel}</a></div>` : '';
  const P = d.P||[]; const shown = (sel===d)?P:P.slice(0,5);
  const prows = shown.map(([nm,ln,le,pp,sp]) =>
    `<div class="prow"><span class="pline">${ln&&nm?ln+' — '+esc(nm):(ln||esc(nm))}</span>`+
    `<span class="ptags">${le?`<span class="tag t-${le}">${LEAN_NAME[le]}</span>`:''}</span>`+
    `<span class="pprice">${pp?'$'+pp:''}</span>${sp?`<span class="pspec">${sp}</span>`:''}</div>`).join('');
  const hidden = P.length-shown.length+(d.more||0);
  const prods = P.length ? `<div class="prods">${prows}${hidden>0?`<div class="pmore">+${hidden} more — tap to see all</div>`:''}</div>` : '';
  const link = d.u ? `<a class="cta${d.uk==='verified'?'':' ghost'}" href="${d.u}" target="_blank" rel="noopener">${d.uk==='verified'?'See Lowell at this store':'View their menu'} →</a>` : '';
  const src = d.approx ? `<div class="src">Pin placed by town; check the address</div>` : '';
  const meta = badge(d) + price;
  c.innerHTML = `<div class="ctop"><span class="cname">${esc(d.n)}</span>${dist}</div>
    <div class="caddr">${esc(d.a)}</div>${tel}${meta?`<div class="cmeta">${meta}</div>`:''}${prods}${src}${link}`;
  c.onclick = ev => {
    if (ev.target.closest('a')) return;
    // Re-rendering the list would jump the page (phones) or the list (desktop)
    // back to the top; keep the shopper's place. The pinned map shows the store.
    const y = window.scrollY, ly = $('list').scrollTop;
    sel = (sel===d?null:d); render();
    window.scrollTo(0, y); $('list').scrollTop = ly;
    if (sel){ map.setView([d.la,d.lo], Math.max(map.getZoom(),12)); markers.get(d)?.openPopup(); }
  };
  return c;
}
