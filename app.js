/* =============================================================
   THE GRIND — APP LAYER (vanilla JS, no libraries)
   State + localStorage · stats · XP/levels · render · FX · audio
   · analytics. Same data model as before, new bold UI wiring.
   ============================================================= */
"use strict";

/* ============ STATE ============ */
const STORE_KEY = "thegrind.v1";
const DEFAULT_STATE = {
  xp:0, today:{date:"",done:[]}, history:{}, unlocked:[],
  startDate:"", longestStreak:0, muted:false, theme:"blaze", weights:[]
};

/* available themes: id + label + swatch colour shown in the picker */
const THEMES = [
  { id:"blaze",    label:"Blaze",    sw:"#FF4D00" },
  { id:"midnight", label:"Midnight", sw:"#FF6B2C" },
  { id:"court",    label:"Court",    sw:"#0066FF" },
  { id:"crimson",  label:"Crimson",  sw:"#E11D2A" },
  { id:"venom",    label:"Venom",    sw:"#9EE600" },
  { id:"mono",     label:"Mono",     sw:"#15140F" }
];
let state = loadState();

function todayStr(d=new Date()){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function freshState(){
  const s = structuredClone(DEFAULT_STATE);
  s.today={date:todayStr(),done:[]}; s.startDate=todayStr(); return s;
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(!raw){ // migrate from old sci-fi key if present
      const old=localStorage.getItem("missioncore.v1");
      if(old){ const s=Object.assign({},DEFAULT_STATE,JSON.parse(old)); return rollover(s);} 
      return freshState();
    }
    return rollover(Object.assign({},DEFAULT_STATE,JSON.parse(raw)));
  }catch(e){ console.warn("load failed",e); return freshState(); }
}
function rollover(s){
  const t=todayStr();
  if(!s.startDate) s.startDate=t;
  if(!s.today) s.today={date:t,done:[]};
  if(s.today.date!==t){
    if(s.today.done&&s.today.done.length) s.history[s.today.date]=s.today.done.slice();
    s.today={date:t,done:[]};
  }
  return s;
}
function saveState(){ try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(e){} }
function allDays(){ const m=Object.assign({},state.history); m[state.today.date]=state.today.done.slice(); return m; }

/* ============ STATS ============ */
function computeStats(){
  const days=allDays();
  const dates=Object.keys(days).filter(d=>days[d].length>0).sort();
  let totalMissions=0,perfectDays=0,calories=0;
  const missionCounts={};
  const kcalById=Object.fromEntries(MISSIONS.map(m=>[m.id,m.kcal]));
  for(const d of dates){
    const list=days[d]; totalMissions+=list.length;
    if(list.length>=TOTAL_MISSIONS) perfectDays++;
    for(const id of list){ missionCounts[id]=(missionCounts[id]||0)+1; calories+=kcalById[id]||0; }
  }
  const pushupTotal=(missionCounts.chest||0)*36;
  const {current,longest}=streaks(dates);
  const longestStreak=Math.max(longest,state.longestStreak||0);
  return {totalMissions,perfectDays,calories,missionCounts,pushupTotal,
    currentStreak:current,longestStreak,activeDays:dates.length,level:levelFromXp(state.xp)};
}
function streaks(sorted){
  if(!sorted.length) return {current:0,longest:0};
  const set=new Set(sorted),dayMs=86400000;
  let longest=1,run=1;
  for(let i=1;i<sorted.length;i++){
    const p=new Date(sorted[i-1]),c=new Date(sorted[i]);
    if(Math.round((c-p)/dayMs)===1){run++;longest=Math.max(longest,run);}else run=1;
  }
  let current=0,cur=new Date(todayStr());
  if(!set.has(todayStr(cur))) cur=new Date(cur.getTime()-dayMs);
  while(set.has(todayStr(cur))){current++;cur=new Date(cur.getTime()-dayMs);}
  return {current,longest};
}

/* ============ XP / LEVELS ============ */
const xpToAdvance=l=>200+l*120;
function cumulativeXp(level){ if(level<=1) return 0; let t=0; for(let i=1;i<level;i++) t+=xpToAdvance(i); return t; }
function levelFromXp(xp){ let l=1; while(xp>=cumulativeXp(l+1)) l++; return l; }

