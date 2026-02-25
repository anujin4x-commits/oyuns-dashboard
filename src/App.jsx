import React, { useState, useEffect } from "react";

const ACCOUNTS = [
  { id: "khan_oyun",  name: "Хаан банк Оюун-Эрдэнэ", type: "personal", currency: "MNT", color: "#1a56db" },
  { id: "khan_tolya", name: "Хаан банк Толя",          type: "personal", currency: "MNT", color: "#0e9f6e" },
  { id: "als_tod",    name: "Алс Тод ББСБ",             type: "org",      currency: "MNT", color: "#f59e0b" },
  { id: "oyuns_rub",  name: "OYUNS",                    type: "org",      currency: "RUB", color: "#7e3af2" },
  { id: "oyuns_usdt", name: "OYUNS",                    type: "org",      currency: "USDT",color: "#06b6d4" },
];
const CUR_FLAG  = { MNT:"🇲🇳", RUB:"🇷🇺", USDT:"💵" };
const CUR_LABEL = { MNT:"Төгрөгийн данс", RUB:"Рублийн данс", USDT:"USDT данс" };
const CUR_SYM   = { MNT:"₮", RUB:"₽", USDT:"USDT" };
const DEFAULT_BAL = Object.fromEntries(ACCOUNTS.map(a => [a.id, 0]));
const today = () => new Date().toISOString().slice(0, 10);

const RATE_PAIRS = [
  { from:"MNT", to:"USDT", label:"MNT → USDT", rateLabel:"1 USDT = ? MNT", multiply:false },
  { from:"MNT", to:"RUB",  label:"MNT → RUB",  rateLabel:"1 RUB = ? MNT",  multiply:false },
  { from:"RUB", to:"MNT",  label:"RUB → MNT",  rateLabel:"1 RUB = ? MNT",  multiply:true  },
  { from:"RUB", to:"USDT", label:"RUB → USDT", rateLabel:"1 USDT = ? RUB", multiply:false },
  { from:"USDT",to:"MNT",  label:"USDT → MNT", rateLabel:"1 USDT = ? MNT", multiply:true  },
  { from:"USDT",to:"RUB",  label:"USDT → RUB", rateLabel:"1 USDT = ? RUB", multiply:true  },
];

function fmt(n, cur) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const s = abs.toLocaleString("mn-MN", { minimumFractionDigits:2, maximumFractionDigits:2 });
  return (n < 0 ? "-" : "") + s + " " + (cur === "USDT" ? "USDT" : CUR_SYM[cur]);
}

// ════════════════════════════════════════════════════
// Apps Script API — allSheets fetch (CORS тойрох арга)
// ════════════════════════════════════════════════════
const SCRIPT_URL = "https://oyuns-dashboard.anujin4x.workers.dev";

const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function apiGet(params, forceRefresh=false) {
  const key = "oyuns_" + new URLSearchParams(params).toString();
  // Кэш шалгах
  if (!forceRefresh) {
    try {
      const c = localStorage.getItem(key);
      if (c) {
        const { ts, data } = JSON.parse(c);
        if (Date.now() - ts < CACHE_TTL) return data;
      }
    } catch(e) {}
  }
  // Шинэ fetch
  const url = SCRIPT_URL + "?" + new URLSearchParams(params);
  const res = await fetch(url, { redirect: "follow", credentials: "omit" });
  const data = await res.json();
  // Хадгалах
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch(e) {}
  return data;
}

function clearApiCache() {
  Object.keys(localStorage).filter(k => k.startsWith("oyuns_")).forEach(k => localStorage.removeItem(k));
}

async function apiPost(body) {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      credentials: "omit",
      body: JSON.stringify(body),
    });
  } catch (e) { /* no-cors — ignore */ }
  return { ok: true };
}

// ── UI helpers ──────────────────────────────────────
const inp = {
  width:"100%", padding:"10px 12px", borderRadius:"10px",
  border:"1.5px solid #e2e8f0", fontSize:"14px", color:"#0f172a",
  background:"#f8fafc", outline:"none", boxSizing:"border-box", fontFamily:"inherit"
};

