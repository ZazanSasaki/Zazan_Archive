const $=id=>document.getElementById(id),DB="zazan-collections-db",VER=3,ENT="entries",GAL="gallery",MANGA="manga";let db,entries=[],gallery=[],mangas=[],cat="All",poster="",toastTimer,installEvent,activeManga=null,readerPage=0,readerUrls=[],dragWidget=null;
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2400)}
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{let d=r.result;if(!d.objectStoreNames.contains(ENT))d.createObjectStore(ENT,{keyPath:"id"});if(!d.objectStoreNames.contains(GAL))d.createObjectStore(GAL,{keyPath:"id"});if(!d.objectStoreNames.contains(MANGA))d.createObjectStore(MANGA,{keyPath:"id"})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function req(store,mode,fn){return new Promise((ok,no)=>{let tx=db.transaction(store,mode),r=fn(tx.objectStore(store));tx.oncomplete=()=>ok(r?.result);tx.onerror=()=>no(tx.error)})}
const all=()=>req(ENT,"readonly",s=>s.getAll()),allGal=()=>req(GAL,"readonly",s=>s.getAll()),allManga=()=>req(MANGA,"readonly",s=>s.getAll()),put=x=>req(ENT,"readwrite",s=>s.put(x)),putGal=x=>req(GAL,"readwrite",s=>s.put(x)),putManga=x=>req(MANGA,"readwrite",s=>s.put(x)),del=id=>req(ENT,"readwrite",s=>s.delete(id)),delGal=id=>req(GAL,"readwrite",s=>s.delete(id)),delManga=id=>req(MANGA,"readwrite",s=>s.delete(id));
async function seed(){if((await all()).length)return 0;let r=await fetch("./backup.json"),d=await r.json(),list=d.entries||d;if(!Array.isArray(list))throw Error("Bad backup");for(let x of list)if(x.title)await put({...x,id:x.id||crypto.randomUUID(),createdAt:x.createdAt||Date.now(),updatedAt:x.updatedAt||Date.now()});return list.length}
async function refresh(){entries=await all();gallery=await allGal();mangas=await allManga();stats();render();renderGallery();renderManga();renderWidgets();renderNotifications();$("saveState").textContent="● SAVED"}
function stats(){let n=s=>entries.filter(x=>x.status===s).length;$("totalStat").textContent=String(entries.length).padStart(3,"0");$("completedStat").textContent=String(n("Completed")).padStart(3,"0");$("progressStat").textContent=String(entries.filter(x=>["Watching","Reading"].includes(x.status)).length).padStart(3,"0");$("plannedStat").textContent=String(entries.filter(x=>["Plan to Watch","Plan to Read"].includes(x.status)).length).padStart(3,"0");$("allCount").textContent=entries.length;$("animeCount").textContent=entries.filter(x=>x.category==="Anime").length;$("mangaCount").textContent=entries.filter(x=>x.category==="Manga").length;$("tvCount").textContent=entries.filter(x=>x.category==="TV Series").length}
function render(){let q=$("search").value.trim().toLowerCase(),s=$("statusFilter").value,sort=$("sortFilter").value,list=entries.filter(x=>(cat==="All"||x.category===cat)&&(s==="All"||x.status===s)&&[x.title,x.genres,x.notes,x.year,x.progress,x.category].join(" ").toLowerCase().includes(q));list.sort((a,b)=>sort==="az"?a.title.localeCompare(b.title):sort==="za"?b.title.localeCompare(a.title):sort==="rating"?(Number(b.rating)||0)-(Number(a.rating)||0):sort==="year"?(Number(b.year)||0)-(Number(a.year)||0):(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));$("entryGrid").innerHTML=list.map((x,i)=>`<article class="entry-card ${x.poster?"has-poster":""}" data-id="${safe(x.id)}" tabindex="0" role="button">${x.poster?`<img class="entry-poster" src="${x.poster}" alt="">`:""}<div class="entry-top"><span class="entry-category">${safe((x.category||"CUSTOM").toUpperCase())}</span><span class="entry-number">${String(i+1).padStart(3,"0")}</span></div><h3>${safe(x.title)}</h3><div class="entry-bottom"><span class="status-pill">${safe((x.status||"UNSORTED").toUpperCase())}</span><span class="entry-year">${safe(x.year||"—")}</span></div></article>`).join("");$("empty").hidden=!!list.length;$("entryGrid").hidden=!list.length;$("showing").textContent=`SHOWING ${list.length} OF ${entries.length} ENTRIES`}
const defaults=[["Black Lace / Noir","black-lace-hood.jpg"],["Crimson Portrait","crimson-lighter-portrait.jpg"],["Bridal Veil Cosplay","bridal-veil-cosplay.jpg"],["Noir Glasses","glasses-noir-portrait.jpg"],["Purple Horn Cosplay","purple-horn-cosplay.jpg"],["Silver Editorial","silver-haired-editorial.jpg"],["Casual Portrait","casual-bedroom-portrait.jpg"],["Kurumi Shopping","kurumi-shopping-cart.jpg"],["Game Character Group","dark-game-character-group.png"],["Anime School Portrait","anime-school-portrait.jpg"],["Purple Dream","purple-cosplay-01.jpg"],["Black Glasses Editorial","portrait-black-glasses.jpg"],["Black & White Cosplay","cosplay-black-white.jpg"],["Purple Cosplay II","purple-cosplay-02.jpg"],["Maid Editorial","maid-editorial.jpg"],["Purple Cosplay III","purple-cosplay-03.jpg"],["Black Dress","portrait-black-dress.png"],["Editorial Portrait","portrait-editorial.jpg"],["Couch Portrait","portrait-couch.jpg"],["Purple Cosplay IV","purple-cosplay-04.jpg"]];
let slideIndex=0,slideTimer=null,progressTimer=null,slidePlaying=true,slideItems=[],slideSettings={auto:"on",interval:3000,effect:"slide",fit:"contain"};
function loadSlideSettings(){
  try { slideSettings={...slideSettings,...JSON.parse(localStorage.getItem("zazan-gallery-settings")||"{}")}; } catch {}
  $("slideAuto").value=slideSettings.auto;
  $("slideInterval").value=String(slideSettings.interval);
  $("slideEffect").value=slideSettings.effect;
  $("slideFit").value=slideSettings.fit;
  slidePlaying=slideSettings.auto==="on";
  $("slideToggle").textContent=slidePlaying?"Ⅱ PAUSE":"▶ PLAY";
  applySlideSettings();
}
function saveSlideSettings(){
  slideSettings={auto:$("slideAuto").value,interval:Number($("slideInterval").value),effect:$("slideEffect").value,fit:$("slideFit").value};
  localStorage.setItem("zazan-gallery-settings",JSON.stringify(slideSettings));
  slidePlaying=slideSettings.auto==="on";
  $("slideToggle").textContent=slidePlaying?"Ⅱ PAUSE":"▶ PLAY";
  applySlideSettings();
  startSlideshow();
}
function applySlideSettings(){
  $("slideshowViewport").classList.toggle("fit-cover",slideSettings.fit==="cover");
  $("slideshowTrack").classList.toggle("fade-mode",slideSettings.effect==="fade");
  $("slideshowTrack").style.transition=slideSettings.effect==="fade"?"none":"transform .85s cubic-bezier(.2,.75,.25,1)";
  updateSlideshow();
}
function renderGallery(){
  slideItems=[...gallery.map(x=>({id:x.id,title:x.title,src:x.src,custom:true})),...defaults.map(([title,file])=>({title,src:"assets/"+file,custom:false}))];
  $("galleryCount").textContent=slideItems.length+" IMAGES";
  const track=$("slideshowTrack"),dots=$("slideDots");
  track.innerHTML="";dots.innerHTML="";
  slideItems.forEach((x,i)=>{
    const slide=document.createElement("div");slide.className="slideshow-slide";
    const img=document.createElement("img");img.src=x.src;img.alt=x.title;img.loading=i<2?"eager":"lazy";img.decoding="async";
    slide.appendChild(img);
    slide.addEventListener("click",()=>openImage(x.src,x.title));
    track.appendChild(slide);
    const dot=document.createElement("button");dot.type="button";dot.className="slide-dot";dot.setAttribute("aria-label","Show image "+(i+1));dot.addEventListener("click",()=>{slideIndex=i;updateSlideshow();startSlideshow()});dots.appendChild(dot);
  });
  slideIndex=slideItems.length?slideIndex%slideItems.length:0;
  updateSlideshow();startSlideshow();
}
function openImage(src,title){$("lightboxImg").src=src;$("lightboxText").textContent=title;$("lightbox").showModal()}
function updateSlideshow(){
  if(!slideItems.length)return;
  const track=$("slideshowTrack"),slides=[...track.children];
  if(slideSettings.effect==="fade"){
    slides.forEach((s,i)=>s.classList.toggle("is-active",i===slideIndex));
  }else{
    track.style.transform=`translateX(-${slideIndex*100}%)`;
    slides.forEach(s=>s.classList.remove("is-active"));
  }
  [...$("slideDots").children].forEach((d,i)=>d.classList.toggle("active",i===slideIndex));
  $("slideCounter").textContent=String(slideIndex+1).padStart(2,"0")+" / "+String(slideItems.length).padStart(2,"0");
  $("slideCaption").textContent=slideItems[slideIndex]?.title?.toUpperCase()||"ZAZAN COLLECTIONS";
}
function startSlideshow(){
  clearInterval(slideTimer);clearInterval(progressTimer);
  $("slideProgress").style.width="0%";
  if(!slidePlaying||slideItems.length<2)return;
  const duration=slideSettings.interval;
  let started=Date.now();
  progressTimer=setInterval(()=>{$("slideProgress").style.width=Math.min(100,((Date.now()-started)/duration)*100)+"%"},80);
  slideTimer=setInterval(()=>{slideIndex=(slideIndex+1)%slideItems.length;updateSlideshow();started=Date.now();$("slideProgress").style.width="0%"},duration);
}
function renderGallerySettings(){
  loadSlideSettings();
  ["slideAuto","slideInterval","slideEffect","slideFit"].forEach(id=>$(id).addEventListener("change",saveSlideSettings));
  $("slideToggle").addEventListener("click",()=>{
    slidePlaying=!slidePlaying;
    slideSettings.auto=slidePlaying?"on":"off";
    $("slideAuto").value=slideSettings.auto;
    $("slideToggle").textContent=slidePlaying?"Ⅱ PAUSE":"▶ PLAY";
    localStorage.setItem("zazan-gallery-settings",JSON.stringify(slideSettings));
    startSlideshow();
  });
  $("slidePrev").addEventListener("click",()=>{slideIndex=(slideIndex-1+slideItems.length)%slideItems.length;updateSlideshow();startSlideshow()});
  $("slideNext").addEventListener("click",()=>{slideIndex=(slideIndex+1)%slideItems.length;updateSlideshow();startSlideshow()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clearInterval(slideTimer);else startSlideshow()});
}

function renderManga(){
 const q=$("mangaSearch").value.trim().toLowerCase(),sort=$("mangaSort").value;
 const list=mangas.filter(m=>m.title.toLowerCase().includes(q)).sort((a,b)=>sort==="az"?a.title.localeCompare(b.title):b.createdAt-a.createdAt);
 $("mangaGrid").innerHTML=list.map(m=>`<article class="manga-card"><div class="manga-cover">${m.pages?.[0]?`<img src="${URL.createObjectURL(m.pages[0])}" alt="">`:`<span>読</span>`}<b>${m.kind==="pdf"?"PDF VOLUME":m.pages.length+" IMAGE PAGES"}</b></div><div class="manga-card-body"><span class="eyebrow">READING SHELF</span><h3>${safe(m.title)}</h3><p>${m.kind==="pdf"?"PDF document":"Image chapter"} · ${new Date(m.createdAt).toLocaleDateString()}</p><div class="manga-card-actions"><button class="btn primary" data-read-manga="${safe(m.id)}">READ NOW ↗</button><button class="btn quiet" data-delete-manga="${safe(m.id)}">REMOVE</button></div></div></article>`).join("");
 $("mangaEmpty").hidden=!!list.length;
}
async function addMangaFiles(files){
 const groups={};
 for(const f of [...files]){
  if(f.type==="application/pdf"){await putManga({id:crypto.randomUUID(),title:f.name.replace(/\.[^.]+$/,""),kind:"pdf",file:f,createdAt:Date.now()});}
  else if(f.type.startsWith("image/")){const raw=f.name.replace(/\.[^.]+$/,"");const title=raw.replace(/(?:[\s_-]+(?:page|ch|chapter)?[\s_-]*\d+)$/i,"").replace(/[_-]+/g," ").trim()||"Imported Manga Chapter";(groups[title]??=[]).push(f);}
  else toast("Only PDF or image files are supported");
 }
 for(const [title,pages] of Object.entries(groups)){pages.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));await putManga({id:crypto.randomUUID(),title,kind:"images",pages,createdAt:Date.now()});}
 await refresh();toast("MANGA ADDED TO YOUR READING SHELF");
}
function openManga(m){
 activeManga=m;readerPage=0;$("readerTitle").innerHTML=`${safe(m.title.toUpperCase())} <em>READER.</em>`;
 readerUrls.forEach(URL.revokeObjectURL);readerUrls=[];
 if(m.kind==="pdf"){const u=URL.createObjectURL(m.file);readerUrls.push(u);$("readerStage").innerHTML=`<iframe class="pdf-reader" title="Manga PDF reader" src="${u}#toolbar=1&navpanes=0"></iframe>`;$("readerPageLabel").textContent="PDF READER";$("readerPrev").disabled=$("readerNext").disabled=true;}
 else{readerUrls=m.pages.map(f=>URL.createObjectURL(f));showMangaPage();$("readerPrev").disabled=false;$("readerNext").disabled=false;}
 $("mangaReader").showModal();
}
function showMangaPage(){if(!activeManga||activeManga.kind!=="images")return;$("readerStage").innerHTML=`<img class="manga-page" src="${readerUrls[readerPage]}" alt="Manga page ${readerPage+1}">`;$("readerPageLabel").textContent=`PAGE ${readerPage+1} / ${readerUrls.length}`;$("readerPrev").disabled=readerPage===0;$("readerNext").disabled=readerPage===readerUrls.length-1;}
function renderWidgets(){
 const total=entries.length,done=entries.filter(x=>x.status==="Completed").length,reading=entries.filter(x=>["Reading","Watching"].includes(x.status)).length,planned=entries.filter(x=>["Plan to Read","Plan to Watch"].includes(x.status)).length;
 $("progressChart").innerHTML=[["Completed",done],["In progress",reading],["To discover",planned]].map(([n,v])=>`<div class="chart-row"><span>${n}</span><div><i style="width:${total?Math.round(v/total*100):0}%"></i></div><b>${v}</b></div>`).join("");
 const badges=[["FIRST ENTRY",total>=1],["COLLECTOR",total>=25],["CENTURY CLUB",total>=100],["STORY FINISHER",done>=10],["MANGA FAN",mangas.length>=1]];
 $("achievementRow").innerHTML=badges.map(([n,on])=>`<span class="achievement ${on?"unlocked":""}">${on?"✦":"◇"}<small>${n}</small></span>`).join("");
 const hidden=JSON.parse(localStorage.getItem("zazan-widget-hidden")||"[]");
 document.querySelectorAll("[data-widget-toggle]").forEach(ch=>{ch.checked=!hidden.includes(ch.dataset.widgetToggle);const w=document.querySelector(`[data-widget="${ch.dataset.widgetToggle}"]`);if(w)w.hidden=hidden.includes(ch.dataset.widgetToggle)});
 const order=JSON.parse(localStorage.getItem("zazan-widget-order")||"[]"),box=$("dashboardWidgets");order.forEach(k=>{const el=box.querySelector(`[data-widget="${k}"]`);if(el)box.appendChild(el)});
}
function buildNotifications(){const n=[],planned=entries.filter(x=>["Plan to Watch","Plan to Read"].includes(x.status)).length,active=entries.filter(x=>["Watching","Reading"].includes(x.status)).length;if(planned)n.push(["Your discovery list is waiting",`${planned} titles are on your plan list.`,"TASK"]);if(active)n.push(["Continue where you left off",`${active} stories are in progress.`,"REMINDER"]);n.push(["Reading room",mangas.length?`${mangas.length} manga item(s) saved on this device.`:"Add your first PDF or image chapter.","LIBRARY"]);return n}
function renderNotifications(){const html=buildNotifications().map(n=>`<article class="notification-item"><i>✦</i><div><b>${safe(n[0])}</b><p>${safe(n[1])}</p><small>${n[2]}</small></div></article>`).join("");$("notificationList").innerHTML=html;$("notificationModalList").innerHTML=html;$("notificationCount").textContent=buildNotifications().length}
function toggleTheme(){document.body.classList.toggle("light-mode");const light=document.body.classList.contains("light-mode");localStorage.setItem("zazan-theme",light?"light":"dark");$("themeToggle").textContent=light?"☾ DARK":"☼ LIGHT";$("themeToggleSettings").textContent=light?"SWITCH TO DARK MODE":"SWITCH TO LIGHT MODE"}
function globalSearch(q){const t=q.trim().toLowerCase(),items=[];if(!t){$("globalSearchResults").innerHTML='<p class="muted">Search your archive, manga shelf or sections.</p>';return}entries.filter(x=>x.title.toLowerCase().includes(t)).slice(0,5).forEach(x=>items.push([x.title,"Collection entry","#archive"]));mangas.filter(x=>x.title.toLowerCase().includes(t)).slice(0,5).forEach(x=>items.push([x.title,"Manga volume","#manga"]));[["Overview","#home"],["Archive","#archive"],["Manga Reader","#manga"],["Gallery","#gallery"],["Control Center","#controlCenter"]].filter(x=>x[0].toLowerCase().includes(t)).forEach(x=>items.push([x[0],"Page section",x[1]]));$("globalSearchResults").innerHTML=items.length?items.map(x=>`<button class="global-result" data-result="${x[2]}"><b>${safe(x[0])}</b><small>${safe(x[1])}</small></button>`).join(""):"<p class='muted'>No results.</p>"}
function exportCSV(){const rows=[["Title","Category","Status","Genres","Year","Rating","Progress","Notes"],...entries.map(x=>[x.title,x.category,x.status,x.genres,x.year,x.rating,x.progress,x.notes])],csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),a=document.createElement("a"),u=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.href=u;a.download="zazan-collections-report.csv";a.click();URL.revokeObjectURL(u);toast("CSV REPORT EXPORTED")}
function pdfReport(){const w=window.open("","_blank");if(!w){toast("Allow popups to create PDF");return}const rows=entries.map(x=>`<tr><td>${safe(x.title)}</td><td>${safe(x.category)}</td><td>${safe(x.status)}</td><td>${safe(x.year||"—")}</td><td>${safe(x.rating||"—")}</td></tr>`).join("");w.document.write(`<html><head><title>ZAZAN COLLECTIONS REPORT</title><style>body{font:14px Arial;padding:30px;color:#222}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>ZAZAN COLLECTIONS</h1><p>${new Date().toLocaleDateString()} · ${entries.length} entries</p><table><tr><th>Title</th><th>Category</th><th>Status</th><th>Year</th><th>Rating</th></tr>${rows}</table><script>window.onload=()=>window.print()<\\/script></body></html>`);w.document.close()}
function assistantInsight(){$("assistantTip").textContent=`${entries.length} archive entries · ${entries.filter(x=>x.status==="Completed").length} completed · ${mangas.length} manga volumes. ${entries.filter(x=>["Plan to Watch","Plan to Read"].includes(x.status)).length} titles are waiting on your discovery list.`}

