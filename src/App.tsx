import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity, BarChart3, Boxes, ClipboardList, Languages, LogOut, Package,
  Plus, Receipt, ShoppingCart, Stethoscope, Users, Wallet, X, Menu, RefreshCw
} from 'lucide-react';
import { isConfigured, supabase } from './supabase';

type Tab = 'overview' | 'sales' | 'stock' | 'purchases' | 'patients' | 'expenses' | 'reports';
type Row = Record<string, any>;

const money = (n: number) => new Intl.NumberFormat('en-PK', {
  style: 'currency', currency: 'PKR', maximumFractionDigits: 0
}).format(Number(n || 0));

const copy = {
  en: {
    dashboard:'Dashboard', sales:'Sales', stock:'Medicine Stock', purchases:'Purchases',
    patients:'Patients & Consultations', expenses:'Expenses', reports:'Reports',
    todaySales:"Today's sales", expensesToday:"Today's expenses", patientsToday:"Today's patients",
    grossProfit:'Estimated gross profit', addSale:'Record sale', addProduct:'Add medicine',
    addPurchase:'Record purchase', addPatient:'Add patient visit', addExpense:'Add expense',
    name:'Name', phone:'Phone (optional)', medicine:'Medicine', qty:'Quantity',
    salePrice:'Sale price', purchasePrice:'Purchase price', amount:'Amount (PKR)',
    category:'Category', expiry:'Expiry date', supplier:'Supplier', notes:'Notes',
    date:'Date', save:'Save record', cancel:'Cancel', search:'Search records…',
    login:'Sign in', email:'Email', password:'Password', signIn:'Sign in',
    signOut:'Sign out', welcome:'Welcome back', setup:'Connect your Supabase project',
    setupText:'Add your Supabase URL and publishable/anon key to the .env file, then run the SQL setup script.',
    noData:'No records yet. Add your first entry to get started.',
    recentSales:'Recent sales', lowStock:'Low stock', stockValue:'Stock items',
    saleAmount:'Sale total', costAmount:'Cost total', payment:'Payment method',
    cash:'Cash', digital:'Bank / Easypaisa / JazzCash', credit:'Credit',
    patientFee:'Consultation fee paid to Abu', patientCount:'Patient visits',
    productSaved:'Medicine saved', recordSaved:'Record saved successfully',
    error:'Could not save record. Check required fields and database setup.',
    menu:'Menu', language:'اردو', today:'Today', all:'All records'
  },
  ur: {
    dashboard:'ڈیش بورڈ', sales:'فروخت', stock:'ادویات کا اسٹاک', purchases:'خریداری',
    patients:'مریض اور مشاورت', expenses:'اخراجات', reports:'رپورٹس',
    todaySales:'آج کی فروخت', expensesToday:'آج کے اخراجات', patientsToday:'آج کے مریض',
    grossProfit:'اندازاً مجموعی منافع', addSale:'فروخت درج کریں', addProduct:'دوا شامل کریں',
    addPurchase:'خریداری درج کریں', addPatient:'مریض کا وزٹ درج کریں', addExpense:'خرچ درج کریں',
    name:'نام', phone:'فون (اختیاری)', medicine:'دوا', qty:'تعداد',
    salePrice:'فروخت قیمت', purchasePrice:'خرید قیمت', amount:'رقم (روپے)',
    category:'قسم', expiry:'ایکسپائری تاریخ', supplier:'سپلائر', notes:'تفصیل',
    date:'تاریخ', save:'محفوظ کریں', cancel:'منسوخ', search:'ریکارڈ تلاش کریں…',
    login:'سائن اِن', email:'ای میل', password:'پاس ورڈ', signIn:'سائن اِن',
    signOut:'لاگ آؤٹ', welcome:'خوش آمدید', setup:'Supabase پروجیکٹ منسلک کریں',
    setupText:'.env فائل میں Supabase URL اور publishable/anon key شامل کریں، پھر SQL setup script چلائیں۔',
    noData:'ابھی کوئی ریکارڈ موجود نہیں۔ شروع کرنے کے لیے پہلی انٹری شامل کریں۔',
    recentSales:'حالیہ فروخت', lowStock:'کم اسٹاک', stockValue:'اسٹاک آئٹمز',
    saleAmount:'فروخت کی رقم', costAmount:'لاگت', payment:'ادائیگی کا طریقہ',
    cash:'نقد', digital:'بینک / ایزی پیسہ / جاز کیش', credit:'ادھار',
    patientFee:'ابو کو مشاورت کی ادائیگی', patientCount:'مریضوں کے وزٹ',
    productSaved:'دوا محفوظ ہوگئی', recordSaved:'ریکارڈ محفوظ ہوگیا',
    error:'ریکارڈ محفوظ نہیں ہوا۔ ضروری خانے اور ڈیٹابیس سیٹ اپ چیک کریں۔',
    menu:'مینو', language:'English', today:'آج', all:'تمام ریکارڈ'
  }
};