/* ============ DOM ============ */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const session=$("#session");
const fxLayer=$("#fx-layer");
function getCss(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function tagColor(tag){ return TAGS[tag]||getCss("--ink"); }

/* ============ RENDER ============ */
const HYPE = [
  "Discipline beats motivation. Show up.",
  "You don't have to be extreme, just consistent.",
  "The body achieves what the mind believes.",
  "Sweat now, shine later.",
  "Small steps every day add up fast.",
  "Your only competition is yesterday's you.",
  "Comfort is the enemy of progress.",
  "Don't count the days — make the days count.",
  "Fat is burned in the kitchen and the grind.",
  "One more rep. One more day. One more win.",
  "Tired? Do it tired. Then rest proud.",
  "The grind doesn't care how you feel. Go."
];
function renderHype(){
  const doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000);
  $("#hype").textContent="“"+HYPE[doy%HYPE.length]+"”";
}
function render(){
  const stats=computeStats();
  state.longestStreak=stats.longestStreak;
  renderHero(stats);
  renderRing();
  renderSession();
  renderStatus();
  renderHype();
  $("#streak-mini").textContent=stats.currentStreak;
  saveState();
}

function renderHero(stats){
  const lvl=stats.level, base=cumulativeXp(lvl), span=xpToAdvance(lvl), into=state.xp-base;
  const pct=Math.max(0,Math.min(100,(into/span)*100));
  $("#level-num").textContent=lvl;
  $("#rank-title").textContent=rankForLevel(lvl);
  $("#xp-fill").style.width=pct+"%";
  $("#xp-text").textContent=`${into} / ${span} XP`;
  $("#stat-kcal").textContent=todaysCalories();
  $("#stat-done").textContent=`${state.today.done.length}/${TOTAL_MISSIONS}`;
  $("#stat-streak").textContent=stats.currentStreak;
  let day=stats.activeDays; if(day===0)day=1; day=Math.min(day,PROGRAM_DAYS);
  $("#day-badge").textContent=`DAY ${day} / ${PROGRAM_DAYS}`;
}
function todaysCalories(){
  const k=Object.fromEntries(MISSIONS.map(m=>[m.id,m.kcal]));
  return state.today.done.reduce((s,id)=>s+(k[id]||0),0);
}
function renderRing(){
  const done=state.today.done.length;
  const pct=Math.round((done/TOTAL_MISSIONS)*100);
  $("#ring-pct").innerHTML=`${pct}<small>%</small>`;
  $("#ring-count").textContent=`${done} / ${TOTAL_MISSIONS} DONE`;
  const C=540; // 2*pi*86
  $("#ring-arc").style.strokeDashoffset=C-(pct/100)*C;
  $(".ring-wrap").classList.toggle("full",done===TOTAL_MISSIONS);
}
function renderStatus(){
  const d=state.today.done.length;
  let m;
  if(d===0) m="Let's move. Knock out your first exercise.";
  else if(d===TOTAL_MISSIONS) m="Session complete. You crushed every exercise today. 🔥";
  else if(d>=TOTAL_MISSIONS*0.66) m=`Almost there — ${TOTAL_MISSIONS-d} left to finish the session.`;
  else if(d>=TOTAL_MISSIONS*0.33) m="Halfway warm. Keep the pace up.";
  else m=`${d} down. Don't stop now.`;
  $("#status-line").textContent=m;
}
function renderSession(){
  session.innerHTML="";
  MISSIONS.forEach((m,i)=>{
    const done=state.today.done.includes(m.id);
    const row=document.createElement("div");
    row.className="ex-row"+(done?" done":"");
    row.dataset.id=m.id;
    row.innerHTML=`
      <span class="sweep"></span>
      <span class="ex-index">${String(i+1).padStart(2,"0")}</span>
      <div class="ex-main">
        <span class="ex-tag" style="background:${tagColor(m.tag)}">${m.tag}</span>
        <div class="ex-name">${m.name}</div>
        <div class="ex-meta"><b>${m.sets>1?m.sets+" × ":""}${m.reps}</b> · ${m.sub} · +${m.xp} XP</div>
      </div>
      <div class="ex-go">${done?"✓":"›"}</div>`;
    row.addEventListener("click",()=>openSheet(m.id));
    session.appendChild(row);
  });
}

