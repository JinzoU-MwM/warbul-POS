/* warbul.js — shared data + live store for the Warbul POS system.
   Loaded as a normal <script> (plain JS, no Babel) by all apps.
   Live sync across tabs/iframes via BroadcastChannel + storage events. */
(function () {
  "use strict";

  var SERVICE_FEE = 2000;

  /* ---------------- modifier groups ---------------- */
  var MOD_GROUPS = {
    size:  { id:"size",  name:"Ukuran", type:"single", options:[
      {id:"r",label:"Regular",price:0,def:true},{id:"l",label:"Large",price:5000}] },
    sugar: { id:"sugar", name:"Tingkat Gula", type:"single", options:[
      {id:"normal",label:"Normal",price:0,def:true},{id:"less",label:"Sedikit Gula",price:0},{id:"no",label:"Tanpa Gula",price:0}] },
    ice:   { id:"ice",   name:"Es", type:"single", options:[
      {id:"normal",label:"Normal",price:0,def:true},{id:"less",label:"Sedikit Es",price:0},{id:"no",label:"Tanpa Es",price:0},{id:"hot",label:"Panas",price:0}] },
    addon: { id:"addon", name:"Tambahan", type:"multi", options:[
      {id:"shot",label:"Extra Espresso Shot",price:6000},{id:"oat",label:"Ganti Oat Milk",price:7000},{id:"boba",label:"Tambah Boba",price:5000}] },
    spice: { id:"spice", name:"Level Pedas", type:"single", options:[
      {id:"0",label:"Tidak Pedas",price:0,def:true},{id:"1",label:"Pedas Sedang",price:0},{id:"2",label:"Pedas",price:0},{id:"3",label:"Extra Pedas",price:2000}] },
    extra: { id:"extra", name:"Ekstra", type:"multi", options:[
      {id:"egg",label:"Tambah Telur",price:5000},{id:"rice",label:"Tambah Nasi",price:6000}] },
    sauce: { id:"sauce", name:"Saus", type:"single", options:[
      {id:"original",label:"Original",price:0,def:true},{id:"bbq",label:"Saus BBQ",price:0},{id:"cheese",label:"Saus Keju",price:3000}] }
  };
  var MODS_BY_CAT = {
    "Kopi":["size","sugar","ice","addon"],
    "Non-Kopi":["size","sugar","ice","addon"],
    "Makanan":["spice","extra"],
    "Snack":["sauce"]
  };
  function modGroupsFor(item) {
    return (MODS_BY_CAT[item.cat] || []).map(function (k) { return MOD_GROUPS[k]; });
  }
  function defaultSelection(item) {
    var sel = {};
    modGroupsFor(item).forEach(function (g) {
      if (g.type === "single") { var d = g.options.find(function (o){return o.def;}) || g.options[0]; sel[g.id] = d.id; }
      else sel[g.id] = [];
    });
    return sel;
  }
  function unitPrice(item, sel) {
    var p = item.price;
    modGroupsFor(item).forEach(function (g) {
      var v = sel ? sel[g.id] : undefined;
      if (g.type === "single") { var o = g.options.find(function (x){return x.id===v;}); if (o) p += o.price; }
      else if (Array.isArray(v)) v.forEach(function (id){ var o=g.options.find(function(x){return x.id===id;}); if(o)p+=o.price; });
    });
    return p;
  }
  // human labels for the non-default chosen options (for cart/receipt)
  function modSummary(item, sel) {
    var out = [];
    modGroupsFor(item).forEach(function (g) {
      var v = sel ? sel[g.id] : undefined;
      if (g.type === "single") { var o = g.options.find(function (x){return x.id===v;}); if (o && !o.def) out.push(o.label); }
      else if (Array.isArray(v)) v.forEach(function (id){ var o=g.options.find(function(x){return x.id===id;}); if(o)out.push("+ "+o.label); });
    });
    return out;
  }

  /* ---------------- promo codes ---------------- */
  var PROMOS = [
    { code:"NGOPI5",   type:"flat", value:5000,  min:20000, desc:"Potongan Rp5.000" },
    { code:"WARBUL10", type:"pct",  value:10, max:10000, min:0,  desc:"Diskon 10%" },
    { code:"HEMAT20",  type:"pct",  value:20, max:15000, min:30000, desc:"Diskon 20% (maks Rp15.000)" }
  ];
  function applyPromo(code, subtotal) {
    var p = PROMOS.find(function (x){ return x.code === String(code||"").trim().toUpperCase(); });
    if (!p) return { ok:false, amount:0, message:"Kode promo tidak ditemukan" };
    if (subtotal < (p.min||0)) return { ok:false, amount:0, message:"Min. belanja "+rupiah(p.min)+" untuk kode ini" };
    var amt = p.type === "flat" ? p.value : Math.min(Math.round(subtotal*p.value/100), p.max||Infinity);
    return { ok:true, amount:amt, code:p.code, message:p.desc, promo:p };
  }

  /* ---------------- totals (single source of truth) ---------------- */
  // items: [{price:unitPrice, qty}]
  function computeTotals(items, promoAmount) {
    var subtotal = items.reduce(function (s,i){ return s + i.price*i.qty; }, 0);
    var service = items.length ? SERVICE_FEE : 0;
    var discount = Math.min(promoAmount||0, subtotal);
    var total = Math.max(0, subtotal - discount + service);
    return { subtotal:subtotal, service:service, discount:discount, total:total };
  }

  /* ---------------- seed menu (with stock) ---------------- */
  var SEED_MENU = [
    { id:"k1", name:"Es Kopi Susu Warbul", price:18000, cat:"Kopi", g:"cup", grad:["#6F4A2C","#3C2618"], tag:"Best Seller", available:true, stock:48, desc:"Espresso, susu segar, dan gula aren khas Warbul. Dingin, creamy, bikin nagih." },
    { id:"k2", name:"Kopi Susu Gula Aren", price:20000, cat:"Kopi", g:"cup", grad:["#7A5230","#45291A"], available:true, stock:30, desc:"Perpaduan kopi dan gula aren cair yang manis-pahit seimbang." },
    { id:"k3", name:"Americano", price:20000, cat:"Kopi", g:"cup", grad:["#4A3525","#241712"], available:true, stock:25, desc:"Double shot espresso dengan air, bersih dan bold." },
    { id:"k4", name:"Cappuccino", price:24000, cat:"Kopi", g:"cup", grad:["#8A6038","#503118"], available:true, stock:4, desc:"Espresso dengan foam susu lembut dan taburan cokelat." },
    { id:"k5", name:"Caramel Macchiato", price:28000, cat:"Kopi", g:"cup", grad:["#A9743F","#6B4423"], available:true, stock:18, desc:"Susu, vanilla, espresso, dan caramel drizzle." },
    { id:"k6", name:"Cafe Latte", price:24000, cat:"Kopi", g:"cup", grad:["#9A6E45","#5C3C22"], available:true, stock:22, desc:"Espresso lembut dengan banyak susu steamed." },
    { id:"n1", name:"Matcha Latte", price:26000, cat:"Non-Kopi", g:"cup", grad:["#5E7B47","#36502C"], available:true, stock:16, desc:"Matcha premium Jepang dengan susu segar." },
    { id:"n2", name:"Cokelat Panas", price:22000, cat:"Non-Kopi", g:"cup", grad:["#5C3A2A","#37211A"], available:true, stock:20, desc:"Cokelat hangat yang kaya dan menenangkan." },
    { id:"n3", name:"Es Teh Leci", price:16000, cat:"Non-Kopi", g:"cup", grad:["#B5683E","#7E4022"], available:true, stock:35, desc:"Teh segar dengan leci manis, paling pas siang hari." },
    { id:"n4", name:"Red Velvet Latte", price:26000, cat:"Non-Kopi", g:"cup", grad:["#9C3B3B","#5E2222"], available:false, stock:0, desc:"Red velvet creamy dengan foam lembut." },
    { id:"m1", name:"Nasi Goreng Warbul", price:28000, cat:"Makanan", g:"bowl", grad:["#C9762C","#8A4D1C"], tag:"Spesial", available:true, stock:14, desc:"Nasi goreng spesial dengan telur, ayam, dan kerupuk." },
    { id:"m2", name:"Mie Goreng Spesial", price:25000, cat:"Makanan", g:"bowl", grad:["#BE6F2C","#7E471A"], available:true, stock:12, desc:"Mie goreng dengan topping melimpah." },
    { id:"m3", name:"Chicken Katsu Curry", price:32000, cat:"Makanan", g:"bowl", grad:["#C98030","#84511C"], available:true, stock:3, desc:"Ayam katsu renyah dengan saus kari Jepang." },
    { id:"m4", name:"Spaghetti Aglio Olio", price:27000, cat:"Makanan", g:"bowl", grad:["#B0742F","#6E461C"], available:true, stock:10, desc:"Spaghetti bawang putih, olive oil, dan cabai." },
    { id:"s1", name:"Kentang Goreng", price:18000, cat:"Snack", g:"fries", grad:["#E0A431","#B97A1E"], available:true, stock:40, desc:"Kentang goreng renyah dengan saus pilihan." },
    { id:"s2", name:"Pisang Goreng Keju", price:17000, cat:"Snack", g:"fries", grad:["#D9982F","#A66D1C"], available:true, stock:24, desc:"Pisang goreng dengan keju parut dan susu." },
    { id:"s3", name:"Roti Bakar Cokelat", price:17000, cat:"Snack", g:"fries", grad:["#C98A3C","#915C1E"], available:true, stock:5, desc:"Roti bakar isi cokelat lumer." },
    { id:"s4", name:"Dimsum Ayam", price:20000, cat:"Snack", g:"bowl", grad:["#CC8A34","#8E5C1E"], available:true, stock:18, desc:"Dimsum ayam kukus, 4 pcs." }
  ];

  var CATS = ["Kopi", "Non-Kopi", "Makanan", "Snack"];
  var MENU_KEY = "warbul_menu_v2", ORDERS_KEY = "warbul_orders_v2", MEMBER_KEY = "warbul_members_v1";

  var channel = null;
  try { channel = new BroadcastChannel("warbul"); } catch (e) { channel = null; }
  var listeners = [];

  function read(key, fb){ try{ var v=localStorage.getItem(key); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
  function write(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function emit(kind){ if(channel){ try{ channel.postMessage({kind:kind,t:Date.now()}); }catch(e){} } listeners.forEach(function(cb){ try{cb(kind);}catch(e){} }); }

  function getMenu(){ var m=read(MENU_KEY,null); if(!m){ write(MENU_KEY,SEED_MENU); return SEED_MENU.map(function(x){return Object.assign({},x);}); } return m; }
  function saveMenu(m){ write(MENU_KEY,m); emit("menu"); }
  function isOrderable(it){ return it.available!==false && (it.stock===undefined || it.stock>0); }

  function getOrders(){ var o=read(ORDERS_KEY,null); if(!o){ o=seedOrders(); write(ORDERS_KEY,o); } return o; }
  function saveOrders(o){ write(ORDERS_KEY,o); emit("orders"); }

  function genId(){ var n=read("warbul_seq",4)+1; write("warbul_seq",n); return "WB-"+String(100+n); }

  function decrementStock(items){
    var m=getMenu(), changed=false;
    items.forEach(function(li){
      var p=m.find(function(x){return x.id===li.id;});
      if(p && typeof p.stock==="number"){ p.stock=Math.max(0,p.stock-li.qty); if(p.stock===0)p.available=false; changed=true; }
    });
    if(changed) saveMenu(m);
  }

  function addOrder(order){
    var orders=getOrders();
    order.id=genId(); order.createdAt=Date.now();
    orders.unshift(order);
    saveOrders(orders);
    decrementStock(order.items||[]);
    if(order.phone) recordLoyalty(order.phone, order.total||0);
    return order;
  }
  function updateOrder(id, patch){
    var orders=getOrders();
    for(var i=0;i<orders.length;i++){ if(orders[i].id===id){ Object.assign(orders[i],patch); break; } }
    saveOrders(orders);
  }

  /* ---------------- loyalty ---------------- */
  function getMembers(){ return read(MEMBER_KEY,{}); }
  function getMember(phone){ return getMembers()[phone] || null; }
  function recordLoyalty(phone, total){
    var members=getMembers();
    var m=members[phone] || {phone:phone, points:0, stamps:0, visits:0};
    m.points += Math.floor(total/1000);
    m.stamps = (m.stamps+1) % 10;       // 10-stamp card
    m.freeEarned = (m.freeEarned||0) + ((m.stamps===0)?1:0);
    m.visits += 1;
    members[phone]=m; write(MEMBER_KEY,members); emit("members");
    return m;
  }

  function onChange(cb){
    listeners.push(cb);
    if(channel) channel.onmessage=function(e){ cb(e.data&&e.data.kind); };
    window.addEventListener("storage",function(e){
      if(e.key===ORDERS_KEY)cb("orders"); if(e.key===MENU_KEY)cb("menu"); if(e.key===MEMBER_KEY)cb("members");
    });
  }

  function seedOrders(){
    var now=Date.now();
    function ord(o){ var t=computeTotals(o.items, o.discount||0); o.subtotal=t.subtotal; o.service=t.service; o.discount=t.discount; o.total=t.total; return o; }
    return [
      ord({ id:"WB-104", table:3, method:"qris", paid:false, status:"Menunggu Pembayaran", note:"Menunggu verifikasi kasir", createdAt:now-90*1000,
        items:[{id:"k1",name:"Es Kopi Susu Warbul",price:18000,qty:2,opts:["Large","Sedikit Gula"]},{id:"s1",name:"Kentang Goreng",price:18000,qty:1,opts:["Saus Keju"]}] }),
      ord({ id:"WB-103", table:9, method:"kasir", paid:false, status:"Menunggu Pembayaran", note:"Menunggu pembayaran di kasir", createdAt:now-5*60*1000,
        items:[{id:"m1",name:"Nasi Goreng Warbul",price:33000,qty:1,opts:["Pedas","+ Tambah Telur"]},{id:"n1",name:"Matcha Latte",price:26000,qty:1,opts:[]}] }),
      ord({ id:"WB-102", table:1, method:"qris", paid:true, status:"Diproses", payDetail:"QRIS terverifikasi", note:"Diteruskan ke dapur", createdAt:now-12*60*1000, promo:{code:"NGOPI5",amount:5000}, discount:5000,
        items:[{id:"k5",name:"Caramel Macchiato",price:28000,qty:1,opts:[]},{id:"s3",name:"Roti Bakar Cokelat",price:17000,qty:2,opts:[]}] }),
      ord({ id:"WB-101", table:5, method:"kasir", paid:true, status:"Selesai", payDetail:"Tunai", note:"Pesanan selesai", createdAt:now-26*60*1000,
        items:[{id:"k4",name:"Cappuccino",price:24000,qty:2,opts:["Tanpa Gula"]}] })
    ];
  }

  function resetAll(){
    write(MENU_KEY, SEED_MENU.map(function(x){return Object.assign({},x);}));
    write(ORDERS_KEY, seedOrders());
    write("warbul_seq", 4);
    write(MEMBER_KEY, {});
    emit("menu"); emit("orders"); emit("members");
  }

  function rupiah(n){ return "Rp"+Number(n||0).toLocaleString("id-ID"); }

  window.Warbul = {
    CATS:CATS, SEED_MENU:SEED_MENU, SERVICE_FEE:SERVICE_FEE,
    getMenu:getMenu, saveMenu:saveMenu, isOrderable:isOrderable,
    getOrders:getOrders, saveOrders:saveOrders, addOrder:addOrder, updateOrder:updateOrder,
    modGroupsFor:modGroupsFor, defaultSelection:defaultSelection, unitPrice:unitPrice, modSummary:modSummary,
    PROMOS:PROMOS, applyPromo:applyPromo, computeTotals:computeTotals,
    getMembers:getMembers, getMember:getMember, recordLoyalty:recordLoyalty,
    onChange:onChange, resetAll:resetAll, rupiah:rupiah,
    STATUS:{ WAIT_PAY:"Menunggu Pembayaran", PAID:"Dibayar", COOKING:"Diproses", DONE:"Selesai" }
  };
})();
