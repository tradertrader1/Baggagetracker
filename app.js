(() => {
  "use strict";
  // Demo-only credentials. Change these before publishing; this is NOT secure authentication.
  const DEMO_USERNAME = "staff";
  const DEMO_PASSWORD = "Airport123!";
  const STORAGE_KEY = "baggageTracingDesk_v1";
  const SESSION_KEY = "baggageTracingDesk_session_v1";
  const STATUSES = ["Reported","Tracing in Progress","Baggage Located","Forwarded","Delivered","Closed"];
  const $ = id => document.getElementById(id);
  let cases = loadCases();
  let pendingRestore = null;
  let toastTimer = null;

  function loadCases() {
    try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  }
  function saveCases() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cases)); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function makeId() { return "BT-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
  function statusClass(s) { return s.replaceAll(" ","-"); }
  function badge(s) { return `<span class="status ${statusClass(s)}">${esc(s)}</span>`; }
  function fmtDate(s) { if (!s) return "—"; const d = new Date(`${s}T12:00:00`); return Number.isNaN(d.getTime()) ? esc(s) : d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}); }
  function fmtDateTime(s) { if (!s) return "—"; const d = new Date(s); return Number.isNaN(d.getTime()) ? esc(s) : d.toLocaleString(undefined,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
  function showToast(msg) { const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2800); }
  function safeSession() { try { return sessionStorage.getItem(SESSION_KEY)==="1"; } catch (_) { return false; } }
  function setSignedIn(on) { $("loginView").classList.toggle("hidden",on); $("appView").classList.toggle("hidden",!on); if(on) { $("signedInAs").textContent=DEMO_USERNAME; renderAll(); } }
  $("loginForm").addEventListener("submit", e => { e.preventDefault(); const u=$("loginUser").value.trim(); const p=$("loginPass").value; if(u===DEMO_USERNAME && p===DEMO_PASSWORD) { try{sessionStorage.setItem(SESSION_KEY,"1");}catch(_){} $("loginError").textContent=""; setSignedIn(true); showToast("Signed in successfully"); } else $("loginError").textContent="Incorrect username or password."; });
  $("logoutBtn").addEventListener("click",()=>{try{sessionStorage.removeItem(SESSION_KEY);}catch(_){} setSignedIn(false); $("loginPass").value="";});
  function navigate(page) {
    const pages=["dashboard","cases","reports","backup"];
    if(!pages.includes(page)) page="dashboard";
    pages.forEach(p=>$(p+"Page").classList.toggle("hidden",p!==page));
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    $("pageTitle").textContent=({dashboard:"Dashboard",cases:"Tracing cases",reports:"Reports & export",backup:"Data backup"})[page];
    if(page==="dashboard") renderDashboard(); if(page==="cases") renderCases(); if(page==="reports") renderReports();
  }
  document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  document.querySelectorAll("[data-action='new-case']").forEach(b=>b.addEventListener("click",()=>openCaseForm()));
  function addHistory(record, status, note, action) {
    record.history = Array.isArray(record.history) ? record.history : [];
    record.history.unshift({at:new Date().toISOString(),status,note:note||"",action,by:DEMO_USERNAME});
  }
  function renderAll(){renderDashboard();renderCases();renderReports();}
  function renderDashboard() {
    const total=cases.length, closed=cases.filter(c=>["Delivered","Closed"].includes(c.status)).length;
    const located=cases.filter(c=>["Baggage Located","Forwarded"].includes(c.status)).length;
    $("statTotal").textContent=total; $("statOpen").textContent=total-closed; $("statLocated").textContent=located; $("statClosed").textContent=closed;
    const recent=[...cases].sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,6);
    $("recentCases").innerHTML=recent.length?tableMarkup(recent,false):empty("No tracing cases yet. Create a case to get started.");
    const counts=STATUSES.map(s=>({status:s,count:cases.filter(c=>c.status===s).length}));
    $("statusBreakdown").innerHTML=counts.map(x=>`<div class="status-line"><div class="status-line-head"><span>${esc(x.status)}</span><strong>${x.count}</strong></div><div class="bar"><span style="width:${total?x.count/total*100:0}%"></span></div></div>`).join("");
  }
  function empty(msg){return `<div class="empty-state">${esc(msg)}</div>`;}
  function tableMarkup(rows,actions=true) {
    if(!rows.length)return empty("No records match your filters.");
    return `<table><thead><tr><th>Reference</th><th>Passenger / baggage tag</th><th>Flight / route</th><th>Date reported</th><th>Status</th><th>Last updated</th>${actions?"<th>Action</th>":""}</tr></thead><tbody>${rows.map(c=>`<tr><td><span class="case-ref">${esc(c.ref)}</span></td><td>${esc(c.passenger)}<span class="sub-cell">${esc(c.tag)}</span></td><td>${esc(c.flight||"—")}<span class="sub-cell">${esc(c.route||"—")}</span></td><td>${fmtDate(c.reportDate)}</td><td>${badge(c.status)}</td><td>${fmtDateTime(c.updatedAt)}</td>${actions?`<td><button class="table-action" data-view="${esc(c.id)}">View / edit</button></td>`:""}</tr>`).join("")}</tbody></table>`;
  }
  function bindViewButtons(root) { root.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>openDetail(b.dataset.view))); }
  function getFilteredCases(prefix="") {
    const search=prefix==="case"?$("caseSearch").value.trim().toLowerCase():"";
    const status=prefix==="case"?$("statusFilter").value:"";
    const from=prefix==="case"?$("fromFilter").value:"";
    const to=prefix==="case"?$("toFilter").value:"";
    return [...cases].filter(c=>{
      const hay=[c.ref,c.passenger,c.tag,c.flight,c.route,c.contact,c.description].join(" ").toLowerCase();
      return (!search||hay.includes(search))&&(!status||c.status===status)&&(!from||c.reportDate>=from)&&(!to||c.reportDate<=to);
    }).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));
  }
  function renderCases() { const rows=getFilteredCases("case"); $("caseTable").innerHTML=tableMarkup(rows,true); $("caseCount").textContent=`Showing ${rows.length} of ${cases.length} cases`; bindViewButtons($("caseTable")); }
  ["caseSearch","statusFilter","fromFilter","toFilter"].forEach(id=>$(id).addEventListener(id==="caseSearch"?"input":"change",renderCases));
  $("clearFilters").addEventListener("click",()=>{["caseSearch","statusFilter","fromFilter","toFilter"].forEach(id=>$(id).value="");renderCases();});
  function reportCases() {
    const from=$("reportFrom").value,to=$("reportTo").value,status=$("reportStatus").value;
    return [...cases].filter(c=>(!from||c.reportDate>=from)&&(!to||c.reportDate<=to)&&(!status||c.status===status)).sort((a,b)=>(a.reportDate||"").localeCompare(b.reportDate||""));
  }
  function renderReports() {
    const rows=reportCases(); $("reportTotal").textContent=rows.length;
    $("reportOpen").textContent=rows.filter(c=>!["Delivered","Closed"].includes(c.status)).length;
    $("reportProgress").textContent=rows.filter(c=>["Baggage Located","Forwarded"].includes(c.status)).length;
    $("reportDone").textContent=rows.filter(c=>["Delivered","Closed"].includes(c.status)).length;
    $("reportTable").innerHTML=tableMarkup(rows,false);
  }
  $("applyReport").addEventListener("click",renderReports);
  $("resetReport").addEventListener("click",()=>{["reportFrom","reportTo","reportStatus"].forEach(id=>$(id).value="");renderReports();});
  const CSV_FIELDS=[["Tracing Reference","ref"],["Date Reported","reportDate"],["Passenger Name","passenger"],["Contact Information","contact"],["Baggage Tag Number","tag"],["Flight Number","flight"],["Route / Last Known Location","route"],["Baggage Type","baggageType"],["Color / Identifying Marks","color"],["Description","description"],["Current Status","status"],["Last Updated","updatedAt"],["Latest Note","latestNote"]];
  function exportRows() { return reportCases().map(c=>({...c,latestNote:(c.history||[])[0]?.note||""})); }
  function csvEscape(v) { const s=String(v??""); return `"${s.replace(/"/g,'""')}"`; }
  function download(name,content,type) { const blob=new Blob(["\ufeff",content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url); }
  function exportCsv() { const rows=exportRows(); const csv=[CSV_FIELDS.map(f=>csvEscape(f[0])).join(","),...rows.map(r=>CSV_FIELDS.map(f=>csvEscape(r[f[1]])).join(","))].join("\r\n");download(`baggage-tracing-report-${today()}.csv`,csv,"text/csv;charset=utf-8");showToast(`Exported ${rows.length} records to CSV`); }
  function exportExcel() { const rows=exportRows(); const html=`<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${CSV_FIELDS.map(f=>`<th>${esc(f[0])}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${CSV_FIELDS.map(f=>`<td>${esc(r[f[1]]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;download(`baggage-tracing-report-${today()}.xls`,html,"application/vnd.ms-excel;charset=utf-8");showToast(`Exported ${rows.length} records to Excel-compatible file`); }
  $("exportCsvBtn").addEventListener("click",exportCsv); $("exportExcelBtn").addEventListener("click",exportExcel);

  function openCaseForm(id=null) {
    $("caseForm").reset(); $("editingId").value=id||""; $("reportDate").value=today(); $("caseRef").value="";
    $("modalTitle").textContent=id?"Edit tracing case":"New tracing case";
    const c=id?cases.find(x=>x.id===id):null;
    if(c){$("caseRef").value=c.ref;$("reportDate").value=c.reportDate;$("passengerName").value=c.passenger;$("contactInfo").value=c.contact||"";$("baggageTag").value=c.tag;$("flightNumber").value=c.flight||"";$("route").value=c.route||"";$("baggageType").value=c.baggageType||"Suitcase";$("baggageColor").value=c.color||"";$("currentStatus").value=c.status;$("description").value=c.description||"";$("caseNotes").value="";}
    $("caseModal").classList.remove("hidden");document.body.style.overflow="hidden";setTimeout(()=>$("passengerName").focus(),30);
  }
  function closeCaseForm(){$("caseModal").classList.add("hidden");document.body.style.overflow="";}
  $("closeModal").addEventListener("click",closeCaseForm);$("cancelModal").addEventListener("click",closeCaseForm);
  $("caseModal").addEventListener("click",e=>{if(e.target===$("caseModal"))closeCaseForm();});
  $("caseForm").addEventListener("submit",e=>{
    e.preventDefault();const id=$("editingId").value;let c=id?cases.find(x=>x.id===id):null;
    const ref=$("caseRef").value.trim()||makeId();
    if(cases.some(x=>x.ref.toLowerCase()===ref.toLowerCase()&&x.id!==id)){showToast("That tracing reference already exists");$("caseRef").focus();return;}
    const oldStatus=c?.status; const oldNote=$("caseNotes").value.trim();
    const data={id:id||makeId(),ref,reportDate:$("reportDate").value,passenger:$("passengerName").value.trim(),contact:$("contactInfo").value.trim(),tag:$("baggageTag").value.trim(),flight:$("flightNumber").value.trim(),route:$("route").value.trim(),baggageType:$("baggageType").value,color:$("baggageColor").value.trim(),status:$("currentStatus").value,description:$("description").value.trim(),updatedAt:new Date().toISOString(),history:c?.history||[]};
    if(!c){c=data;cases.push(c);addHistory(c,c.status,oldNote||"Case registered","Case created");}
    else {Object.assign(c,data);if(oldStatus!==c.status||oldNote)addHistory(c,c.status,oldNote,oldStatus!==c.status?"Status updated":"Case details updated");else addHistory(c,c.status,"Case details saved","Case updated");}
    saveCases();closeCaseForm();renderAll();showToast(id?"Case updated successfully":"Tracing case created");
  });
  function openDetail(id) {
    const c=cases.find(x=>x.id===id);if(!c)return;
    $("detailTitle").textContent=c.ref;
    const fields=[["Passenger",c.passenger],["Baggage tag",c.tag],["Date reported",fmtDate(c.reportDate)],["Status",c.status],["Contact",c.contact||"—"],["Flight",c.flight||"—"],["Route / last known location",c.route||"—"],["Baggage type",c.baggageType||"—"],["Color / identifying marks",c.color||"—"]];
    $("detailContent").innerHTML=`<div class="detail-grid">${fields.map(([l,v])=>`<div class="detail-item"><label>${esc(l)}</label><strong>${l==="Status"?badge(v):esc(v)}</strong></div>`).join("")}<div class="detail-item full-span"><label>Description</label><p>${esc(c.description||"No description provided.")}</p></div></div><div class="detail-section"><h3>Case history</h3><div class="history-list">${(c.history||[]).length?c.history.map(h=>`<div class="history-item"><strong>${esc(h.action||"Update")} · ${badge(h.status||c.status)}</strong><small>${fmtDateTime(h.at)} · ${esc(h.by||"Staff")}</small>${h.note?`<p>${esc(h.note)}</p>`:""}</div>`).join(""):empty("No history recorded.")}</div></div><div class="detail-actions"><button class="danger" id="deleteCaseBtn">Delete case</button><button class="btn light" id="closeDetailBtn">Close</button><button class="primary" id="editCaseBtn">Edit / update case</button></div>`;
    $("detailModal").classList.remove("hidden");document.body.style.overflow="hidden";
    $("closeDetailBtn").addEventListener("click",closeDetail,{once:true});
    $("editCaseBtn").addEventListener("click",()=>{closeDetail();openCaseForm(id);},{once:true});
    $("deleteCaseBtn").addEventListener("click",()=>{if(confirm(`Delete tracing case ${c.ref}? This cannot be undone unless you have a backup.`)){cases=cases.filter(x=>x.id!==id);saveCases();closeDetail();renderAll();showToast("Case deleted");}},{once:true});
  }
  function closeDetail(){$("detailModal").classList.add("hidden");document.body.style.overflow="";}
  $("closeDetail").addEventListener("click",closeDetail);$("detailModal").addEventListener("click",e=>{if(e.target===$("detailModal"))closeDetail();});
  $("backupBtn").addEventListener("click",()=>{download(`baggage-tracing-backup-${today()}.json`,JSON.stringify({app:"Baggage Tracing Desk",version:1,exportedAt:new Date().toISOString(),cases},null,2),"application/json");showToast("Backup downloaded");});
  $("restoreFile").addEventListener("change",async e=>{pendingRestore=null;$("mergeRestore").disabled=true;$("replaceRestore").disabled=true;$("restoreMsg").textContent="";const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());const list=Array.isArray(data)?data:data.cases;if(!Array.isArray(list))throw new Error("This file does not contain a case list.");if(!list.every(c=>c&&typeof c==="object"&&c.ref&&c.tag&&c.passenger&&STATUSES.includes(c.status)))throw new Error("One or more records are missing required fields.");pendingRestore=list;$("mergeRestore").disabled=false;$("replaceRestore").disabled=false;$("restoreMsg").textContent=`Ready to restore ${list.length} case(s). Choose merge or replace.`;}catch(err){$("restoreMsg").textContent=err.message||"Could not read this backup file."; }});
  $("mergeRestore").addEventListener("click",()=>{if(!pendingRestore)return;const ids=new Set(cases.map(c=>c.id));const refs=new Set(cases.map(c=>String(c.ref).toLowerCase()));let n=0;pendingRestore.forEach(src=>{if(!refs.has(String(src.ref).toLowerCase())){const c={...src,id:ids.has(src.id)?makeId():src.id,history:Array.isArray(src.history)?src.history:[]};cases.push(c);ids.add(c.id);refs.add(String(c.ref).toLowerCase());n++;}});saveCases();renderAll();$("restoreMsg").textContent=`Merged ${n} new case(s). Existing references were skipped.`;showToast("Backup merged");});
  $("replaceRestore").addEventListener("click",()=>{if(!pendingRestore)return;if(!confirm(`Replace all ${cases.length} current case(s) with ${pendingRestore.length} backup case(s)? Download a backup first if needed.`))return;cases=pendingRestore.map(c=>({...c,history:Array.isArray(c.history)?c.history:[]}));saveCases();renderAll();$("restoreMsg").textContent=`Restored ${cases.length} case(s).`;showToast("Backup restored");});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("caseModal").classList.contains("hidden"))closeCaseForm();if(!$("detailModal").classList.contains("hidden"))closeDetail();}});
  if(safeSession())setSignedIn(true);else setSignedIn(false);
})();