const nav = [
  ['overview','LayoutDashboard','dashboard'], ['sales','ShoppingCart','sales'],
  ['stock','Package','stock'], ['purchases','Boxes','purchases'],
  ['patients','Stethoscope','patients'], ['expenses','Wallet','expenses'],
  ['reports','BarChart3','reports']
] as const;

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [lang, setLang] = useState<'en'|'ur'>('en');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [data, setData] = useState<Record<string, Row[]>>({
    sales:[], products:[], purchases:[], patients:[], expenses:[]
  });
  const [modal, setModal] = useState<Tab|null>(null);
  const [search, setSearch] = useState('');
  const t = copy[lang];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const tables = ['sales','products','purchases','patients','expenses'];
    const results = await Promise.all(tables.map(table =>
      supabase!.from(table).select('*').order('created_at', {ascending:false}).limit(250)
    ));
    const next: Record<string, Row[]> = {};
    tables.forEach((table, i) => { next[table] = results[i].data || []; });
    setData(next);
    setLoading(false);
  };

  useEffect(() => { if (session) loadData(); }, [session]);

  const today = new Date().toISOString().slice(0,10);
  const todaySales = data.sales.filter(x => (x.created_at || '').slice(0,10) === today)
    .reduce((s,x) => s + Number(x.total_amount || 0), 0);
  const todayExpenses = data.expenses.filter(x => (x.created_at || '').slice(0,10) === today)
    .reduce((s,x) => s + Number(x.amount || 0), 0);
  const todayPatients = data.patients.filter(x => (x.created_at || '').slice(0,10) === today).length;
  const todayCost = data.sales.filter(x => (x.created_at || '').slice(0,10) === today)
    .reduce((s,x) => s + Number(x.cost_amount || 0), 0);
  const lowStock = data.products.filter(x => Number(x.quantity || 0) <= Number(x.low_stock_level || 5));
  const filtered = useMemo(() => {
    const key = tab === 'stock' ? 'products' : tab;
    const rows = data[key] || [];
    return rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  }, [tab, data, search]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string,string>;
    let table = modal === 'stock' ? 'products' : modal;
    let payload: Row = {...raw};
    ['quantity','sale_price','purchase_price','amount','consultation_fee','total_amount','cost_amount','low_stock_level'].forEach(k => {
      if (raw[k] !== undefined && raw[k] !== '') payload[k] = Number(raw[k]);
      else delete payload[k];
    });
    if (table === 'patients') {
      payload.consultation_fee = Number(raw.consultation_fee || 200);
      payload.consultation_paid = true;
    }
    if (table === 'sales') {
      payload.total_amount = Number(raw.total_amount || 0);
      payload.cost_amount = Number(raw.cost_amount || 0);
    }
    const { error } = await supabase.from(table!).insert(payload);
    if (error) { setNotice(`${t.error} (${error.message})`); return; }
    setModal(null); setNotice(t.recordSaved); e.currentTarget.reset(); await loadData();
  };

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const {error} = await supabase.auth.signInWithPassword({
      email:String(fd.get('email')), password:String(fd.get('password'))
    });
    if (error) setNotice(error.message);
  };

  if (!isConfigured) return <main className="setup-screen">
    <div className="setup-card">
      <div className="brand-mark">✚</div>
      <p className="eyebrow">GHAYAS UD DIN PHARMACY & MART</p>
      <h1>{t.setup}</h1>
      <p>{t.setupText}</p>
      <ol><li>Create a Supabase project.</li><li>Run <code>supabase/schema.sql</code> in SQL Editor.</li><li>Copy <code>.env.example</code> to <code>.env</code> and add project URL + anon/publishable key.</li><li>Run <code>npm install</code> then <code>npm run dev</code>.</li></ol>
    </div>
  </main>;

  if (!session) return <main className="login-screen">
    <form className="login-card" onSubmit={signIn}>
      <div className="brand-mark">✚</div><p className="eyebrow">GHAYAS UD DIN PHARMACY & MART</p>
      <h1>{t.welcome}</h1><p className="muted">Sign in to manage pharmacy operations.</p>
      <label>{t.email}<input name="email" type="email" required autoComplete="username" /></label>
      <label>{t.password}<input name="password" type="password" required autoComplete="current-password" /></label>
      <button className="primary full" type="submit">{t.signIn}</button>
      {notice && <p className="notice">{notice}</p>}
      <small>Accounts are created by the authorized administrator in Supabase. Public sign-up is not enabled.</small>
    </form>
  </main>;

  const openModal = (which: Tab) => setModal(which);
  const listTitle = tab === 'stock' ? t.stock : t[tab];
  return <div className={lang === 'ur' ? 'app rtl' : 'app'}>
    <aside className={`sidebar ${mobileMenu?'show':''}`}>
      <div className="side-brand"><span>✚</span><div><b>GHAYAS UD DIN</b><small>PHARMACY & MART</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="side-label">{t.menu}</div>
      {nav.map(([id, icon, label]) => {
        const Icon = ({LayoutDashboard:Activity,ShoppingCart,Package,Boxes,Stethoscope,Wallet,BarChart3} as any)[icon];
        return <button key={id} className={`nav-item ${tab===id?'active':''}`} onClick={()=>{setTab(id);setMobileMenu(false);setSearch('')}}><Icon size={18}/><span>{t[label]}</span></button>;
      })}
      <div className="side-bottom"><div className="open-status"><i/> Open 6:00 AM – 10:00 PM</div><small>Kandani · Feroza Road</small></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-toggle" onClick={()=>setMobileMenu(true)}><Menu/></button>
        <div><span className="eyebrow">PHARMACY MANAGEMENT</span><h2>{tab==='overview'?t.dashboard:listTitle}</h2></div>
        <div className="top-actions">
          <button className="icon-btn" title="Refresh" onClick={loadData}><RefreshCw size={18}/></button>
          <button className="language-btn" onClick={()=>setLang(lang==='en'?'ur':'en')}><Languages size={17}/>{t.language}</button>
          <button className="icon-btn" title={t.signOut} onClick={()=>supabase?.auth.signOut()}><LogOut size={18}/></button>
        </div>
      </header>
      {notice && <div className="toast" onClick={()=>setNotice('')}>{notice}<button><X size={14}/></button></div>}
      {tab==='overview' && <section>
        <div className="welcome-row"><div><h1>{t.welcome}</h1><p className="muted">Here is your pharmacy's business summary.</p></div><span className="date-pill">{new Date().toLocaleDateString()}</span></div>
        <div className="stats-grid">
          <Stat icon={<ShoppingCart/>} label={t.todaySales} value={money(todaySales)} />
          <Stat icon={<Wallet/>} label={t.expensesToday} value={money(todayExpenses)} />
          <Stat icon={<Users/>} label={t.patientsToday} value={String(todayPatients)} />
          <Stat icon={<Activity/>} label={t.grossProfit} value={money(todaySales-todayCost)} />
        </div>
        <div className="quick-actions">
          <button onClick={()=>openModal('sales')}><Plus/> {t.addSale}</button>
          <button onClick={()=>openModal('stock')}><Plus/> {t.addProduct}</button>
          <button onClick={()=>openModal('patients')}><Plus/> {t.addPatient}</button>
          <button onClick={()=>openModal('expenses')}><Plus/> {t.addExpense}</button>
        </div>
        <div className="content-grid">
          <div className="panel"><div className="panel-head"><h3>{t.recentSales}</h3><button className="text-btn" onClick={()=>setTab('sales')}>{t.all}</button></div><DataTable rows={data.sales.slice(0,6)} cols={['description','total_amount','payment_method']} empty={t.noData}/></div>
          <div className="panel"><div className="panel-head"><h3>{t.lowStock}</h3><span className="count">{lowStock.length}</span></div>{lowStock.length===0?<p className="empty">{t.noData}</p>:lowStock.slice(0,7).map(p=><div className="stock-row" key={p.id}><div><b>{p.name}</b><small>{p.category||'Medicine'}</small></div><strong>{p.quantity} left</strong></div>)}</div>
        </div>
      </section>}
      {tab!=='overview' && <section>
        <div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/><button className="primary" onClick={()=>openModal(tab)}><Plus size={17}/>{tab==='stock'?t.addProduct:tab==='sales'?t.addSale:tab==='purchases'?t.addPurchase:tab==='patients'?t.addPatient:tab==='expenses'?t.addExpense:'Export CSV'}</button></div>
        {tab==='reports' ? <Reports data={data} t={t}/> : <div className="panel"><DataTable rows={filtered} cols={tab==='stock'?['name','category','quantity','purchase_price','sale_price','expiry_date']:tab==='sales'?['description','quantity','total_amount','payment_method','created_at']:tab==='purchases'?['supplier','description','quantity','amount','created_at']:tab==='patients'?['name','phone','consultation_fee','notes','created_at']:['category','description','amount','created_at']} empty={t.noData}/></div>}
      </section>}
      <footer>GHAYAS UD DIN PHARMACY & MART <span>•</span> Secure cloud workspace</footer>
    </main>
    {modal && <Modal title={modal==='stock'?t.addProduct:modal==='sales'?t.addSale:modal==='purchases'?t.addPurchase:modal==='patients'?t.addPatient:t.addExpense} onClose={()=>setModal(null)}>
      <form className="entry-form" onSubmit={submit}>
        {modal==='stock' && <><Field label={t.name} name="name" required/><Field label={t.category} name="category"/><Field label={t.qty} name="quantity" type="number" required/><Field label={t.purchasePrice} name="purchase_price" type="number" step="0.01" required/><Field label={t.salePrice} name="sale_price" type="number" step="0.01" required/><Field label={t.expiry} name="expiry_date" type="date"/><Field label="Low stock alert at" name="low_stock_level" type="number" defaultValue="5"/></>}
        {modal==='sales' && <><Field label={t.medicine+' / '+t.name} name="description" required/><Field label={t.qty} name="quantity" type="number" defaultValue="1" required/><Field label={t.saleAmount} name="total_amount" type="number" step="0.01" required/><Field label={t.costAmount} name="cost_amount" type="number" step="0.01" required/><label>{t.payment}<select name="payment_method"><option value="cash">{t.cash}</option><option value="digital">{t.digital}</option><option value="credit">{t.credit}</option></select></label></>}
        {modal==='purchases' && <><Field label={t.supplier} name="supplier" required/><Field label={t.medicine+' / '+t.name} name="description" required/><Field label={t.qty} name="quantity" type="number" required/><Field label={t.amount} name="amount" type="number" required/><Field label={t.notes} name="notes"/></>}
        {modal==='patients' && <><Field label={t.name} name="name" required/><Field label={t.phone} name="phone"/><Field label={t.patientFee} name="consultation_fee" type="number" defaultValue="200" required/><Field label={t.notes} name="notes"/></>}
        {modal==='expenses' && <><Field label={t.category} name="category" required/><Field label={t.notes} name="description" required/><Field label={t.amount} name="amount" type="number" required/></>}
        <div className="form-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>{t.cancel}</button><button className="primary" type="submit">{t.save}</button></div>
      </form>
    </Modal>}
  </div>;
}