/* ============ SHEET ============ */
let active=null;
function openSheet(id){
  const m=MISSIONS.find(x=>x.id===id); if(!m) return;
  active=m;
  const done=state.today.done.includes(id);
  const t=$("#s-tag"); t.textContent=m.tag; t.style.background=tagColor(m.tag);
  $("#s-title").textContent=m.name;
  $("#s-detail").textContent=m.detail;
  $("#s-sets").textContent=m.sets;
  $("#s-reps").textContent=m.reps;
  $("#s-xp").textContent="+"+m.xp;
  $("#s-kcal").textContent=m.kcal;
  const ul=$("#s-proto"); ul.innerHTML="";
  m.protocol.forEach(p=>{const li=document.createElement("li");li.textContent=p;ul.appendChild(li);});
  $("#do-btn").style.display=done?"none":"";
  $("#undo-btn").hidden=!done;
  setupSetDots(m,done);
  setupTimer(m);
  $("#sheet").classList.add("open");
  $("#sheet").setAttribute("aria-hidden","false");
  playClick();
}
function closeSheet(){
  stopTimer();
  $("#sheet").classList.remove("open"); $("#sheet").setAttribute("aria-hidden","true"); active=null;
}

/* ---- set dots: tap each set; auto-log when all ticked ---- */
function setupSetDots(m,done){
  const wrap=$("#set-track"), dots=$("#set-dots");
  if(done||m.sets<=1){ wrap.hidden=true; return; }
  wrap.hidden=false; dots.innerHTML="";
  let ticked=0;
  for(let i=0;i<m.sets;i++){
    const b=document.createElement("button");
    b.className="set-dot"; b.textContent=i+1;
    b.addEventListener("click",()=>{
      b.classList.toggle("on");
      ticked=dots.querySelectorAll(".on").length;
      playClick();
      if(ticked===m.sets) setTimeout(completeActive,180);
    });
    dots.appendChild(b);
  }
}

/* ---- exercise timer ---- */
let tmTotal=60,tmLeft=60,tmId=null,tmRunning=false;
function parseSecs(reps){
  const r=reps.toLowerCase();
  const n=parseInt(r,10);
  if(r.includes("sec")) return n||60;
  if(r.includes("min")) return (n||1)*60;
  return 45; // rep-based default: a quick work timer
}
function setupTimer(m){
  stopTimer();
  tmTotal=parseSecs(m.reps); tmLeft=tmTotal;
  buildPresets();
  paintTimer();
  $("#tm-start").textContent="Start";
}
function buildPresets(){
  const presets=[30,60,90];
  if(!presets.includes(tmTotal)) presets.push(tmTotal);
  presets.sort((a,b)=>a-b);
  $("#tm-presets").innerHTML=presets.map(s=>
    `<button class="tm-preset ${s===tmTotal?"active":""}" data-sec="${s}">${fmt(s)}</button>`).join("");
  $$("#tm-presets .tm-preset").forEach(b=>b.addEventListener("click",()=>{
    if(tmRunning) stopTimer();
    tmTotal=tmLeft=+b.dataset.sec; buildPresets(); paintTimer(); $("#tm-start").textContent="Start"; playClick();
  }));
}
function fmt(s){ const m=Math.floor(s/60),x=s%60; return m+":"+String(x).padStart(2,"0"); }
function paintTimer(){
  $("#timer-time").textContent=fmt(tmLeft);
  const C=327;
  $("#tr-arc").style.strokeDashoffset=C*(1-tmLeft/tmTotal);
}
function toggleTimer(){
  if(tmRunning){ stopTimer(); return; }
  if(tmLeft<=0){ tmLeft=tmTotal; }
  tmRunning=true;
  $("#timer").classList.add("running");
  $("#tm-start").textContent="Pause";
  $("#timer-lbl").textContent="GO";
  tmId=setInterval(()=>{
    tmLeft--; paintTimer();
    if(tmLeft<=3&&tmLeft>0) tone(880,0,0.12,"square",0.10);
    if(tmLeft<=0){ stopTimer(); $("#timer-lbl").textContent="DONE"; tone(180,0,0.3,"triangle",0.14,520); tone(520,0.1,0.3,"triangle",0.12); }
  },1000);
}
function stopTimer(){
  if(tmId) clearInterval(tmId); tmId=null; tmRunning=false;
  const t=$("#timer"); if(t) t.classList.remove("running");
  const b=$("#tm-start"); if(b&&tmLeft>0) b.textContent=tmLeft<tmTotal?"Resume":"Start";
}
function resetTimer(){ stopTimer(); tmLeft=tmTotal; paintTimer(); $("#timer-lbl").textContent="TIMER"; $("#tm-start").textContent="Start"; }