function initMotion(){
 const targets=document.querySelectorAll('.dashboard,.dashboard-widgets,.feature,.archive,.manga-section,.gallery,.control-center,.data-panel,.footer');
 targets.forEach(el=>el.classList.add('reveal'));
 document.querySelectorAll('.stats,.feature-grid,.entry-grid,.gallery-grid,.manga-grid,.dashboard-widgets,.control-grid').forEach(el=>el.classList.add('reveal-stagger'));
 if(!('IntersectionObserver'in window)){targets.forEach(el=>el.classList.add('is-visible'));return;}
 const observer=new IntersectionObserver((items)=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add('is-visible');observer.unobserve(item.target)}}),{threshold:.08,rootMargin:'0px 0px -35px 0px'});
 targets.forEach(el=>observer.observe(el));
}

function initPremium(){
 if(localStorage.getItem("zazan-theme")==="light")document.body.classList.add("light-mode");const light=document.body.classList.contains("light-mode");$("themeToggle").textContent=light?"☾ DARK":"☼ LIGHT";$("themeToggleSettings").textContent=light?"SWITCH TO DARK MODE":"SWITCH TO LIGHT MODE";
 $("themeToggle").addEventListener("click",toggleTheme);$("themeToggleSettings").addEventListener("click",toggleTheme);
 $("mangaUpload").addEventListener("change",e=>{addMangaFiles(e.target.files).catch(()=>toast("UPLOAD FAILED"));e.target.value=""});$("mangaSearch").addEventListener("input",renderManga);$("mangaSort").addEventListener("change",renderManga);
 $("mangaGrid").addEventListener("click",async e=>{const r=e.target.closest("[data-read-manga]"),d=e.target.closest("[data-delete-manga]");if(r){const m=mangas.find(x=>x.id===r.dataset.readManga);if(m)openManga(m)}if(d&&confirm("Remove this manga from this device?")){await delManga(d.dataset.deleteManga);await refresh()}});
 $("closeReader").addEventListener("click",()=>$("mangaReader").close());$("readerPrev").addEventListener("click",()=>{readerPage=Math.max(0,readerPage-1);showMangaPage()});$("readerNext").addEventListener("click",()=>{readerPage=Math.min(readerUrls.length-1,readerPage+1);showMangaPage()});$("mangaReader").addEventListener("close",()=>{readerUrls.forEach(URL.revokeObjectURL);readerUrls=[]});
 $("notifyButton").addEventListener("click",()=>$("notificationDialog").showModal());$("closeNotifications").addEventListener("click",()=>$("notificationDialog").close());$("clearNotifications").addEventListener("click",()=>toast("Alerts reflect your current collection status."));
 $("globalSearchInput").addEventListener("input",e=>globalSearch(e.target.value));$("globalSearchResults").addEventListener("click",e=>{const b=e.target.closest("[data-result]");if(b){$("globalSearchDialog").close();document.querySelector(b.dataset.result)?.scrollIntoView({behavior:"smooth"})}});
 document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("globalSearchDialog").showModal();$("globalSearchInput").focus()}if(e.key==="Escape"&&$("globalSearchDialog").open)$("globalSearchDialog").close()});
 $("csvReport").addEventListener("click",exportCSV);$("quickReport").addEventListener("click",exportCSV);$("pdfReport").addEventListener("click",pdfReport);$("quickEntry").addEventListener("click",()=>editor());$("quickManga").addEventListener("click",()=>$("mangaUpload").click());$("assistantRefresh").addEventListener("click",assistantInsight);
 document.querySelectorAll("[data-widget-toggle]").forEach(ch=>ch.addEventListener("change",()=>{let a=JSON.parse(localStorage.getItem("zazan-widget-hidden")||"[]");a=a.filter(x=>x!==ch.dataset.widgetToggle);if(!ch.checked)a.push(ch.dataset.widgetToggle);localStorage.setItem("zazan-widget-hidden",JSON.stringify(a));renderWidgets()}));
 const box=$("dashboardWidgets");box.addEventListener("dragstart",e=>{const el=e.target.closest("[data-widget]");if(el){dragWidget=el.dataset.widget;el.classList.add("dragging")}});box.addEventListener("dragend",e=>{e.target.closest("[data-widget]")?.classList.remove("dragging");localStorage.setItem("zazan-widget-order",JSON.stringify([...box.querySelectorAll("[data-widget]")].map(x=>x.dataset.widget)))});box.addEventListener("dragover",e=>{e.preventDefault();const after=[...box.querySelectorAll("[data-widget]:not(.dragging)")].find(el=>e.clientY<el.getBoundingClientRect().top+el.offsetHeight/2),drag=box.querySelector(".dragging");if(drag)box.insertBefore(drag,after||null)});
}