function Btn({ onClick, children, variant="primary", style:s={} }) {
  const v = { primary:{background:"#1a56db",color:"#fff"}, ghost:{background:"#f1f5f9",color:"#475569"} };
  return <button onClick={onClick} style={{padding:"10px 16px",borderRadius:"10px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"14px",fontFamily:"inherit",...v[variant],...s}}>{children}</button>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.52)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:"18px",width:"100%",maxWidth:"480px",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 14px",borderBottom:"1px solid #e8edf5",position:"sticky",top:0,background:"#fff",borderRadius:"18px 18px 0 0",zIndex:1}}>
          <span style={{fontWeight:800,fontSize:"15px",color:"#0f172a"}}>{title}</span>
          <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"18px",color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"18px 20px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{marginBottom:"13px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"5px"}}>
        <label style={{fontSize:"11px",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>
        {hint && <span style={{fontSize:"11px",color:"#94a3b8"}}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AddTxModal({ acc, onClose, onSave }) {
  const [txType, setTxType] = useState("Орлого");
  const [date, setDate]     = useState(today());
  const [cp, setCp]         = useState("");
  const [amount, setAmount] = useState("");
  const [rateMode, setRateMode] = useState("none");
  const [rate, setRate]     = useState("");
  const [note, setNote]     = useState("");

  const numAmt  = parseFloat(amount) || 0;
  const numRate = parseFloat(rate)   || 0;
  const ratePairs = RATE_PAIRS.filter(p => txType === "Орлого" ? p.to === acc.currency : p.from === acc.currency);
  const selectedPair = RATE_PAIRS.find(p => p.label === rateMode) || null;
  const shouldMultiply = txType === "Орлого" ? !selectedPair?.multiply : selectedPair?.multiply;
  const converted = (numAmt > 0 && numRate > 0 && selectedPair) ? (shouldMultiply ? numAmt * numRate : numAmt / numRate) : null;
  const convertedCur = txType === "Орлого" ? selectedPair?.from : selectedPair?.to;
  const calcHint = selectedPair && numAmt > 0 && numRate > 0
    ? (shouldMultiply ? `${numAmt.toLocaleString("mn-MN")} × ${numRate} = ${fmt(converted, convertedCur)}` : `${numAmt.toLocaleString("mn-MN")} ÷ ${numRate} = ${fmt(converted, convertedCur)}`)
    : null;

  function handleSave() {
    if (!amount || isNaN(numAmt) || numAmt <= 0) { alert("Дүн оруулна уу"); return; }
    onSave({ id:Date.now().toString(), accountId:acc.id, type:txType, amount:numAmt, date, counterparty:cp, rate:selectedPair?`${selectedPair.rateLabel.replace("?",numRate)}`:"", ratePairLabel:selectedPair?.label||"", convertedAmount:converted, convertedCurrency:convertedCur||"", note });
    onClose();
  }

  return (
    <Modal title={`Гүйлгээ — ${acc.name} (${acc.currency})`} onClose={onClose}>
      <Field label="Төрөл">
        <div style={{display:"flex",gap:"8px"}}>
          {["Орлого","Зарлага"].map(t=>(
            <button key={t} onClick={()=>{setTxType(t);setRateMode("none");setRate("");}} style={{flex:1,padding:"10px",border:"2px solid",borderRadius:"10px",cursor:"pointer",fontWeight:700,fontSize:"14px",fontFamily:"inherit",borderColor:txType===t?(t==="Орлого"?"#0e9f6e":"#ef4444"):"#e2e8f0",background:txType===t?(t==="Орлого"?"#d1fae5":"#fee2e2"):"#f8fafc",color:txType===t?(t==="Орлого"?"#065f46":"#991b1b"):"#64748b"}}>
              {t==="Орлого"?"↓ Орлого":"↑ Зарлага"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Огноо"><input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      <Field label="Харилцагч"><input style={inp} value={cp} onChange={e=>setCp(e.target.value)} placeholder="Компани / хүний нэр"/></Field>
      <Field label={`Дүн (${acc.currency})`}><input style={inp} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
      <Field label="Ханш хөрвүүлэлт">
        <select style={{...inp,cursor:"pointer"}} value={rateMode} onChange={e=>{setRateMode(e.target.value);setRate("");}}>
          <option value="none">{acc.currency} (ханш хэрэггүй)</option>
          {ratePairs.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}
        </select>
      </Field>
      {selectedPair && (
        <Field label={selectedPair.rateLabel}>
          <input style={inp} type="number" value={rate} onChange={e=>setRate(e.target.value)} placeholder="0.00"/>
          {calcHint && <div style={{marginTop:"6px",fontSize:"12px",color:"#94a3b8",paddingLeft:"2px"}}>{calcHint}</div>}
        </Field>
      )}
      <Field label="Тайлбар"><input style={inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Нэмэлт тайлбар"/></Field>
      <div style={{display:"flex",gap:"10px",marginTop:"6px"}}>
        <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Болих</Btn>
        <Btn onClick={handleSave} style={{flex:1}}>Хадгалах</Btn>
      </div>
    </Modal>
  );
}

function TxHistoryModal({ acc, transactions, onClose, onDelete }) {
  const txs = transactions.filter(t=>t.accountId===acc.id).sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <Modal title={`Хуулга — ${acc.name} (${acc.currency})`} onClose={onClose}>
      {txs.length===0
        ? <div style={{textAlign:"center",color:"#94a3b8",padding:"32px 0",fontSize:"14px"}}>Гүйлгээ байхгүй</div>
        : <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {txs.map(tx=>(
              <div key={tx.id} style={{background:"#f8fafc",borderRadius:"10px",padding:"12px",borderLeft:`4px solid ${tx.type==="Орлого"?"#0e9f6e":"#ef4444"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap",marginBottom:"4px"}}>
                      <span style={{fontSize:"11px",fontWeight:700,padding:"2px 8px",borderRadius:"6px",background:tx.type==="Орлого"?"#d1fae5":"#fee2e2",color:tx.type==="Орлого"?"#065f46":"#991b1b"}}>{tx.type}</span>
                      <span style={{fontWeight:800,fontSize:"14px",color:tx.type==="Орлого"?"#0e9f6e":"#ef4444"}}>{tx.type==="Орлого"?"+":"-"}{fmt(tx.amount,acc.currency)}</span>
                    </div>
                    {tx.convertedAmount && tx.convertedCurrency && <div style={{fontSize:"12px",color:"#7e3af2",marginBottom:"3px",fontWeight:600}}>≈ {fmt(tx.convertedAmount,tx.convertedCurrency)} ({tx.ratePairLabel})</div>}
                    <div style={{fontSize:"12px",color:"#475569"}}>{tx.date}{tx.counterparty?` · ${tx.counterparty}`:""}</div>
                    {tx.rate && <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>Ханш: {tx.rate}</div>}
                    {tx.note && <div style={{fontSize:"12px",color:"#64748b",marginTop:"2px",fontStyle:"italic"}}>{tx.note}</div>}
                  </div>
                  <button onClick={()=>onDelete(tx.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:"16px",padding:"0 4px"}}>🗑</button>
                </div>
              </div>
            ))}
          </div>
      }
    </Modal>
  );
}

function EditBalModal({ acc, bal, onClose, onSave }) {
  const [val, setVal] = useState(bal);
  return (
    <Modal title={`Үлдэгдэл засах — ${acc.name}`} onClose={onClose}>
      <Field label={`Үлдэгдэл (${acc.currency})`}>
        <input style={inp} type="number" value={val} onChange={e=>setVal(Number(e.target.value))}/>
      </Field>
      <div style={{display:"flex",gap:"10px",marginTop:"6px"}}>
        <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Болих</Btn>
        <Btn onClick={()=>{onSave(acc.id,val);onClose();}} style={{flex:1}}>Хадгалах</Btn>
      </div>
    </Modal>
  );
}

function BalanceCard({ acc, bal, onEdit, onViewTx, onAddTx }) {
  return (
    <div style={{background:"#fff",borderRadius:"16px",padding:"18px 18px 14px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"1px solid #e8edf5",borderLeft:`5px solid ${acc.color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"10px",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"3px"}}>{acc.type==="personal"?"Хувь данс":"Байгууллагын данс"}</div>
          <div style={{fontWeight:800,fontSize:"15px",color:"#0f172a"}}>{acc.name}</div>
        </div>
        <button onClick={()=>onEdit(acc.id)} style={{background:"#f1f5f9",border:"none",borderRadius:"8px",padding:"6px 9px",cursor:"pointer",fontSize:"14px",color:"#64748b"}}>✏️</button>
      </div>
      <div style={{background:acc.color+"11",borderRadius:"12px",padding:"14px 16px",marginBottom:"12px",textAlign:"center"}}>
        <div style={{fontSize:"11px",fontWeight:700,color:acc.color,marginBottom:"4px",letterSpacing:"0.06em"}}>ҮЛДЭГДЭЛ</div>
        <div style={{fontWeight:900,fontSize:"24px",color:bal>=0?"#0f172a":"#ef4444"}}>{fmt(bal,acc.currency)}</div>
      </div>
      <div style={{display:"flex",gap:"8px"}}>
        <button onClick={()=>onAddTx(acc.id)} style={{flex:1,padding:"9px",background:acc.color,border:"none",borderRadius:"10px",cursor:"pointer",fontSize:"13px",color:"#fff",fontWeight:700,fontFamily:"inherit"}}>+ Гүйлгээ</button>
        <button onClick={()=>onViewTx(acc.id)} style={{flex:1,padding:"9px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",fontSize:"13px",color:"#475569",fontWeight:600,fontFamily:"inherit"}}>📋 Хуулга</button>
      </div>
    </div>
  );
}

function AddDebtModal({ onClose, onSave }) {
  const [form, setForm] = useState({debtType:"Авлага",name:"",date:today(),amount:"",currency:"MNT",note:"",status:"Хүлээгдэж буй"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  function save() {
    if (!form.name||!form.amount){alert("Нэр болон дүн оруулна уу");return;}
    onSave({...form,amount:Number(form.amount),id:Date.now().toString()});
    onClose();
  }
  return (
    <Modal title="Авлага / Зээл оруулах" onClose={onClose}>
      <Field label="Төрөл">
        <div style={{display:"flex",gap:"8px"}}>
          {["Авлага","Зээл"].map(t=>(
            <button key={t} onClick={()=>set("debtType",t)} style={{flex:1,padding:"10px",border:"2px solid",borderRadius:"10px",cursor:"pointer",fontWeight:700,fontSize:"14px",fontFamily:"inherit",borderColor:form.debtType===t?(t==="Авлага"?"#1a56db":"#f59e0b"):"#e2e8f0",background:form.debtType===t?(t==="Авлага"?"#dbeafe":"#fef3c7"):"#f8fafc",color:form.debtType===t?(t==="Авлага"?"#1e40af":"#92400e"):"#64748b"}}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Нэр"><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Компани / хүний нэр"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        <Field label="Дүн"><input style={inp} type="number" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0"/></Field>
        <Field label="Валют">
          <select style={{...inp,cursor:"pointer"}} value={form.currency} onChange={e=>set("currency",e.target.value)}>
            {["MNT","RUB","USDT"].map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Огноо"><input style={inp} type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></Field>
      <Field label="Тайлбар"><input style={inp} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Нэмэлт тайлбар"/></Field>
      <div style={{display:"flex",gap:"10px",marginTop:"6px"}}>
        <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Болих</Btn>
        <Btn onClick={save} style={{flex:1}}>Хадгалах</Btn>
      </div>
    </Modal>
  );
}

function DebtSection({ debts, onAdd, onToggle, onDelete }) {
  const pending = debts.filter(d=>d.status==="Хүлээгдэж буй");
  const paid    = debts.filter(d=>d.status==="Төлөгдсөн");
  function Card({d}) {
    return (
      <div style={{background:"#fff",borderRadius:"12px",padding:"13px 14px",border:"1px solid #e8edf5",borderLeft:`4px solid ${d.debtType==="Авлага"?"#1a56db":"#f59e0b"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap",marginBottom:"4px"}}>
              <span style={{fontSize:"11px",fontWeight:700,padding:"2px 8px",borderRadius:"6px",background:d.debtType==="Авлага"?"#dbeafe":"#fef3c7",color:d.debtType==="Авлага"?"#1e40af":"#92400e"}}>{d.debtType}</span>
              <span style={{fontWeight:800,color:"#0f172a",fontSize:"14px"}}>{d.name}</span>
            </div>
            <div style={{fontSize:"13px",color:"#475569"}}><strong>{fmt(d.amount,d.currency)}</strong> · {d.date}</div>
            {d.note && <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px",fontStyle:"italic"}}>{d.note}</div>}
          </div>
          <div style={{display:"flex",gap:"6px",marginLeft:"8px"}}>
            <button onClick={()=>onToggle(d.id)} style={{background:d.status==="Хүлээгдэж буй"?"#d1fae5":"#f1f5f9",border:"none",borderRadius:"8px",padding:"6px 10px",cursor:"pointer",fontSize:"13px",color:d.status==="Хүлээгдэж буй"?"#065f46":"#64748b"}}>{d.status==="Хүлээгдэж буй"?"✓":"↩"}</button>
            <button onClick={()=>onDelete(d.id)} style={{background:"#fee2e2",border:"none",borderRadius:"8px",padding:"6px 9px",cursor:"pointer",fontSize:"13px",color:"#991b1b"}}>🗑</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <h2 style={{margin:0,fontSize:"16px",fontWeight:800,color:"#0f172a"}}>Авлага / Зээл</h2>
        <Btn onClick={onAdd}>+ Нэмэх</Btn>
      </div>
      {debts.length===0
        ? <div style={{textAlign:"center",padding:"32px",color:"#94a3b8",background:"#f8fafc",borderRadius:"12px",fontSize:"14px"}}>Бүртгэл байхгүй байна</div>
        : <>
            {pending.length>0 && <div style={{marginBottom:"16px"}}><div style={{fontSize:"11px",fontWeight:700,color:"#94a3b8",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Хүлээгдэж буй ({pending.length})</div><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{pending.map(d=><Card key={d.id} d={d}/>)}</div></div>}
            {paid.length>0 && <div style={{opacity:0.65}}><div style={{fontSize:"11px",fontWeight:700,color:"#94a3b8",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Төлөгдсөн ({paid.length})</div><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{paid.map(d=><Card key={d.id} d={d}/>)}</div></div>}
          </>
      }
    </div>
  );
}


// ════════════════════════════════
// FINANCE DASHBOARD COMPONENT
// ════════════════════════════════

// ══════════════════════════════════════════════════
// FINANCE DASHBOARD — Гүйлгээний мэдээлэл
// ══════════════════════════════════════════════════

function fmtMNT(n) {
  if (!n && n !== 0) return "₮0";
  const num = Number(n);
  return (num<0?"-₮":"₮") + Math.abs(num).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtMNTFull(n) {
  if (!n && n!==0) return "₮0";
  const num = Number(n);
  return (num<0?"-₮":"₮") + Math.abs(num).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtUSD(n) {
  if (!n && n!==0) return "$0.00";
  return (Number(n)<0?"-$":"$") + Math.abs(Number(n)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

function StatCard({label, value, sub, color, icon}) {
  return (
    <div style={{background:"#fff",borderRadius:"14px",padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:`5px solid ${color}`}}>
      <div style={{fontSize:"11px",fontWeight:700,color:color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"8px"}}>{icon} {label}</div>
      <div style={{fontWeight:900,fontSize:"20px",color:"#0f172a",lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"5px"}}>{sub}</div>}
    </div>
  );
}


function LiveClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  // Монголын цаг: UTC+8 (Улаанбаатар)
  const UB_OFFSET = 8 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const mn = new Date(utcMs + UB_OFFSET * 60000);
  const yy = mn.getFullYear();
  const mo = String(mn.getMonth()+1).padStart(2,'0');
  const dd = String(mn.getDate()).padStart(2,'0');
  const hh = String(mn.getHours()).padStart(2,'0');
  const mm = String(mn.getMinutes()).padStart(2,'0');
  const ss = String(mn.getSeconds()).padStart(2,'0');
  return (
    <div style={{textAlign:"right"}}>
      <div style={{fontSize:"18px",fontWeight:900,color:"#fff",letterSpacing:"0.05em",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{hh}:{mm}:{ss}</div>
      <div style={{fontSize:"11px",color:"#93c5fd",marginTop:"2px",fontWeight:600}}>{yy}.{mo}.{dd}</div>
    </div>
  );
}


function LineChart({ data, divider }) {
  const W = 600, H = 160, PAD = { t:20, r:16, b:32, l:80 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  if (!data || !data.length) return <div style={{color:"#94a3b8",fontSize:"13px",padding:"30px 0",textAlign:"center"}}>Өгөгдөл байхгүй</div>;

  const vals = data.map(([,v]) => v.profitMNT);
  const minV = Math.min(...vals, 0);
  const maxV = Math.max(...vals, 0);
  const range = maxV - minV || 1;

  function xPos(i) { return PAD.l + (i / Math.max(data.length-1,1)) * iW; }
  function yPos(v) { return PAD.t + iH - ((v - minV) / range) * iH; }

  const pts = data.map(([,v],i) => `${xPos(i)},${yPos(v.profitMNT)}`).join(" ");
  const zeroY = yPos(0);

  // 5 Y tick
  const tickCount = 4;
  const ticks = Array.from({length:tickCount+1},(_,i)=>minV + (maxV-minV)*i/tickCount).map(v=>({v,y:yPos(v)}));

  // Label: сар бол "MM", өдөр бол "DD", 7хон бол "DD"
  function xLabel(k) {
    if (!k || k==="?") return "";
    if (k.length===7) return k.slice(5); // YYYY-MM → MM
    return k.slice(5).replace("-","/");   // YYYY-MM-DD → MM/DD
  }

  const showEvery = data.length > 20 ? Math.ceil(data.length/10) : data.length > 10 ? 2 : 1;

  return (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:"280px",height:`${H}px`,display:"block"}}>
        <defs>
          <linearGradient id="lg_g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e9f6e" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#0e9f6e" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lg_r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12"/>
          </linearGradient>
        </defs>
        {/* Grid */}
        {ticks.map((t,i) => (
          <g key={i}>
            <line x1={PAD.l} y1={t.y} x2={W-PAD.r} y2={t.y} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={PAD.l-6} y={t.y+4} textAnchor="end" fontSize="9" fill="#94a3b8">
              {t.v===0?"0":t.v>=1e6?(t.v/1e6).toFixed(1)+"M":t.v>=1e3?(t.v/1e3).toFixed(0)+"K":t.v.toFixed(0)}
            </text>
          </g>
        ))}
        {/* Zero line */}
        <line x1={PAD.l} y1={zeroY} x2={W-PAD.r} y2={zeroY} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4,3"/>
        {/* Divider: өмнөх period vs тухайн */}
        {divider!=null && divider>0 && divider<data.length && (
          <g>
            <line x1={xPos(divider-0.5)} y1={PAD.t} x2={xPos(divider-0.5)} y2={H-PAD.b} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="6,3"/>
            <text x={xPos(Math.floor(divider/2))} y={PAD.t-4} textAnchor="middle" fontSize="8" fill="#94a3b8">өмнөх</text>
            <text x={xPos(divider+Math.floor((data.length-divider)/2))} y={PAD.t-4} textAnchor="middle" fontSize="8" fill="#1a56db">тухайн</text>
          </g>
        )}
        {/* Area above zero */}
        <path d={`M${xPos(0)},${zeroY} ${data.map(([,v],i)=>`L${xPos(i)},${yPos(v.profitMNT)}`).join(" ")} L${xPos(data.length-1)},${zeroY} Z`}
          fill="url(#lg_g)" opacity="0.8"/>
        {/* Area below zero */}
        <path d={`M${xPos(0)},${zeroY} ${data.map(([,v],i)=>`L${xPos(i)},${yPos(v.profitMNT)}`).join(" ")} L${xPos(data.length-1)},${zeroY} Z`}
          fill="url(#lg_r)" opacity="0.8"/>
        {/* Line */}
        <polyline points={pts} fill="none" stroke="#0e9f6e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Dots */}
        {data.map(([k,v],i) => {
          const cx = xPos(i), cy = yPos(v.profitMNT);
          const col = v.profitMNT>=0?"#0e9f6e":"#ef4444";
          return (
            <g key={k}>
              <circle cx={cx} cy={cy} r="3" fill={col} stroke="#fff" strokeWidth="1.5"/>
              {i%showEvery===0 && (
                <text x={cx} y={H-4} textAnchor="middle" fontSize="8" fill="#94a3b8"
                  transform={data.length>12?`rotate(-40,${cx},${H-4})`:""}>{xLabel(k)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniBar({value, max, color}) {
  const pct = max > 0 ? Math.min((Math.abs(value)/max)*100, 100) : 0;
  return (
    <div style={{background:"#f1f5f9",borderRadius:"4px",height:"6px",overflow:"hidden",marginTop:"4px"}}>
      <div style={{background:color,height:"100%",borderRadius:"4px",width:`${pct}%`,transition:"width 0.4s ease"}}/>
    </div>
  );
}

function FinanceDashboard({ rows, loading, search, setSearch, status, setStatus, month, setMonth, period, setPeriod, onRefresh, lastLoaded }) {
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Unique months
  const months = ["Бүгд", ...Array.from(new Set(
    rows.map(r => r.date?.slice(0,7)).filter(Boolean)
  )).sort().reverse()];

  const statuses = ["Бүгд", "Амжилттай", "Хүлээгдэж буй", "Цуцласан"];

  // Filter
  const q = search.toLowerCase();
  const filtered = rows.filter(r => {
    let mOk = false;
    if (month==="Бүгд") {
      mOk = true;
    } else if (period==="өдөр") {
      mOk = r.date?.slice(0,10) === month;
    } else if (period==="долоо хоног") {
      // month = "YYYY-MM-DD" (долоо хоногийн Даваа)
      const rDate = r.date?.slice(0,10);
      if (rDate) {
        const start = new Date(month);
        const end   = new Date(month); end.setDate(end.getDate()+6);
        const rd    = new Date(rDate);
        mOk = rd >= start && rd <= end;
      }
    } else {
      // сар: month = "YYYY-MM"
      mOk = r.date?.startsWith(month);
    }
    const sOk = status==="Бүгд" || r.txStatus===status;
    const qOk = !q || r.counterparty?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.invoice?.toLowerCase().includes(q) || r.admin?.toLowerCase().includes(q);
    return mOk && sOk && qOk;
  });

  // Sort
  const sorted = [...filtered].sort((a,b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") return av.localeCompare(bv) * sortDir;
    return ((av||0) - (bv||0)) * sortDir;
  });

  // admin = гүйцэтгэгчийн төлөв: Баталгаажсан / Хяналтанд
  // txStatus = гүйлгээний төлөв: Амжилттай / Хүлээгдэж буй / Цуцласан
  // Амжилттай + Хүлээгдэж буй хоёуланг stat-д оруулна
  const conf     = filtered.filter(r => r.txStatus === "Амжилттай" || r.txStatus === "Хүлээгдэж буй" || r.txStatus === "Хүлээгдэж байгаа");
  const waiting  = filtered.filter(r => r.txStatus === "Хүлээгдэж буй" || r.txStatus === "Хүлээгдэж байгаа");
  const success  = filtered.filter(r => r.txStatus === "Амжилттай");
  const cancelled= filtered.filter(r => r.txStatus === "Цуцласан" || r.txStatus === "Цуцлагдсан");

  const totProfMNT  = success.reduce((s,r)=>s+(r.profitMNT||0),0);
  const totProfUSD  = success.reduce((s,r)=>s+(r.profitUSD||0),0);
  const totTotal    = conf.reduce((s,r)=>s+(r.totalPrice||0),0);
  const totReceived = conf.reduce((s,r)=>s+(r.received||0),0);
  const totDiff     = conf.reduce((s,r)=>s+(r.difference||0),0);
  const totCancelled= cancelled.reduce((s,r)=>s+(r.amount||0),0);
  const waitingTotal= waiting.reduce((s,r)=>s+(r.totalPrice||0),0);
  const waitingProfit=waiting.reduce((s,r)=>s+(r.profitMNT||0),0);
  // Орж ирээгүй гүйлгээ: амжилттай боловч received < totalPrice
  const unpaidRows  = success.filter(r=>(r.totalPrice||0)>0 && (r.received||0)<(r.totalPrice||0));
  const unpaidTotal = unpaidRows.reduce((s,r)=>s+((r.totalPrice||0)-(r.received||0)),0);
  const collectionRate = totTotal>0 ? (totReceived/totTotal*100) : null;

  // ── Өмнөх period-тэй харьцуулалт (өдөр/7хон/сар) ──
  function getPrevPeriodRows() {
    if (month==="Бүгд") return [];
    const succ = rows.filter(r=>r.txStatus==="Амжилттай");
    if (period==="өдөр") {
      // өмнөх өдөр
      const d = new Date(month); d.setDate(d.getDate()-1);
      const prev = d.toISOString().slice(0,10);
      return succ.filter(r=>r.date?.slice(0,10)===prev);
    } else if (period==="долоо хоног") {
      // month = Даваа хоног → 7 хоног өмнөх Даваа
      const d = new Date(month); d.setDate(d.getDate()-7);
      const prevMon = d.toISOString().slice(0,10);
      const prevSun = new Date(d); prevSun.setDate(prevSun.getDate()+6);
      return succ.filter(r=>{
        const rd = r.date?.slice(0,10);
        return rd && rd>=prevMon && rd<=prevSun.toISOString().slice(0,10);
      });
    } else {
      // сар → өмнөх сар
      const [y,m2] = month.slice(0,7).split("-").map(Number);
      const pm = m2===1?12:m2-1, py = m2===1?y-1:y;
      const prevKey = `${py}-${String(pm).padStart(2,"0")}`;
      return succ.filter(r=>r.date?.startsWith(prevKey));
    }
  }
  const prevRows    = getPrevPeriodRows();
  const prevProfMNT = prevRows.reduce((s,r)=>s+(r.profitMNT||0),0);
  const prevTotal   = prevRows.reduce((s,r)=>s+(r.totalPrice||0),0);
  const profitChange = prevProfMNT!==0 ? ((totProfMNT-prevProfMNT)/Math.abs(prevProfMNT)*100) : null;
  const totalChange  = prevTotal!==0   ? ((totTotal-prevTotal)/Math.abs(prevTotal)*100) : null;
  // Харуулах label
  const prevLabel = period==="өдөр"?"Өчигдөр":period==="долоо хоног"?"Өмнөх 7 хон":"Өмнөх сар";

  // ── GRAPH DATA ──
  // Өдрөөр: тухайн өдөр + өмнөх өдрийг харьцуулах (2 цэг)
  // 7 хоног: тухайн 7 хоног + өмнөх 7 хоног (14 өдөр)
  // Сар: олон сарын trend (сүүлийн 24 сар)
  function buildGraphData() {
    const succ = rows.filter(r=>r.txStatus==="Амжилттай");
    if (period==="өдөр" && month!=="Бүгд") {
      // Өмнөх өдөр + тухайн өдөр
      const d = new Date(month); d.setDate(d.getDate()-1);
      const prevDay = d.toISOString().slice(0,10);
      const days = [prevDay, month];
      return days.map(day => {
        const dayRows = succ.filter(r=>r.date?.slice(0,10)===day);
        return [day, {
          profitMNT: dayRows.reduce((s,r)=>s+(r.profitMNT||0),0),
          profitUSD: dayRows.reduce((s,r)=>s+(r.profitUSD||0),0),
          amount:    dayRows.reduce((s,r)=>s+(r.amount||0),0),
          count:     dayRows.length
        }];
      });
    } else if (period==="долоо хоног" && month!=="Бүгд") {
      // Өмнөх 7 хоног + тухайн 7 хоног → өдрөөр задал (14 өдөр)
      const start = new Date(month); start.setDate(start.getDate()-7);
      const result = [];
      for (let i=0; i<14; i++) {
        const d = new Date(start); d.setDate(start.getDate()+i);
        const ds = d.toISOString().slice(0,10);
        const dayRows = succ.filter(r=>r.date?.slice(0,10)===ds);
        result.push([ds, {
          profitMNT: dayRows.reduce((s,r)=>s+(r.profitMNT||0),0),
          profitUSD: dayRows.reduce((s,r)=>s+(r.profitUSD||0),0),
          amount:    dayRows.reduce((s,r)=>s+(r.amount||0),0),
          count:     dayRows.length
        }]);
      }
      return result;
    } else {
      // Сар: сүүлийн 24 сарын trend (бүгд rows-аас)
      const gm = {};
      succ.forEach(r => {
        const k = r.date?.slice(0,7)||"?";
        if (!gm[k]) gm[k]={profitMNT:0,profitUSD:0,amount:0,count:0};
        gm[k].profitMNT += r.profitMNT||0;
        gm[k].profitUSD += r.profitUSD||0;
        gm[k].amount    += r.amount||0;
        gm[k].count++;
      });
      return Object.entries(gm).sort((a,b)=>a[0].localeCompare(b[0])).slice(-24);
    }
  }
  const graphData = buildGraphData();
  const graphDivider = (period==="долоо хоног" && month!=="Бүгд") ? 7 : null;
  const maxProfit = Math.max(...graphData.map(([,v])=>Math.abs(v.profitMNT)),1);

  // ── Хамгийн идэвхтэй өдөр/сар ──
  const allSucc = rows.filter(r=>r.txStatus==="Амжилттай");
  // Өдрөөр задлах
  const dayMap = {};
  allSucc.forEach(r=>{
    const d = r.date?.slice(0,10); if(!d) return;
    if(!dayMap[d]) dayMap[d]={profit:0,count:0};
    dayMap[d].profit += r.profitMNT||0;
    dayMap[d].count++;
  });
  // Сараар задлах
  const monMap = {};
  allSucc.forEach(r=>{
    const m = r.date?.slice(0,7); if(!m) return;
    if(!monMap[m]) monMap[m]={profit:0,count:0};
    monMap[m].profit += r.profitMNT||0;
    monMap[m].count++;
  });
  // Гарагаар задлах (0=Ням..6=Бямба)
  const dowLabels = ["Ням","Дав","Мяг","Лха","Пүр","Баа","Бям"];
  const dowMap = {0:{profit:0,count:0},1:{profit:0,count:0},2:{profit:0,count:0},3:{profit:0,count:0},4:{profit:0,count:0},5:{profit:0,count:0},6:{profit:0,count:0}};
  allSucc.forEach(r=>{
    const d = r.date?.slice(0,10); if(!d) return;
    const dow = new Date(d).getDay();
    dowMap[dow].profit += r.profitMNT||0;
    dowMap[dow].count++;
  });
  const bestDay  = Object.entries(dayMap).sort((a,b)=>b[1].profit-a[1].profit)[0];
  const bestMon  = Object.entries(monMap).sort((a,b)=>b[1].profit-a[1].profit)[0];
  const bestDow  = Object.entries(dowMap).sort((a,b)=>b[1].profit-a[1].profit)[0];
  const worstDow = Object.entries(dowMap).filter(([,v])=>v.count>0).sort((a,b)=>a[1].profit-b[1].profit)[0];

  // ── TOP COUNTERPARTIES ──
  // cpMapAll: БҮГД амжилттай гүйлгээнээс recency/cold тооцно (filter хамаарахгүй)
  const cpMapAll = {};
  rows.filter(r=>r.txStatus==="Амжилттай").forEach(r => {
    const cp = r.counterparty||"Тодорхойгүй";
    if (!cpMapAll[cp]) cpMapAll[cp]={count:0,lastDate:"",firstDate:""};
    cpMapAll[cp].count++;
    if (!cpMapAll[cp].lastDate || r.date > cpMapAll[cp].lastDate) cpMapAll[cp].lastDate = r.date;
    if (!cpMapAll[cp].firstDate || r.date < cpMapAll[cp].firstDate) cpMapAll[cp].firstDate = r.date;
  });
  const todayDate = new Date();
  function daysSince(dateStr) {
    if (!dateStr) return 999;
    return Math.floor((todayDate - new Date(dateStr)) / 86400000);
  }
  // CRM: зөвхөн хугацааны filter хэрэглэнэ (статус, хайлт filter хамаарахгүй)
  // ингэснээр сонгосон өдөр/7хон/сарын БҮГД харилцагч харагдана
  const timeFiltered = rows.filter(r => {
    let mOk = false;
    if (month==="Бүгд") { mOk = true; }
    else if (period==="өдөр") { mOk = r.date?.slice(0,10) === month; }
    else if (period==="долоо хоног") {
      const rDate = r.date?.slice(0,10);
      if (rDate) {
        const start = new Date(month);
        const end = new Date(month); end.setDate(end.getDate()+6);
        mOk = new Date(rDate) >= start && new Date(rDate) <= end;
      }
    } else { mOk = r.date?.startsWith(month); }
    return mOk;
  });
  const cpFiltered = timeFiltered.filter(r => r.txStatus==="Амжилттай");
  const cpMap = {};
  cpFiltered.forEach(r => {
    const cp = r.counterparty||"Тодорхойгүй";
    if (!cpMap[cp]) cpMap[cp]={amount:0,profitMNT:0,profitUSD:0,count:0,lastDate:"",months:{}};
    cpMap[cp].amount    += r.amount||0;
    cpMap[cp].profitMNT += r.profitMNT||0;
    cpMap[cp].profitUSD += r.profitUSD||0;
    cpMap[cp].count++;
    if (!cpMap[cp].lastDate || r.date > cpMap[cp].lastDate) cpMap[cp].lastDate = r.date;
    const mk = r.date?.slice(0,7)||"";
    if (mk) cpMap[cp].months[mk] = (cpMap[cp].months[mk]||0) + (r.profitMNT||0);
  });
  // Бүгдийг ашгаар эрэмбэл (хязгааргүй)
  const topCP = Object.entries(cpMap).sort((a,b)=>b[1].profitMNT-a[1].profitMNT);
  const maxCPProfit = Math.max(...topCP.map(([,v])=>v.profitMNT),1);

  // ── CATEGORY ──
  const catMap = {};
  conf.forEach(r => {
    const c = r.category||"Бусад";
    if (!catMap[c]) catMap[c]={amount:0,profitMNT:0,count:0};
    catMap[c].amount    += r.amount||0;
    catMap[c].profitMNT += r.profitMNT||0;
    catMap[c].count++;
  });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1].profitMNT-a[1].profitMNT).slice(0,6);

  const COLORS = ["#1a56db","#0e9f6e","#7e3af2","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899"];

  const cardStyle = {background:"#fff",borderRadius:"14px",padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden"};

  function SortTh({col,label}) {
    return <th onClick={()=>{setSortCol(col);setSortDir(sortCol===col?-sortDir:-1);setPage(0);}}
      style={{padding:"9px 10px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",cursor:"pointer",whiteSpace:"nowrap",userSelect:"none",fontSize:"11px"}}>
      {label} {sortCol===col?(sortDir===-1?"↓":"↑"):""}
    </th>;
  }

  if (loading) return <div style={{textAlign:"center",padding:"80px",color:"#94a3b8",fontSize:"14px",fontWeight:600}}>⏳ Ачааллаж байна...</div>;
  if (!rows.length) return <div style={{textAlign:"center",padding:"80px",color:"#94a3b8",fontSize:"14px"}}>Өгөгдөл олдсонгүй</div>;

  const pageRows = sorted.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length/PAGE_SIZE);

  return (
    <div style={{paddingBottom:"50px"}}>

      {/* ── FILTERS ── */}
      <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
          placeholder="🔍 Харилцагч / Invoice / Тайлбар..."
          style={{flex:"1",minWidth:"180px",padding:"10px 14px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",outline:"none",background:"#fff"}}/>
        <select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}
          style={{padding:"10px 12px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
          {statuses.map(s=><option key={s}>{s}</option>)}
        </select>
        {/* Хугацааны filter */}
        {(()=>{
          const btnSt = (active) => ({
            padding:"9px 11px", borderRadius:"8px", border:"1.5px solid #e2e8f0",
            fontSize:"12px", fontFamily:"inherit", fontWeight:700, cursor:"pointer",
            background:active?"#1a56db":"#fff", color:active?"#fff":"#64748b"
          });
          // Долоо хоногийн Даваа хоног тооцоо
          function getMondayOf(dateStr) {
            const d = new Date(dateStr);
            const day = d.getDay()||7; // 1=Mon..7=Sun
            d.setDate(d.getDate() - day + 1);
            return d.toISOString().slice(0,10);
          }
          function fmtWeekLabel(monStr) {
            const start = new Date(monStr);
            const end   = new Date(monStr); end.setDate(end.getDate()+6);
            const fmt = d => `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
            return `${fmt(start)}-${fmt(end)}`;
          }
          function fmtDayLabel(dateStr) {
            if (!dateStr || dateStr==="Бүгд") return "";
            const d = new Date(dateStr);
            return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
          }
          const isDay  = period==="өдөр";
          const isWeek = period==="долоо хоног";
          const isMon  = period==="сар";
          // Одоогийн утгаас харгалзах picker утга гаргах
          const dayVal  = isDay  && month!=="Бүгд" ? month : "";
          const weekVal = isWeek && month!=="Бүгд" ? month : "";
          const monVal  = isMon  && month!=="Бүгд" ? month.slice(0,7) : "";
          return (
            <div style={{display:"flex",gap:"4px",alignItems:"center",flexWrap:"wrap"}}>
              {/* 3 toggle */}
              <div style={{display:"flex",gap:"2px",background:"#f1f5f9",borderRadius:"10px",padding:"3px"}}>
                {[["өдөр","Өдөр"],["долоо хоног","7 хон"],["сар","Сар"]].map(([p,l])=>(
                  <button key={p} onClick={()=>{
                    setPeriod(p);
                    // Одоогийн month-г шинэ period-д тохируулан хөрвүүл
                    const today = new Date();
                    const td = today.toISOString().slice(0,10);
                    if (p==="өдөр")        setMonth(month!=="Бүгд" ? month.slice(0,10) : td);
                    else if (p==="долоо хоног") setMonth(month!=="Бүгд" ? getMondayOf(month.slice(0,10)) : getMondayOf(td));
                    else                   setMonth(month!=="Бүгд" ? month.slice(0,7) : td.slice(0,7));
                    setPage(0);
                  }} style={btnSt(period===p)}>{l}</button>
                ))}
              </div>
              {/* Picker */}
              {isDay && (
                <input type="date" value={dayVal}
                  onChange={e=>{setMonth(e.target.value||"Бүгд");setPage(0);}}
                  style={{padding:"8px 10px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}/>
              )}
              {isWeek && (
                <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                  <input type="date" value={weekVal}
                    onChange={e=>{if(e.target.value){setMonth(getMondayOf(e.target.value));setPage(0);}}}
                    style={{padding:"8px 10px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}/>
                  {weekVal && <span style={{fontSize:"11px",color:"#64748b",fontWeight:600,whiteSpace:"nowrap"}}>{fmtWeekLabel(weekVal)}</span>}
                </div>
              )}
              {isMon && (
                <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                  {(()=>{
                    const [sy,sm] = monVal ? monVal.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth()+1];
                    const years = Array.from({length:5},(_,i)=>new Date().getFullYear()-i);
                    const monLabels = ["1-р","2-р","3-р","4-р","5-р","6-р","7-р","8-р","9-р","10-р","11-р","12-р"];
                    return (<>
                      <select value={sy} onChange={e=>{setMonth(`${e.target.value}-${String(sm).padStart(2,"0")}`);setPage(0);}}
                        style={{padding:"8px 8px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
                        {years.map(y=><option key={y} value={y}>{y}</option>)}
                      </select>
                      <select value={sm} onChange={e=>{setMonth(`${sy}-${String(e.target.value).padStart(2,"0")}`);setPage(0);}}
                        style={{padding:"8px 8px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
                        {monLabels.map((l,i)=><option key={i} value={i+1}>{l} сар</option>)}
                      </select>
                    </>);
                  })()}
                </div>
              )}
              <button onClick={()=>{setMonth("Бүгд");setPage(0);}}
                style={{...btnSt(month==="Бүгд")}}>Бүгд</button>
            </div>
          );
        })()}
        <div style={{padding:"10px 14px",borderRadius:"10px",background:"#f1f5f9",fontSize:"12px",color:"#64748b",fontWeight:700,whiteSpace:"nowrap"}}>
          {filtered.length} гүйлгээ
        </div>
        <button onClick={()=>onRefresh(true)} disabled={loading}
          style={{padding:"10px 16px",borderRadius:"10px",border:"none",cursor:loading?"default":"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit",background:loading?"#e2e8f0":"#1a56db",color:loading?"#94a3b8":"#fff",whiteSpace:"nowrap",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
          <span>{loading?"⏳ Ачааллаж...":"🔄 Шинэчлэх"}</span>
          {lastLoaded && !loading && <span style={{fontSize:"9px",opacity:0.7}}>{String(lastLoaded.getHours()).padStart(2,"0")}:{String(lastLoaded.getMinutes()).padStart(2,"0")}</span>}
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"20px"}}>

        {/* 1. Нийт үнийн дүн */}
        <div style={{background:"#fff",borderRadius:"14px",padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:"5px solid #1a56db"}}>
          <div style={{fontSize:"10px",fontWeight:700,color:"#1a56db",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"6px"}}>💰 Нийт үнийн дүн</div>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
            <span style={{fontWeight:900,fontSize:"22px",color:"#0f172a",lineHeight:1}}>{fmtMNT(totTotal)}</span>
            {totalChange!==null && <span style={{fontSize:"11px",fontWeight:700,color:totalChange>=0?"#0e9f6e":"#ef4444",background:totalChange>=0?"#d1fae5":"#fee2e2",borderRadius:"5px",padding:"2px 6px"}}>{totalChange>=0?"↑":"↓"}{Math.abs(totalChange).toFixed(1)}%</span>}
          </div>
          {prevTotal>0 && <div style={{fontSize:"10px",color:"#cbd5e1",marginTop:"4px"}}>{prevLabel}: {fmtMNT(prevTotal)}</div>}
          <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>{success.length} амжилттай</div>
        </div>

        {/* 2. Нийт ашиг */}
        <div style={{background:"#fff",borderRadius:"14px",padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:`5px solid ${totProfMNT>=0?"#0e9f6e":"#ef4444"}`}}>
          <div style={{fontSize:"10px",fontWeight:700,color:totProfMNT>=0?"#0e9f6e":"#ef4444",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"6px"}}>📈 Нийт ашиг</div>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
            <span style={{fontWeight:900,fontSize:"22px",color:"#0f172a",lineHeight:1}}>{fmtMNT(totProfMNT)}</span>
            {profitChange!==null && <span style={{fontSize:"11px",fontWeight:700,color:profitChange>=0?"#0e9f6e":"#ef4444",background:profitChange>=0?"#d1fae5":"#fee2e2",borderRadius:"5px",padding:"2px 6px"}}>{profitChange>=0?"↑":"↓"}{Math.abs(profitChange).toFixed(1)}%</span>}
          </div>
          {prevProfMNT!==0 && <div style={{fontSize:"10px",color:"#cbd5e1",marginTop:"4px"}}>{prevLabel}: {fmtMNT(prevProfMNT)}</div>}
          <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>{fmtUSD(totProfUSD)}</div>
        </div>

        {/* 3. Хүлээгдэж буй зөрүү */}
        <div style={{background:"#fff",borderRadius:"14px",padding:"16px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:"5px solid #f59e0b"}}>
          <div style={{fontSize:"10px",fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"6px"}}>⏳ Хүлээгдэж буй зөрүү</div>
          <div style={{fontWeight:900,fontSize:"22px",color:"#0f172a",lineHeight:1}}>{fmtMNT(totDiff)}</div>
          <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>{unpaidRows.length} гүйлгээ · {waiting.length} хүлээгдэж буй</div>
          {/* Хэнээс хүлээгдэж байгаа жагсаалт */}
          {(()=>{
            // Зөрүүтэй харилцагчдын жагсаалт (difference < 0 буюу received < totalPrice)
            const diffMap = {};
            unpaidRows.forEach(r => {
              const cp = r.counterparty || "Тодорхойгүй";
              if (!diffMap[cp]) diffMap[cp] = 0;
              diffMap[cp] += (r.totalPrice||0) - (r.received||0);
            });
            // Хүлээгдэж буй статустай харилцагчид
            waiting.forEach(r => {
              const cp = r.counterparty || "Тодорхойгүй";
              if (!diffMap[cp]) diffMap[cp] = 0;
              diffMap[cp] += (r.totalPrice||0);
            });
            const list = Object.entries(diffMap).sort((a,b)=>b[1]-a[1]);
            if (!list.length) return <div style={{fontSize:"10px",color:"#cbd5e1",marginTop:"6px"}}>Зөрүү байхгүй</div>;
            return (
              <div style={{marginTop:"8px",display:"flex",flexDirection:"column",gap:"3px"}}>
                {list.slice(0,5).map(([cp,amt],i)=>(
                  <div key={i} onClick={()=>{setSearch(cp);setPage(0);}}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:"6px"}}>
                    <span style={{fontSize:"10px",color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>· {cp}</span>
                    <span style={{fontSize:"10px",fontWeight:700,color:"#f59e0b",whiteSpace:"nowrap",flexShrink:0}}>{fmtMNT(amt)}</span>
                  </div>
                ))}
                {list.length>5 && <div style={{fontSize:"10px",color:"#cbd5e1"}}>· +{list.length-5} бусад</div>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"16px",marginBottom:"16px",alignItems:"start"}}>

        {/* PROFIT CHART */}
        <div style={{...cardStyle,gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
            <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a"}}>📊 Ашгийн график</div>
            <div style={{display:"flex",gap:"4px"}}>
              {["өдөр","долоо хоног","сар"].map(p=>(
                <button key={p} onClick={()=>setPeriod(p)}
                  style={{padding:"5px 10px",borderRadius:"7px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit",
                    background:period===p?"#1a56db":"#f1f5f9",color:period===p?"#fff":"#64748b"}}>
                  {p==="өдөр"?"Өдөр":p==="долоо хоног"?"7 хон":"Сар"}
                </button>
              ))}
            </div>
          </div>
          <LineChart data={graphData} divider={graphDivider}/>
        </div>

        {/* TOP CATEGORIES */}
        <div style={cardStyle}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a",marginBottom:"14px"}}>🏷️ Ангилал</div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {topCat.length ? topCat.map(([c,v],i)=>(
              <div key={c}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                  <span style={{fontSize:"12px",fontWeight:700,color:"#0f172a"}}>{c||"Бусад"}</span>
                  <span style={{fontSize:"11px",fontWeight:700,color:COLORS[i%COLORS.length]}}>{fmtMNT(v.profitMNT)}</span>
                </div>
                <MiniBar value={v.profitMNT} max={topCat[0][1].profitMNT} color={COLORS[i%COLORS.length]}/>
                <div style={{fontSize:"10px",color:"#94a3b8",marginTop:"1px"}}>{v.count} гүйлгээ · {fmtMNT(v.amount)}</div>
              </div>
            )) : <div style={{color:"#94a3b8",fontSize:"13px"}}>Ангилал байхгүй</div>}
          </div>
        </div>

        {/* ИДЭВХТЭЙ ЦАГ */}
        <div style={cardStyle}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a",marginBottom:"14px"}}>⚡ Өндөр ашигтай үе</div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {/* Хамгийн сайн өдөр */}
            {bestDay && (
              <div style={{background:"#f0fdf4",borderRadius:"10px",padding:"10px 12px"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#0e9f6e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"3px"}}>🏆 Хамгийн ашигтай өдөр</div>
                <div style={{fontWeight:900,fontSize:"15px",color:"#0f172a"}}>{bestDay[0]}</div>
                <div style={{fontSize:"11px",color:"#0e9f6e",fontWeight:700}}>{fmtMNT(bestDay[1].profit)} · {bestDay[1].count} гүйлгээ</div>
              </div>
            )}
            {/* Хамгийн сайн сар */}
            {bestMon && (
              <div style={{background:"#eff6ff",borderRadius:"10px",padding:"10px 12px"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#1a56db",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"3px"}}>📅 Хамгийн ашигтай сар</div>
                <div style={{fontWeight:900,fontSize:"15px",color:"#0f172a"}}>{bestMon[0]}</div>
                <div style={{fontSize:"11px",color:"#1a56db",fontWeight:700}}>{fmtMNT(bestMon[1].profit)} · {bestMon[1].count} гүйлгээ</div>
              </div>
            )}
            {/* Гарагаар */}
            <div>
              <div style={{fontSize:"10px",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px"}}>📆 Гарагаар</div>
              <div style={{display:"flex",gap:"3px",alignItems:"flex-end",height:"48px"}}>
                {Object.entries(dowMap).map(([dow,v])=>{
                  const maxDow = Math.max(...Object.values(dowMap).map(d=>d.profit),1);
                  const pct = Math.max((v.profit/maxDow)*100,4);
                  const isTop = dow===bestDow?.[0];
                  return (
                    <div key={dow} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
                      <div style={{width:"100%",background:isTop?"#1a56db":"#e2e8f0",borderRadius:"3px 3px 0 0",height:`${pct}%`,minHeight:"4px",transition:"height 0.3s"}}/>
                      <div style={{fontSize:"9px",color:isTop?"#1a56db":"#94a3b8",fontWeight:isTop?700:400}}>{dowLabels[dow]}</div>
                    </div>
                  );
                })}
              </div>
              {bestDow && <div style={{fontSize:"10px",color:"#64748b",marginTop:"4px"}}>
                Идэвхтэй: <span style={{fontWeight:700,color:"#1a56db"}}>{dowLabels[bestDow[0]]}</span>
                {worstDow && <> · Идэвхгүй: <span style={{fontWeight:700,color:"#94a3b8"}}>{dowLabels[worstDow[0]]}</span></>}
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── ХАРИЛЦАГЧИЙН ШИНЖИЛГЭЭ (CRM) ── */}
      <div style={{...cardStyle,marginBottom:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a"}}>👥 Харилцагчийн шинжилгээ</div>
          <div style={{fontSize:"11px",color:"#94a3b8"}}>{Object.keys(cpMap).length} харилцагч</div>
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",minWidth:"700px"}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>#</th>
                <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>ХАРИЛЦАГЧ</th>
                <th style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>ДАВТАМЖ</th>
                <th style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>НИЙТ АШИГ</th>
                <th style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>СҮҮЛИЙН ГҮЙЛГЭЭ</th>
                <th style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>ИДЭВХ</th>
                <th style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",fontSize:"11px"}}>ТРЭНД</th>
              </tr>
            </thead>
            <tbody>
              {topCP.map(([cp,v],i)=>{
                const allInfo = cpMapAll[cp]||{};
                const days = daysSince(allInfo.lastDate||v.lastDate);
                const totalTx = allInfo.count||v.count;
                // Cold: >60 хоног гүйлгээ хийгдээгүй, 2+ удаа ирж байсан
                const isCold = days>60 && totalTx>=2;
                const isNew  = totalTx===1;
                const isActive = days<=14;
                // Трэнд: сүүлийн 2 сартай харьцуул
                const mkeys = Object.keys(v.months).sort();
                const lastM = mkeys.length>=1 ? (v.months[mkeys[mkeys.length-1]]||0) : 0;
                const prevM = mkeys.length>=2 ? (v.months[mkeys[mkeys.length-2]]||0) : (mkeys.length===1 ? 0 : null);
                const trendPct = (prevM!==null && prevM!==0) ? ((lastM-prevM)/Math.abs(prevM)*100) : null;
                const trend = prevM===null ? "—" : lastM>prevM ? "↑" : lastM<prevM ? "↓" : "→";
                const trendColor = trend==="↑"?"#0e9f6e":trend==="↓"?"#ef4444":"#94a3b8";
                // Status badge
                let badge, badgeBg, badgeColor;
                if (isCold)        { badge="🥶 Cold"; badgeBg="#eff6ff"; badgeColor="#1a56db"; }
                else if (isNew)    { badge="✨ Шинэ"; badgeBg="#f0fdf4"; badgeColor="#0e9f6e"; }
                else if (isActive) { badge="🔥 Идэвхтэй"; badgeBg="#fef3c7"; badgeColor="#d97706"; }
                else               { badge="😐 Дунд"; badgeBg="#f8fafc"; badgeColor="#64748b"; }

                return (
                  <tr key={cp} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer"}}
                    onClick={()=>{setSearch(cp);setPage(0);}}>
                    <td style={{padding:"10px 10px",color:"#94a3b8",fontWeight:700}}>{i+1}</td>
                    <td style={{padding:"10px 10px"}}>
                      <div style={{fontWeight:700,color:"#0f172a",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cp}</div>
                      <div style={{fontSize:"10px",color:"#94a3b8",marginTop:"1px"}}>нийт {totalTx} удаа · {fmtMNT(v.amount)}</div>
                    </td>
                    <td style={{padding:"10px",textAlign:"center"}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:"2px"}}>
                        {Array.from({length:Math.min(totalTx,8)}).map((_,j)=>(
                          <div key={j} style={{width:"6px",height:"6px",borderRadius:"50%",background:COLORS[i%COLORS.length],opacity:j<v.count?1:0.25}}/>
                        ))}
                        {totalTx>8 && <span style={{fontSize:"9px",color:"#94a3b8",marginLeft:"2px"}}>+{totalTx-8}</span>}
                      </div>
                    </td>
                    <td style={{padding:"10px",textAlign:"right"}}>
                      <div style={{fontWeight:700,color:v.profitMNT>=0?"#0e9f6e":"#ef4444"}}>{fmtMNT(v.profitMNT)}</div>
                      <div style={{fontSize:"10px",color:"#94a3b8"}}>{fmtUSD(v.profitUSD)}</div>
                    </td>
                    <td style={{padding:"10px",textAlign:"center"}}>
                      <div style={{fontWeight:600,color:days<=7?"#0e9f6e":days<=30?"#f59e0b":"#ef4444",fontSize:"12px"}}>
                        {days===999?"—":`${days} өдөр`}
                      </div>
                      <div style={{fontSize:"10px",color:"#94a3b8"}}>{(allInfo.lastDate||v.lastDate)?.slice(5)||""}</div>
                    </td>
                    <td style={{padding:"10px",textAlign:"center"}}>
                      <span style={{fontSize:"10px",fontWeight:700,color:badgeColor,background:badgeBg,borderRadius:"6px",padding:"3px 7px",whiteSpace:"nowrap"}}>{badge}</span>
                    </td>
                    <td style={{padding:"10px",textAlign:"center"}}>
                      {trend==="—" ? <span style={{color:"#cbd5e1",fontSize:"12px"}}>—</span> : (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
                          <span style={{fontSize:"16px",fontWeight:900,color:trendColor,lineHeight:1}}>{trend}</span>
                          <span style={{fontSize:"9px",fontWeight:700,color:trendColor}}>
                            {trendPct!==null ? Math.abs(trendPct).toFixed(0)+"%" : ""}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Cold client summary */}
        {(() => {
          const coldList = topCP.filter(([cp,v])=>{
            const allInfo = cpMapAll[cp]||{};
            return daysSince(allInfo.lastDate||v.lastDate)>60 && (allInfo.count||v.count)>=2;
          });
          if (!coldList.length) return null;
          const coldProfit = coldList.reduce((s,[,v])=>s+v.profitMNT,0);
          return (
            <div style={{marginTop:"12px",padding:"12px 16px",background:"linear-gradient(135deg,#eff6ff,#dbeafe)",borderRadius:"10px",border:"1px solid #bfdbfe"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                <div>
                  <div style={{fontSize:"12px",fontWeight:800,color:"#1e40af",marginBottom:"4px"}}>🥶 Дахин ирэхгүй болсон харилцагч ({coldList.length})</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                    {coldList.map(([cp,v])=>{
                      const allInfo = cpMapAll[cp]||{};
                      const d = daysSince(allInfo.lastDate||v.lastDate);
                      return (
                        <span key={cp} style={{fontSize:"11px",fontWeight:600,color:"#1e40af",background:"#fff",borderRadius:"6px",padding:"2px 8px",border:"1px solid #bfdbfe",cursor:"pointer"}}
                          onClick={()=>{setSearch(cp);setPage(0);}}>
                          {cp} <span style={{color:"#94a3b8"}}>({d}өд)</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"10px",color:"#64748b",fontWeight:600}}>Нийт алдсан ашиг</div>
                  <div style={{fontSize:"16px",fontWeight:900,color:"#1a56db"}}>{fmtMNT(coldProfit)}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TRANSACTIONS TABLE */}
      <div style={cardStyle}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a"}}>📋 Гүйлгээний дэлгэрэнгүй</div>
          <div style={{fontSize:"12px",color:"#94a3b8"}}>{sorted.length} нийт · {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,sorted.length)}</div>
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",minWidth:"700px"}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                <SortTh col="date"         label="Огноо"/>
                <SortTh col="counterparty" label="Хэрэглэгч"/>
                <SortTh col="description"  label="Тайлбар"/>
                <SortTh col="amount"       label="Зарлагын дүн"/>
                <SortTh col="rateOrtog"    label="Өртөг ханш"/>
                <SortTh col="rateZarakh"   label="Зарах ханш"/>
                <SortTh col="profitMNT"    label="Ашиг /төгрөг/"/>
                <SortTh col="profitUSD"    label="Ашиг /доллар/"/>
                <SortTh col="totalPrice"   label="Нийт үнийн дүн"/>
                <SortTh col="received"     label="Хүлээж авсан үнийн дүн"/>
                <SortTh col="difference"   label="Зөрүү"/>
                <SortTh col="category"     label="Ангилал"/>
                <SortTh col="txStatus"     label="Төлөв"/>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r,i)=>{
                const statusColor = r.status==="Баталгаажсан"||r.status==="Хяналтанд"?"#d1fae5":r.status==="Цуцлагдсан"?"#fee2e2":"#fef3c7";
                const statusText  = r.status==="Баталгаажсан"||r.status==="Хяналтанд"?"#065f46":r.status==="Цуцлагдсан"?"#991b1b":"#92400e";
                return (
                  <tr key={i} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 8px",color:"#475569",whiteSpace:"nowrap"}}>{r.date}</td>
                    <td style={{padding:"7px 8px",fontWeight:700,color:"#0f172a",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.counterparty}>{r.counterparty}</td>
                    <td style={{padding:"7px 8px",color:"#475569",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.description}>{r.description}</td>
                    <td style={{padding:"7px 8px",fontWeight:700,color:"#0f172a",whiteSpace:"nowrap",textAlign:"right"}}>{fmtMNTFull(r.amount)}</td>
                    <td style={{padding:"7px 8px",color:"#64748b",whiteSpace:"nowrap",textAlign:"right"}}>{r.rateOrtog||""}</td>
                    <td style={{padding:"7px 8px",color:"#64748b",whiteSpace:"nowrap",textAlign:"right"}}>{r.rateZarakh||""}</td>
                    <td style={{padding:"7px 8px",fontWeight:700,color:r.profitMNT>0?"#0e9f6e":r.profitMNT<0?"#ef4444":"#94a3b8",whiteSpace:"nowrap",textAlign:"right"}}>{fmtMNTFull(r.profitMNT)}</td>
                    <td style={{padding:"7px 8px",fontWeight:700,color:r.profitUSD>0?"#0e9f6e":r.profitUSD<0?"#ef4444":"#94a3b8",whiteSpace:"nowrap",textAlign:"right"}}>{fmtUSD(r.profitUSD)}</td>
                    <td style={{padding:"7px 8px",color:"#475569",whiteSpace:"nowrap",textAlign:"right"}}>{fmtMNTFull(r.totalPrice)}</td>
                    <td style={{padding:"7px 8px",color:"#475569",whiteSpace:"nowrap",textAlign:"right"}}>{fmtMNTFull(r.received)}</td>
                    <td style={{padding:"7px 8px",fontWeight:600,color:r.difference<0?"#ef4444":r.difference>0?"#0e9f6e":"#94a3b8",whiteSpace:"nowrap",textAlign:"right"}}>{fmtMNTFull(r.difference)}</td>
                    <td style={{padding:"7px 8px",color:"#475569",whiteSpace:"nowrap"}}>{r.category}</td>
                    <td style={{padding:"7px 8px"}}>
                      <span style={{fontSize:"10px",fontWeight:600,padding:"2px 8px",borderRadius:"5px",background:r.txStatus==="Амжилттай"?"#d1fae5":r.txStatus?.includes("Хүлээгдэж")?"#fef3c7":r.txStatus==="Цуцласан"?"#fee2e2":"#f1f5f9",color:r.txStatus==="Амжилттай"?"#065f46":r.txStatus?.includes("Хүлээгдэж")?"#92400e":r.txStatus==="Цуцласан"?"#991b1b":"#64748b",whiteSpace:"nowrap"}}>{r.txStatus||"—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{display:"flex",gap:"6px",justifyContent:"center",marginTop:"16px",flexWrap:"wrap"}}>
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
              style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid #e2e8f0",background:page===0?"#f8fafc":"#fff",cursor:page===0?"default":"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:600}}>← Өмнөх</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
              const p = totalPages<=7 ? i : Math.max(0,Math.min(page-3,totalPages-7))+i;
              return <button key={p} onClick={()=>setPage(p)}
                style={{padding:"7px 12px",borderRadius:"8px",border:"1px solid #e2e8f0",background:page===p?"#1a56db":"#fff",color:page===p?"#fff":"#0f172a",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:700}}>{p+1}</button>;
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
              style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid #e2e8f0",background:page===totalPages-1?"#f8fafc":"#fff",cursor:page===totalPages-1?"default":"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:600}}>Дараах →</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const [tab, setTab]           = useState("dashboard");
  const [balances, setBalances] = useState(DEFAULT_BAL);
  const [transactions, setTx]   = useState([]);
  const [debts, setDebts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [addTxFor, setAddTxFor]     = useState(null);
  const [viewTxFor, setViewTxFor]   = useState(null);
  const [editBalFor, setEditBalFor] = useState(null);
  const [showDebt, setShowDebt]     = useState(false);
  const [financeRows, setFinanceRows] = useState(() => {
    // Хуудас нээхэд кэшнээс шууд ачаална → loading үзэгдэхгүй
    try {
      const c = localStorage.getItem("oyuns_action=getFinance");
      if (c) {
        const { ts, data } = JSON.parse(c);
        if (Date.now() - ts < CACHE_TTL && data?.rows?.length > 0) return data.rows;
      }
    } catch(e) {}
    return [];
  });
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeSearch, setFinanceSearch] = useState("");
  const [financeStatus, setFinanceStatus] = useState("Бүгд");
  const [financeMonth, setFinanceMonth] = useState(()=>{
    const n=new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
  });
  const [financePeriod, setFinancePeriod] = useState("өдөр");


  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet({ action:"getAll" }, false);
        if (data.ok) {
          setBalances(data.balances || DEFAULT_BAL);
          setTx(data.transactions || []);
          setDebts(data.debts || []);
        }
      } catch(e) {
        console.error("Sheets load error:", e);
        setError(true);
      }
      setLoading(false);
    })();
  }, []);


  const [lastLoaded, setLastLoaded] = useState(null);

  const loadFinance = async (force=false) => {
    if (force) clearApiCache();
    // Кэш байвал loading spinner харуулахгүй — background-д шинэчилнэ
    const hasCached = financeRows.length > 0 && !force;
    if (!hasCached) setFinanceLoading(true);
    try {
      const data = await apiGet({ action:"getFinance" }, force);
      if (data.ok) {
        setFinanceRows(data.rows || []);
        setLastLoaded(new Date());
      }
    } catch(e) { console.error("Finance load error:", e); }
    setFinanceLoading(false);
  };

  useEffect(() => {
    if (tab !== "finance") return;
    // Кэш байвал background-д шинэчилнэ (5 минутын хугацаа дууссан бол)
    try {
      const c = localStorage.getItem("oyuns_action=getFinance");
      if (c) {
        const { ts } = JSON.parse(c);
        if (Date.now() - ts < CACHE_TTL) return; // Кэш хүчинтэй, fetch хийхгүй
      }
    } catch(e) {}
    loadFinance();
  }, [tab]);
  async function handleSaveTx(tx) {
    setTx(prev=>[...prev,tx]);
    const nb={...balances};
    nb[tx.accountId]=(nb[tx.accountId]||0)+(tx.type==="Орлого"?tx.amount:-tx.amount);
    setBalances(nb);
    await apiPost({action:"addTransaction",data:tx});
  }

  async function handleDeleteTx(id) {
    const tx=transactions.find(t=>t.id===id);
    if (!tx) return;
    setTx(prev=>prev.filter(t=>t.id!==id));
    const nb={...balances};
    nb[tx.accountId]=(nb[tx.accountId]||0)+(tx.type==="Орлого"?-tx.amount:tx.amount);
    setBalances(nb);
    await apiPost({action:"deleteTransaction",id,tx});
  }

  const groups = [
    {currency:"MNT", accs:ACCOUNTS.filter(a=>a.currency==="MNT")},
    {currency:"RUB", accs:ACCOUNTS.filter(a=>a.currency==="RUB")},
    {currency:"USDT",accs:ACCOUNTS.filter(a=>a.currency==="USDT")},
  ];

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4f8",fontFamily:"'Montserrat',sans-serif",color:"#475569",fontSize:"15px"}}>Ачааллаж байна...</div>;

  return (
    <div style={{fontFamily:"'Montserrat',sans-serif",background:"#f0f4f8",minHeight:"100vh"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1a56db 100%)",padding:"14px 18px 0",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:"12px"}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:900,color:"#fff",letterSpacing:"0.05em",lineHeight:1}}>OYUNS FINANCE</div>
            <div style={{fontSize:"10px",fontWeight:600,color:"#93c5fd",letterSpacing:"0.12em",marginTop:"2px"}}>САНХҮҮГИЙН БҮРТГЭЛ</div>
          </div>
          <LiveClock/>
        </div>
        <div style={{display:"flex",gap:"2px",background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"3px"}}>
          {[["dashboard","💼 Данс"],["debts","📊 Авлага/Зээл"],["finance","📈 Гүйлгээ"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"9px 8px",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",background:tab===key?"#fff":"transparent",color:tab===key?"#1a56db":"rgba(255,255,255,0.8)",boxShadow:tab===key?"0 1px 4px rgba(0,0,0,0.15)":"none",transition:"all 0.15s"}}>{label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:"10px",margin:"12px 16px 0",padding:"10px 14px",fontSize:"13px",color:"#92400e"}}>⚠️ Google Sheets холбогдож чадсангүй. Apps Script-г шинэчлэн deploy хийнэ үү.</div>}

      <div style={{padding:"16px",maxWidth:tab==="finance"?"1200px":"560px",margin:"0 auto"}}>
        {tab==="dashboard" && groups.map(({currency,accs})=>(
          <div key={currency} style={{marginBottom:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"10px"}}>
              <span style={{fontSize:"15px"}}>{CUR_FLAG[currency]}</span>
              <span style={{fontSize:"12px",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em"}}>{CUR_LABEL[currency]} ({currency})</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {accs.map(acc=><BalanceCard key={acc.id} acc={acc} bal={balances[acc.id]||0} onEdit={setEditBalFor} onViewTx={setViewTxFor} onAddTx={setAddTxFor}/>)}
            </div>
          </div>
        ))}


        {tab==="finance" && <FinanceDashboard rows={financeRows} loading={financeLoading} search={financeSearch} setSearch={setFinanceSearch} status={financeStatus} setStatus={setFinanceStatus} month={financeMonth} setMonth={setFinanceMonth} period={financePeriod} setPeriod={setFinancePeriod} onRefresh={loadFinance} lastLoaded={lastLoaded}/>}
        {tab==="debts" && (
          <DebtSection debts={debts} onAdd={()=>setShowDebt(true)}
            onToggle={async id=>{
              const updated=debts.map(d=>d.id===id?{...d,status:d.status==="Хүлээгдэж буй"?"Төлөгдсөн":"Хүлээгдэж буй"}:d);
              setDebts(updated);
              await apiPost({action:"updateDebt",data:updated.find(d=>d.id===id)});
            }}
            onDelete={async id=>{
              setDebts(prev=>prev.filter(d=>d.id!==id));
              await apiPost({action:"deleteDebt",id});
            }}
          />
        )}
      </div>

      {addTxFor  && <AddTxModal acc={ACCOUNTS.find(a=>a.id===addTxFor)} onClose={()=>setAddTxFor(null)} onSave={handleSaveTx}/>}
      {viewTxFor && <TxHistoryModal acc={ACCOUNTS.find(a=>a.id===viewTxFor)} transactions={transactions} onClose={()=>setViewTxFor(null)} onDelete={handleDeleteTx}/>}
      {editBalFor && <EditBalModal acc={ACCOUNTS.find(a=>a.id===editBalFor)} bal={balances[editBalFor]||0} onClose={()=>setEditBalFor(null)} onSave={async(id,v)=>{setBalances(prev=>({...prev,[id]:v}));await apiPost({action:"setBalance",accountId:id,value:v});}}/>}
      {showDebt && <AddDebtModal onClose={()=>setShowDebt(false)} onSave={async d=>{setDebts(prev=>[...prev,d]);await apiPost({action:"addDebt",data:d});}}/>}
    </div>
  );
}