function completeActive(){
  if(!active) return;
  const m=active; if(state.today.done.includes(m.id)) return;
  state.today.done.push(m.id);
  state.xp+=m.xp;
  const prev=levelFromXp(state.xp-m.xp), now=levelFromXp(state.xp);
  closeSheet(); render();
  const row=session.querySelector(`[data-id="${m.id}"]`);
  if(row){
    row.classList.add("just-done","sweeping");
    setTimeout(()=>row.classList.remove("just-done","sweeping"),500);
    confettiAt(row,[tagColor(m.tag),getCss("--blaze"),getCss("--ink")]);
    floatXp(row,m.xp);
  }
  flash(); playDone();
  if(now>prev) setTimeout(()=>levelUp(now),450);
  if(state.today.done.length===TOTAL_MISSIONS) setTimeout(celebrate,500);
  checkAchievements();
}
function undoActive(){
  if(!active) return;
  const m=active, i=state.today.done.indexOf(m.id); if(i<0) return;
  state.today.done.splice(i,1);
  state.xp=Math.max(0,state.xp-m.xp);
  closeSheet(); render(); playClick();
}

/* ============ FX ============ */
function flash(){ const f=$("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function centerOf(el){ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }
function confettiAt(el,colors){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const {x,y}=centerOf(el);
  for(let i=0;i<28;i++){
    const p=document.createElement("div");
    p.className="confetti";
    const c=colors[i%colors.length];
    const s=6+Math.random()*9;
    p.style.width=p.style.height=s+"px";
    p.style.left=x+"px"; p.style.top=y+"px"; p.style.background=c;
    p.style.transform="translate(-50%,-50%) rotate(0deg)";
    p.style.transition="transform .85s cubic-bezier(.1,.7,.3,1), opacity .85s ease";
    fxLayer.appendChild(p);
    const ang=Math.random()*Math.PI*2, dist=70+Math.random()*170;
    const dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist-40;
    requestAnimationFrame(()=>{
      p.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${Math.random()*540-270}deg)`;
      p.style.opacity="0";
    });
    setTimeout(()=>p.remove(),900);
  }
}
function floatXp(el,xp){
  const {x,y}=centerOf(el);
  const e=document.createElement("div"); e.className="float-xp";
  e.style.left=x+"px"; e.style.top=y+"px";
  e.innerHTML=`+${xp}<small>XP EARNED</small>`;
  fxLayer.appendChild(e); setTimeout(()=>e.remove(),1300);
}
function levelUp(level){
  confettiAt($(".ring-wrap"),[getCss("--blaze"),getCss("--go"),getCss("--ink")]);
  const e=document.createElement("div"); e.className="float-xp";
  e.style.left="50%"; e.style.top="34%"; e.style.color=getCss("--blaze");
  e.innerHTML=`LEVEL ${level}<small>${rankForLevel(level).toUpperCase()}</small>`;
  fxLayer.appendChild(e); setTimeout(()=>e.remove(),1500);
  playLevel();
}

/* ---- Web Audio: short punchy SFX ---- */
let actx=null;
function audio(){ if(state.muted) return null; if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}} if(actx.state==="suspended") actx.resume(); return actx; }
function tone(freq,start,dur,type="sine",peak=0.16,slide=null){
  const c=audio(); if(!c) return;
  const t0=c.currentTime+start,o=c.createOscillator(),g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t0);
  if(slide) o.frequency.exponentialRampToValueAtTime(slide,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0+dur+0.04);
}
function playClick(){ tone(300,0,0.06,"square",0.05); }
function playDone(){ tone(180,0,0.12,"square",0.10,90); tone(440,0.04,0.14,"triangle",0.12); tone(660,0.12,0.18,"triangle",0.12); }
function playLevel(){ [440,587,740,880].forEach((f,i)=>tone(f,i*0.09,0.26,"triangle",0.12)); }
function playAchv(){ tone(523,0,0.2,"triangle",0.12); tone(784,0.1,0.2,"triangle",0.12); tone(1047,0.2,0.34,"sine",0.13); }

/* ============ ACHIEVEMENTS ============ */
function checkAchievements(){
  const stats=computeStats(); let got=null;
  for(const a of ACHIEVEMENTS){
    if(!state.unlocked.includes(a.id)&&a.check(stats)){ state.unlocked.push(a.id); got=a; break; }
  }
  if(got){ saveState(); toastAchv(got); renderAchievements(); setTimeout(checkAchievements,2500); }
}
function toastAchv(a){
  const t=$("#achv-toast");
  $("#at-ic").textContent=a.icon; $("#at-title").textContent=a.title; $("#at-desc").textContent=a.desc;
  t.classList.add("show"); playAchv(); setTimeout(()=>t.classList.remove("show"),4000);
}

/* ============ CELEBRATION ============ */
function celebrate(){
  const cel=$("#celebrate"); cel.classList.add("show");
  playLevel();
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
    const cols=[getCss("--blaze"),getCss("--go"),getCss("--ink"),"#FFC400"];
    for(let v=0;v<3;v++) setTimeout(()=>confettiVolley(cols),v*220);
  }
  setTimeout(()=>cel.classList.remove("show"),2600);
}
function confettiVolley(colors){
  for(let i=0;i<40;i++){
    const p=document.createElement("div"); p.className="confetti";
    const c=colors[i%colors.length]; const s=7+Math.random()*10;
    const x=Math.random()*innerWidth, y=innerHeight*0.15+Math.random()*60;
    p.style.width=p.style.height=s+"px"; p.style.left=x+"px"; p.style.top=y+"px"; p.style.background=c;
    p.style.transform="translate(-50%,-50%)";
    p.style.transition="transform 1.4s cubic-bezier(.2,.6,.4,1), opacity 1.4s ease";
    fxLayer.appendChild(p);
    const dx=(Math.random()-0.5)*260, dy=200+Math.random()*340;
    requestAnimationFrame(()=>{p.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${Math.random()*720-360}deg)`;p.style.opacity="0";});
    setTimeout(()=>p.remove(),1450);
  }
}

/* ============ WEIGH-IN ============ */
function logWeight(){
  const input=$("#weigh-val");
  const kg=parseFloat(input.value);
  if(!kg||kg<=0||kg>500){ input.focus(); return; }
  const d=todayStr();
  const existing=state.weights.find(w=>w.date===d);
  if(existing) existing.kg=kg; else state.weights.push({date:d,kg});
  state.weights.sort((a,b)=>a.date<b.date?-1:1);
  input.value=""; saveState(); renderWeigh(); playClick();
}
function renderWeigh(){
  const w=state.weights;
  const latestEl=$("#weigh-latest"), deltaEl=$("#weigh-delta");
  if(!w.length){ latestEl.textContent="—"; deltaEl.textContent="log your weight to track it"; deltaEl.className=""; drawSpark([]); return; }
  const latest=w[w.length-1].kg, first=w[0].kg, diff=+(latest-first).toFixed(1);
  latestEl.textContent=latest+" kg";
  if(w.length===1){ deltaEl.textContent="starting point set"; deltaEl.className=""; }
  else if(diff<0){ deltaEl.textContent=`▼ ${Math.abs(diff)} kg since start`; deltaEl.className="down"; }
  else if(diff>0){ deltaEl.textContent=`▲ ${diff} kg since start`; deltaEl.className="up"; }
  else { deltaEl.textContent="no change yet"; deltaEl.className=""; }
  drawSpark(w.map(x=>x.kg));
}
function drawSpark(data){
  const c=$("#weigh-spark"); const {ctx,w,h}=setupCanvas(c); ctx.clearRect(0,0,w,h);
  if(data.length<2){ return; }
  const pad=10,min=Math.min(...data),max=Math.max(...data),range=(max-min)||1;
  const stepX=(w-pad*2)/(data.length-1);
  const y=v=>h-pad-((v-min)/range)*(h-pad*2);
  ctx.beginPath();
  data.forEach((v,i)=>{const px=pad+i*stepX; i?ctx.lineTo(px,y(v)):ctx.moveTo(px,y(v));});
  ctx.strokeStyle=getCss("--blaze"); ctx.lineWidth=3; ctx.lineJoin="round"; ctx.stroke();
  ctx.fillStyle=getCss("--blaze");
  data.forEach((v,i)=>{const px=pad+i*stepX; ctx.beginPath(); ctx.arc(px,y(v),3,0,Math.PI*2); ctx.fill();});
}

/* ============ ANALYTICS ============ */
function renderStats(){
  const stats=computeStats();
  renderHeatmap(); renderWeekly(); renderKcal(); renderTrend();
  $("#cur-streak").textContent=stats.currentStreak;
  $("#best-streak").textContent=stats.longestStreak;
  $("#active-days").textContent=stats.activeDays;
  const totals=[["Exercises done",stats.totalMissions],["Push-ups banked",stats.pushupTotal],
    ["Calories burned",stats.calories],["Full sessions",stats.perfectDays]];
  $("#totals-list").innerHTML=totals.map(([k,v])=>`<li><span>${k}</span><b>${v.toLocaleString()}</b></li>`).join("");
  renderWeigh();
  renderAchievements();
}
function dateMinus(n){ const d=new Date(todayStr()); d.setDate(d.getDate()-n); return d; }
function intensity(c){ if(c<=0)return 0; if(c>=TOTAL_MISSIONS)return 4; if(c>=8)return 3; if(c>=4)return 2; return 1; }
function renderHeatmap(){
  const hm=$("#heatmap"); hm.innerHTML=""; const days=allDays(); const total=56;
  const start=dateMinus(total-1); const offset=start.getDay();
  for(let i=-offset;i<total;i++){
    const d=dateMinus(total-1-i-offset); const key=todayStr(d);
    const cell=document.createElement("i"); const count=(days[key]||[]).length;
    cell.className="h"+intensity(count); cell.title=`${key} · ${count} exercises`; hm.appendChild(cell);
  }
}
function renderWeekly(){
  const wrap=$("#weekly-chart"); wrap.innerHTML=""; const days=allDays();
  const L=["S","M","T","W","T","F","S"];
  for(let i=6;i>=0;i--){
    const d=dateMinus(i),key=todayStr(d),count=(days[key]||[]).length,pct=(count/TOTAL_MISSIONS)*100;
    const col=document.createElement("div"); col.className="bar-col";
    col.innerHTML=`<span class="bar-val">${count}</span><div class="bar ${count>=TOTAL_MISSIONS?"full":""}" style="height:0"></div><span class="bar-lbl">${L[d.getDay()]}</span>`;
    wrap.appendChild(col);
    requestAnimationFrame(()=>{col.querySelector(".bar").style.height=Math.max(4,pct)+"%";});
  }
}
function setupCanvas(c){
  const dpr=window.devicePixelRatio||1, rect=c.getBoundingClientRect();
  const w=rect.width||c.width, h=parseInt(getComputedStyle(c).height)||c.height;
  c.width=w*dpr; c.height=h*dpr; const ctx=c.getContext("2d"); ctx.scale(dpr,dpr); return {ctx,w,h};
}
function renderKcal(){
  const {ctx,w,h}=setupCanvas($("#kcal-chart")); ctx.clearRect(0,0,w,h);
  const days=allDays(), k=Object.fromEntries(MISSIONS.map(m=>[m.id,m.kcal])), data=[];
  for(let i=6;i>=0;i--){ const key=todayStr(dateMinus(i)); data.push((days[key]||[]).reduce((s,id)=>s+(k[id]||0),0)); }
  drawLine(ctx,w,h,data,getCss("--blaze"));
}
function renderTrend(){
  const {ctx,w,h}=setupCanvas($("#trend-chart")); ctx.clearRect(0,0,w,h);
  const days=allDays(),data=[];
  for(let i=29;i>=0;i--){ const key=todayStr(dateMinus(i)),count=(days[key]||[]).length; data.push(Math.round((count/TOTAL_MISSIONS)*100)); }
  drawLine(ctx,w,h,data,getCss("--ink"),100);
}
function drawLine(ctx,w,h,data,color,fixedMax){
  const pad=24,max=fixedMax||Math.max(10,...data),n=data.length,stepX=(w-pad*2)/(n-1||1);
  const y=v=>h-pad-(v/max)*(h-pad*2);
  ctx.strokeStyle="rgba(0,0,0,.10)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
  ctx.beginPath();
  data.forEach((v,i)=>{const px=pad+i*stepX; i?ctx.lineTo(px,y(v)):ctx.moveTo(px,y(v));});
  ctx.lineTo(w-pad,h-pad); ctx.lineTo(pad,h-pad); ctx.closePath();
  const g=ctx.createLinearGradient(0,pad,0,h); g.addColorStop(0,hexA(color,.22)); g.addColorStop(1,hexA(color,0));
  ctx.fillStyle=g; ctx.fill();
  ctx.beginPath();
  data.forEach((v,i)=>{const px=pad+i*stepX; i?ctx.lineTo(px,y(v)):ctx.moveTo(px,y(v));});
  ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineJoin="round"; ctx.stroke();
  ctx.fillStyle=color;
  data.forEach((v,i)=>{const px=pad+i*stepX; ctx.beginPath(); ctx.arc(px,y(v),3,0,Math.PI*2); ctx.fill();});
}
function hexA(hex,a){ hex=hex.replace("#",""); if(hex.length===3) hex=hex.split("").map(c=>c+c).join("");
  const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; }
function renderAchievements(){
  $("#achv-grid").innerHTML=ACHIEVEMENTS.map(a=>{
    const on=state.unlocked.includes(a.id);
    return `<div class="achv ${on?"unlocked":""}"><span class="a-ic">${on?a.icon:"🔒"}</span>
      <span class="a-tx"><strong>${a.title}</strong><small>${a.desc}</small></span></div>`;
  }).join("");
}

/* ============ THEME ============ */
function applyTheme(id){
  if(id==="blaze") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",id);
  state.theme=id; saveState();
  // refresh canvas charts (they read CSS colours at draw time)
  if($("#view-stats").classList.contains("active")){ renderKcal(); renderTrend(); }
  buildThemePicker();
}
function buildThemePicker(){
  $("#theme-list").innerHTML=THEMES.map(t=>
    `<button class="theme-opt ${t.id===state.theme?"active":""}" data-theme="${t.id}">
       <span class="sw" style="background:${t.sw}"></span>${t.label}
     </button>`).join("");
  $$("#theme-list .theme-opt").forEach(b=>b.addEventListener("click",()=>{
    applyTheme(b.dataset.theme); $("#theme-pop").classList.remove("open"); playClick();
  }));
}

/* ============ BOOT ============ */
function switchView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("#view-"+name).classList.add("active");
  if(name==="stats") renderStats();
  playClick();
}
function applyMute(){ $("#sound-toggle").classList.toggle("muted",state.muted); $("#sound-icon").textContent=state.muted?"🔇":"🔊"; }
function bind(){
  $$(".tab").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
  $("#do-btn").addEventListener("click",completeActive);
  $("#undo-btn").addEventListener("click",undoActive);
  $("#tm-start").addEventListener("click",toggleTimer);
  $("#tm-reset").addEventListener("click",resetTimer);
  $("#weigh-log").addEventListener("click",logWeight);
  $("#weigh-val").addEventListener("keydown",e=>{if(e.key==="Enter")logWeight();});
  $("#celebrate").addEventListener("click",()=>$("#celebrate").classList.remove("show"));
  $$("[data-close]").forEach(el=>el.addEventListener("click",closeSheet));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
  applyMute();
  $("#sound-toggle").addEventListener("click",()=>{state.muted=!state.muted;applyMute();saveState();if(!state.muted)playClick();});
  $("#reset-btn").addEventListener("click",()=>{
    if(confirm("Reset all progress, XP, streaks and achievements? This can't be undone.")){
      localStorage.removeItem(STORE_KEY); localStorage.removeItem("missioncore.v1");
      state=freshState(); saveState(); render();
      if($("#view-stats").classList.contains("active")) renderStats();
    }
  });
  window.addEventListener("pointerdown",()=>audio(),{once:true});

  // theme picker
  $("#theme-btn").addEventListener("click",e=>{e.stopPropagation();$("#theme-pop").classList.toggle("open");});
  document.addEventListener("click",e=>{
    if(!e.target.closest("#theme-pop")&&!e.target.closest("#theme-btn")) $("#theme-pop").classList.remove("open");
  });
}
function boot(){ applyTheme(state.theme||"blaze"); bind(); render(); }
document.addEventListener("DOMContentLoaded",boot);