function editor(x){$("entryForm").reset();poster=x?.poster||"";$("entryId").value=x?.id||"";$("formLabel").textContent=x?"EDIT COLLECTION ENTRY":"NEW COLLECTION ENTRY";$("formHeading").innerHTML=x?'EDIT YOUR <em>ARCHIVE.</em>':'ADD TO YOUR <em>ARCHIVE.</em>';$("title").value=x?.title||"";$("category").value=x?.category||"Anime";$("status").value=x?.status||"Plan to Watch";$("genres").value=x?.genres||"";$("year").value=x?.year||"";$("rating").value=x?.rating??"";$("progress").value=x?.progress||"";$("notes").value=x?.notes||"";$("posterPreview").hidden=!poster;if(poster)$("posterPreview").src=poster;$("deleteEntry").hidden=!x;$("editor").showModal()}
function closeEditor(){$("editor").close()}
async function imageData(f){if(!f)return"";if(f.size>12*1024*1024)throw Error("Image must be under 12 MB");return await new Promise((ok,no)=>{let r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)})}
async function save(e){e.preventDefault();let title=$("title").value.trim();if(!title)return;let id=$("entryId").value||crypto.randomUUID(),old=entries.find(x=>x.id===id)||{};let x={...old,id,title,category:$("category").value,status:$("status").value,genres:$("genres").value.trim(),year:$("year").value.trim(),rating:$("rating").value,progress:$("progress").value.trim(),notes:$("notes").value.trim(),poster,createdAt:old.createdAt||Date.now(),updatedAt:Date.now()};$("saveState").textContent="● SAVING";try{await put(x);await refresh();closeEditor();toast(old.id?"ENTRY UPDATED":"ADDED TO YOUR ARCHIVE")}catch(err){console.error(err);toast("SAVE FAILED — CHECK DEVICE STORAGE")}}
async function exportData(){let data={app:"ZAZAN COLLECTIONS",version:3,exportedAt:new Date().toISOString(),entries:await all(),gallery:await allGal()},blob=new Blob([JSON.stringify(data)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="zazan-collections-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast("BACKUP EXPORTED · "+data.entries.length+" ENTRIES")}
async function importData(f){if(!f)return;try{let d=JSON.parse(await f.text()),list=Array.isArray(d)?d:(d.entries||d.items);if(!Array.isArray(list))throw Error();if(!confirm("Restore "+list.length+" entries? Existing entries not in this backup will be kept."))return;for(let x of list)if(x.title)await put({...x,id:x.id||crypto.randomUUID(),createdAt:x.createdAt||Date.now(),updatedAt:Date.now()});if(Array.isArray(d.gallery))for(let x of d.gallery)if(x.src)await putGal({...x,id:x.id||crypto.randomUUID()});await refresh();toast("BACKUP RESTORED")}catch(e){toast("INVALID BACKUP FILE")}finally{$("importFile").value=""}}
$("entryGrid").addEventListener("click",e=>{let c=e.target.closest(".entry-card");if(c)editor(entries.find(x=>x.id===c.dataset.id))});$("entryGrid").addEventListener("keydown",e=>{if(["Enter"," "].includes(e.key)&&e.target.classList.contains("entry-card")){e.preventDefault();editor(entries.find(x=>x.id===e.target.dataset.id))}});
$("tabs").addEventListener("click",e=>{let b=e.target.closest("[data-cat]");if(!b)return;cat=b.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===b));render()});["search","statusFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
["addTop","addArchive","heroAdd"].forEach(id=>$(id).addEventListener("click",()=>editor()));$("entryForm").addEventListener("submit",save);["closeEditor","cancelEditor"].forEach(id=>$(id).addEventListener("click",closeEditor));
$("deleteEntry").addEventListener("click",async()=>{let id=$("entryId").value;if(id&&confirm("Delete this entry permanently?")){await del(id);await refresh();closeEditor();toast("ENTRY DELETED")}});
$("posterInput").addEventListener("change",async e=>{try{poster=await imageData(e.target.files[0]);$("posterPreview").src=poster;$("posterPreview").hidden=!poster}catch(err){toast(err.message)}e.target.value=""});$("removePoster").addEventListener("click",()=>{poster="";$("posterPreview").hidden=true});
$("backupTop").addEventListener("click",exportData);$("exportBtn").addEventListener("click",exportData);$("importFile").addEventListener("change",e=>importData(e.target.files[0]));
$("galleryUpload").addEventListener("change",async e=>{try{for(let f of e.target.files)await putGal({id:crypto.randomUUID(),title:f.name.replace(/\.[^.]+$/,""),src:await imageData(f),createdAt:Date.now()});await refresh();toast("IMAGES ADDED TO GALLERY")}catch(err){toast(err.message||"UPLOAD FAILED")}e.target.value=""});
// Gallery uploads are displayed in the automatic slideshow.
$("closeLightbox").addEventListener("click",()=>$("lightbox").close());$("lightbox").addEventListener("click",e=>{if(e.target===$("lightbox"))$("lightbox").close()});$("clearFilters").addEventListener("click",()=>{$("search").value="";$("statusFilter").value="All";cat="All";document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x.dataset.cat==="All"));render()});
$("mobileMenu").addEventListener("click",()=>$("nav").classList.toggle("open"));$("nav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>$("nav").classList.remove("open")));document.addEventListener("keydown",e=>{if(e.key==="/"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("search").focus()}});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;$("installBtn").hidden=false});$("installBtn").addEventListener("click",async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;$("installBtn").hidden=true}});
renderGallerySettings();
initMotion();
initPremium();
(async()=>{try{db=await openDB();let n=await seed();await refresh();if(n)toast("YOUR "+n+" BACKUP ENTRIES ARE READY");if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{})}catch(e){console.error(e);toast("DATABASE ERROR — RUN THIS SITE OVER HTTPS OR LOCAL SERVER")}})();