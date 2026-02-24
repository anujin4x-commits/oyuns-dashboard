import { useState, useEffect } from "react";

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

async function apiGet(params) {
  const url = SCRIPT_URL + "?" + new URLSearchParams(params);
  // redirect: "follow" нь Google-н redirect-г дагана
  // credentials: "omit" нь CORS preflight-г зайлуулна
  const res = await fetch(url, {
    redirect: "follow",
    credentials: "omit",
  });
  return res.json();
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
function fmtMNT(n) {
  if (!n || isNaN(n)) return "₮0";
  return (n < 0 ? "-₮" : "₮") + Math.abs(n).toLocaleString("mn-MN", {minimumFractionDigits:0,maximumFractionDigits:0});
}
function fmtUSD(n) {
  if (!n || isNaN(n)) return "$0";
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2});
}

function FinanceDashboard({ rows, loading, search, setSearch, status, setStatus, month, setMonth }) {
  const statuses = ["Бүгд", "Баталгаажсан", "Цуцлагдсан"];

  // Months from data
  const months = ["Бүгд", ...Array.from(new Set(rows.map(r => r.date?.slice(0,7)).filter(Boolean))).sort().reverse()];

  // Filter
  const filtered = rows.filter(r => {
    const matchStatus = status === "Бүгд" || r.status === status;
    const matchMonth  = month === "Бүгд" || r.date?.startsWith(month);
    const matchSearch = !search || r.counterparty?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()) || r.invoice?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchMonth && matchSearch;
  });

  // Summary (Баталгаажсан мөрүүдээр)
  const confirmed = filtered.filter(r => r.status === "Баталгаажсан");
  const totalAmount  = confirmed.reduce((s,r) => s + (r.amount||0), 0);
  const totalProfitMNT = confirmed.reduce((s,r) => s + (r.profitMNT||0), 0);
  const totalProfitUSD = confirmed.reduce((s,r) => s + (r.profitUSD||0), 0);
  const totalCancelled = filtered.filter(r => r.status === "Цуцлагдсан").reduce((s,r) => s + (r.amount||0), 0);

  // Monthly breakdown
  const monthlyMap = {};
  confirmed.forEach(r => {
    const m = r.date?.slice(0,7) || "?";
    if (!monthlyMap[m]) monthlyMap[m] = { amount:0, profitMNT:0, profitUSD:0, count:0 };
    monthlyMap[m].amount   += r.amount || 0;
    monthlyMap[m].profitMNT+= r.profitMNT || 0;
    monthlyMap[m].profitUSD+= r.profitUSD || 0;
    monthlyMap[m].count++;
  });
  const monthlyData = Object.entries(monthlyMap).sort((a,b) => b[0].localeCompare(a[0])).slice(0,12);

  // Top counterparties
  const cpMap = {};
  confirmed.forEach(r => {
    const cp = r.counterparty || "Тодорхойгүй";
    if (!cpMap[cp]) cpMap[cp] = { amount:0, profitMNT:0, profitUSD:0, count:0 };
    cpMap[cp].amount    += r.amount || 0;
    cpMap[cp].profitMNT += r.profitMNT || 0;
    cpMap[cp].profitUSD += r.profitUSD || 0;
    cpMap[cp].count++;
  });
  const topCP = Object.entries(cpMap).sort((a,b) => b[1].profitMNT - a[1].profitMNT).slice(0,10);

  // Bar chart max
  const maxAmount = Math.max(...monthlyData.map(([,v]) => v.amount), 1);

  const cardStyle = {background:"#fff",borderRadius:"16px",padding:"16px 18px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"1px solid #e8edf5"};

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:"14px"}}>Ачаалж байна...</div>;
  if (!rows.length) return <div style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:"14px"}}>Өгөгдөл байхгүй байна</div>;

  return (
    <div style={{paddingBottom:"40px"}}>

      {/* FILTERS */}
      <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap"}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Харилцагч, тайлбар, invoice..."
          style={{flex:"1",minWidth:"200px",padding:"10px 14px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",outline:"none"}}
        />
        <select value={status} onChange={e=>setStatus(e.target.value)}
          style={{padding:"10px 12px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
          {statuses.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{padding:"10px 12px",borderRadius:"10px",border:"1.5px solid #e2e8f0",fontSize:"13px",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
          {months.map(m=><option key={m}>{m}</option>)}
        </select>
        <div style={{padding:"10px 14px",borderRadius:"10px",background:"#f1f5f9",fontSize:"13px",color:"#64748b",fontWeight:600}}>
          {filtered.length} гүйлгээ
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"20px"}}>
        <div style={{...cardStyle,borderLeft:"5px solid #0e9f6e"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:"#0e9f6e",textTransform:"uppercase",marginBottom:"6px"}}>Нийт зарлага</div>
          <div style={{fontWeight:900,fontSize:"18px",color:"#0f172a"}}>{fmtMNT(totalAmount)}</div>
          <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{confirmed.length} гүйлгээ</div>
        </div>
        <div style={{...cardStyle,borderLeft:"5px solid #1a56db"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:"#1a56db",textTransform:"uppercase",marginBottom:"6px"}}>Ашиг (төгрөг)</div>
          <div style={{fontWeight:900,fontSize:"18px",color:totalProfitMNT>=0?"#0e9f6e":"#ef4444"}}>{fmtMNT(totalProfitMNT)}</div>
        </div>
        <div style={{...cardStyle,borderLeft:"5px solid #7e3af2"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:"#7e3af2",textTransform:"uppercase",marginBottom:"6px"}}>Ашиг (доллар)</div>
          <div style={{fontWeight:900,fontSize:"18px",color:totalProfitUSD>=0?"#0e9f6e":"#ef4444"}}>{fmtUSD(totalProfitUSD)}</div>
        </div>
        <div style={{...cardStyle,borderLeft:"5px solid #ef4444"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:"#ef4444",textTransform:"uppercase",marginBottom:"6px"}}>Цуцлагдсан</div>
          <div style={{fontWeight:900,fontSize:"18px",color:"#ef4444"}}>{fmtMNT(totalCancelled)}</div>
          <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{filtered.filter(r=>r.status==="Цуцлагдсан").length} гүйлгээ</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"20px"}}>

        {/* MONTHLY BAR CHART */}
        <div style={cardStyle}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a",marginBottom:"14px"}}>📅 Сараар задаргаа</div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {monthlyData.map(([m, v]) => (
              <div key={m}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <span style={{fontSize:"11px",fontWeight:600,color:"#475569"}}>{m}</span>
                  <span style={{fontSize:"11px",fontWeight:700,color:"#0f172a"}}>{fmtMNT(v.amount)}</span>
                </div>
                <div style={{background:"#f1f5f9",borderRadius:"6px",height:"8px",overflow:"hidden"}}>
                  <div style={{background:"linear-gradient(90deg,#1a56db,#60a5fa)",height:"100%",borderRadius:"6px",width:`${(v.amount/maxAmount)*100}%`,transition:"width 0.3s"}}/>
                </div>
                <div style={{fontSize:"10px",color:"#94a3b8",marginTop:"2px"}}>Ашиг: {fmtMNT(v.profitMNT)} / {fmtUSD(v.profitUSD)} · {v.count} гүйлгээ</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP COUNTERPARTIES */}
        <div style={cardStyle}>
          <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a",marginBottom:"14px"}}>👥 Топ харилцагчид</div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {topCP.map(([cp, v], i) => (
              <div key={cp} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:["#1a56db","#0e9f6e","#7e3af2","#f59e0b","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#6366f1"][i]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,color:["#1a56db","#0e9f6e","#7e3af2","#f59e0b","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#6366f1"][i],flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cp}</div>
                  <div style={{fontSize:"11px",color:"#94a3b8"}}>{fmtMNT(v.amount)} · {fmtUSD(v.profitUSD)} ашиг · {v.count}x</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div style={cardStyle}>
        <div style={{fontWeight:800,fontSize:"14px",color:"#0f172a",marginBottom:"14px"}}>📋 Гүйлгээний хүснэгт</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                {["№","Огноо","Харилцагч","Админ","Зарлага","Ашиг ₮","Ашиг $","Төлөв"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,200).map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 10px",color:"#94a3b8",fontWeight:600}}>{r.no}</td>
                  <td style={{padding:"7px 10px",color:"#475569",whiteSpace:"nowrap"}}>{r.date}</td>
                  <td style={{padding:"7px 10px",color:"#0f172a",fontWeight:600,maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.counterparty}</td>
                  <td style={{padding:"7px 10px",color:"#475569"}}>{r.admin}</td>
                  <td style={{padding:"7px 10px",fontWeight:700,color:"#0f172a",whiteSpace:"nowrap"}}>{fmtMNT(r.amount)}</td>
                  <td style={{padding:"7px 10px",fontWeight:700,color:r.profitMNT>0?"#0e9f6e":r.profitMNT<0?"#ef4444":"#94a3b8",whiteSpace:"nowrap"}}>{fmtMNT(r.profitMNT)}</td>
                  <td style={{padding:"7px 10px",fontWeight:700,color:r.profitUSD>0?"#0e9f6e":r.profitUSD<0?"#ef4444":"#94a3b8",whiteSpace:"nowrap"}}>{fmtUSD(r.profitUSD)}</td>
                  <td style={{padding:"7px 10px"}}>
                    <span style={{fontSize:"10px",fontWeight:700,padding:"3px 8px",borderRadius:"6px",background:r.status==="Баталгаажсан"?"#d1fae5":r.status==="Цуцлагдсан"?"#fee2e2":"#f1f5f9",color:r.status==="Баталгаажсан"?"#065f46":r.status==="Цуцлагдсан"?"#991b1b":"#64748b",whiteSpace:"nowrap"}}>{r.status||"—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <div style={{textAlign:"center",padding:"12px",fontSize:"12px",color:"#94a3b8"}}>Нийт {filtered.length} мөрөөс 200-г харуулж байна. Filter ашиглан нарийсгана уу.</div>}
        </div>
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
  const [financeRows, setFinanceRows] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeSearch, setFinanceSearch] = useState("");
  const [financeStatus, setFinanceStatus] = useState("Бүгд");
  const [financeMonth, setFinanceMonth] = useState("Бүгд");


  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet({ action:"getAll" });
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


  const loadFinance = async () => {
    setFinanceLoading(true);
    try {
      const data = await apiGet({ action:"getFinance" });
      if (data.ok) setFinanceRows(data.rows || []);
    } catch(e) { console.error("Finance load error:", e); }
    setFinanceLoading(false);
  };

  useEffect(() => {
    if (tab !== "finance") return;
    loadFinance();
    const timer = setInterval(loadFinance, 30000);
    return () => clearInterval(timer);
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

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4f8",fontFamily:"'Montserrat',sans-serif",color:"#475569",fontSize:"15px"}}>Ачаалж байна...</div>;

  return (
    <div style={{fontFamily:"'Montserrat',sans-serif",background:"#f0f4f8",minHeight:"100vh"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"14px 18px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <img src="https://raw.githubusercontent.com/anujin4x-commits/oyuns-dashboard/main/public/logo.png" alt="OYUNS Finance" style={{height:"40px",width:"auto",objectFit:"contain"}} />
          </div>
          <div style={{fontSize:"12px",color:"#94a3b8"}}>{new Date().toLocaleDateString("mn-MN")}</div>
        </div>
        <div style={{display:"flex",gap:"4px",marginTop:"12px",background:"#f1f5f9",borderRadius:"10px",padding:"3px"}}>
          {[["dashboard","💼 Данс"],["debts","📊 Авлага/Зээл"],["finance","📈 Гүйлгээ"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"8px",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",background:tab===key?"#fff":"transparent",color:tab===key?"#1a56db":"#64748b",boxShadow:tab===key?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>{label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:"10px",margin:"12px 16px 0",padding:"10px 14px",fontSize:"13px",color:"#92400e"}}>⚠️ Google Sheets холбогдож чадсангүй. Apps Script-г шинэчлэн deploy хийнэ үү.</div>}

      <div style={{padding:"16px",maxWidth:tab==="finance"?"1100px":"560px",margin:"0 auto"}}>
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


        {tab==="finance" && <FinanceDashboard rows={financeRows} loading={financeLoading} search={financeSearch} setSearch={setFinanceSearch} status={financeStatus} setStatus={setFinanceStatus} month={financeMonth} setMonth={setFinanceMonth}/>}
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