function Stat({icon,label,value}:{icon:any,label:string,value:string}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div>;
}
function Field({label,name,type='text',required=false,defaultValue,step}:{label:string,name:string,type?:string,required?:boolean,defaultValue?:string,step?:string}) {
  return <label>{label}<input name={name} type={type} required={required} defaultValue={defaultValue} step={step}/></label>;
}
function Modal({title,children,onClose}:{title:string,children:any,onClose:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</div></div>;
}
function DataTable({rows,cols,empty}:{rows:Row[],cols:string[],empty:string}) {
  if (!rows.length) return <p className="empty">{empty}</p>;
  return <div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}>{cols.map(c=><td key={c}>{c.includes('amount')||c.includes('price')||c.includes('fee')?money(Number(r[c])):c.includes('created_at')?new Date(r[c]).toLocaleString():String(r[c]??'—')}</td>)}</tr>)}</tbody></table></div>;
}
function Reports({data,t}:{data:Record<string,Row[]>,t:any}) {
  const sum = (rows:Row[],key:string) => rows.reduce((s,r)=>s+Number(r[key]||0),0);
  return <div className="stats-grid report-grid">
    <Stat icon={<ShoppingCart/>} label="Recorded sales" value={money(sum(data.sales,'total_amount'))}/>
    <Stat icon={<Wallet/>} label="Recorded expenses" value={money(sum(data.expenses,'amount'))}/>
    <Stat icon={<Package/>} label="Stock products" value={String(data.products.length)}/>
    <Stat icon={<Stethoscope/>} label="Patient visits" value={String(data.patients.length)}/>
  </div>;
}
