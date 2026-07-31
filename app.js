// ==========================================
// SUPABASE BAĞLANTISI VE GLOBAL DEĞİŞKENLER
// ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://stytmmafrrtqaxobihap.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ADİSYO API BİLGİLERİ (Geldikçe kendi anahtarlarını buraya yazabilirsin)
const ADISYO_MOBILE_APP_KEY = "BURAYA_MOBILE_KEY_GELECEK";
const ADISYO_WEB_APP_KEY = "BURAYA_WEB_KEY_GELECEK";
const ADISYO_API_SECRET_KEY = "BURAYA_SECRET_KEY_GELECEK";

let currentTableId = null;
let currentCart = [];
let allProducts = [];
let allIngredients = [];
let activeCategories = [];
let paymentMethods = ['Nakit', 'Kredi Kartı', 'Yemeksepeti', 'Getir Yemek'];

// ==========================================
// UYGULAMA BAŞLANGICI VE GİRİŞ KONTROLÜ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const savedAuth = localStorage.getItem("kaptan_nili_auth");
  if (savedAuth === "true") {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appShell").style.display = "flex";
    initializeAppData();
  }

  document.getElementById("loginButton").addEventListener("click", handleLogin);
  document.getElementById("loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("kaptan_nili_auth");
    location.reload();
  });
});

function handleLogin() {
  const pass = document.getElementById("loginPassword").value;
  // Şimdilik hangi şifreyi girersen gir direkt içeri alsın kanka
  if (pass.length > 0) { 
    localStorage.setItem("kaptan_nili_auth", "true");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appShell").style.display = "flex";
    initializeAppData();
  } else {
    alert("Lütfen şifre gir kanka!");
  }
}

async function initializeAppData() {
  await checkCashRegisterStatus();
  await loadTables();
  await loadDailySales();
  await loadIngredients();
  await loadProductsForManagement();
  setupEventListeners();
}

// ==========================================
// SAYFA GEÇİŞLERİ (NAVİGASYON)
// ==========================================
function showPage(pageName) {
  // Tüm sayfaları gizle
  const pages = ['pageTables', 'pageIngredients', 'pageInternet', 'pageProducts', 'pageReports', 'pageSettings'];
  pages.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });

  // Hedef sayfayı aç
  const targetMap = {
    'tables': 'pageTables',
    'ingredients': 'pageIngredients',
    'internet': 'pageInternet',
    'products': 'pageProducts',
    'reports': 'pageReports',
    'settings': 'pageSettings'
  };

  const targetId = targetMap[pageName];
  if (targetId) {
    document.getElementById(targetId).style.display = pageName === 'tables' ? 'flex' : 'block';
  }

  // Buton aktiflik sınıflarını düzenle
  const buttons = document.querySelectorAll('header nav button');
  buttons.forEach(btn => btn.classList.remove('active-nav'));
  event.target.classList.add('active-nav');

  if (pageName === 'reports') {
    loadReportsData();
  } else if (pageName === 'settings') {
    renderPaymentMethods();
  }
}

// ==========================================
// KASA DURUMU VE YÖNETİMİ
// ==========================================
async function checkCashRegisterStatus() {
  const todayStr = new Date().toISOString().split('T')[0];
  const { data, error } = await client
    .from("cash_registers")
    .select("*")
    .eq("date", todayStr)
    .single();

  const statusDiv = document.getElementById("cashStatus");
  const openPanel = document.getElementById("openCashPanel");
  const closePanel = document.getElementById("closeCashPanel");

  if (data && data.is_open) {
    statusDiv.innerHTML = `<div class="cash-status cash-open"><div class="cash-status-title">KASA AÇIK</div>Açılış Nakdi: ${Number(data.opening_amount).toFixed(2)} TL</div>`;
    openPanel.style.display = "none";
    closePanel.style.display = "block";
  } else {
    statusDiv.innerHTML = `<div class="cash-status cash-closed"><div class="cash-status-title">KASA KAPALI</div>Satış yapmadan önce kasayı açınız.</div>`;
    openPanel.style.display = "block";
    closePanel.style.display = "none";
  }
}

document.getElementById("openCashButton")?.addEventListener("click", async () => {
  const amount = parseFloat(document.getElementById("openingAmount").value);
  if (isNaN(amount) || amount < 0) {
    alert("Geçerli bir açılış tutarı gir kanka.");
    return;
  }
  const todayStr = new Date().toISOString().split('T')[0];
  const { error } = await client.from("cash_registers").insert({
    date: todayStr,
    opening_amount: amount,
    is_open: true
  });

  if (error) {
    alert("Kasa açılırken hata oluştu: " + error.message);
  } else {
    alert("Kasa başarıyla açıldı kanka!");
    checkCashRegisterStatus();
  }
});

document.getElementById("closeCashButton")?.addEventListener("click", async () => {
  const closingAmount = parseFloat(document.getElementById("closingAmount").value);
  if (isNaN(closingAmount)) {
    alert("Lütfen sayılan kapanış nakit tutarını gir kanka.");
    return;
  }
  const todayStr = new Date().toISOString().split('T')[0];
  const { error } = await client.from("cash_registers")
    .update({ is_open: false, closing_amount: closingAmount })
    .eq("date", todayStr);

  if (error) {
    alert("Kasa kapatılırken hata oluştu: " + error.message);
  } else {
    alert("Kasa başarıyla kapatıldı kanka. Hayırlı kazançlar!");
    checkCashRegisterStatus();
  }
});

// ==========================================
// ADİSYO & İNTERNET SİPARİŞLERİ ENTEGRASYONU
// ==========================================
async function fetchAdisyoOrders() {
  try {
    const response = await fetch("https://api.adisyo.com/v1/orders/pending", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "MobileAppKey": ADISYO_MOBILE_APP_KEY,
        "WebAppKey": ADISYO_WEB_APP_KEY,
        "ApiSecretKey": ADISYO_API_SECRET_KEY
      }
    });

    if (!response.ok) {
      throw new Error("Adisyo sunucusuna bağlanılamadı. Kod: " + response.status);
    }

    const result = await response.json();
    const adisyoOrders = result.data || result;

    if (!adisyoOrders || adisyoOrders.length === 0) {
      alert("Adisyo havuzunda bekleyen yeni internet siparişi yok kanka.");
      return;
    }

    const container = document.getElementById("internetOrdersContainer");
    container.innerHTML = `<h4 style="margin-bottom:10px; color:var(--primary);">Çekilen Siparişler (${adisyoOrders.length} Adet):</h4>`;

    for (const order of adisyoOrders) {
      const totalAmount = Number(order.totalAmount || order.total || 0);
      const paymentChannel = order.channel || order.paymentType || "Adisyo / Online";

      // Satışı veritabanına işle
      const { data: saleRecord, error: saleErr } = await client
        .from("sales")
        .insert({ 
          total_amount: totalAmount, 
          payment_type: paymentChannel 
        })
        .select("id")
        .single();

      if (saleErr) throw saleErr;

      if (order.items && order.items.length > 0) {
        const saleItemsPayload = order.items.map(item => ({
          sale_id: saleRecord.id,
          product_id: item.productId || 1,
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.price || 0),
          line_total: Number(item.quantity || 1) * Number(item.price || 0)
        }));

        await client.from("sale_items").insert(saleItemsPayload);
      }

      container.innerHTML += `<div style="padding:10px; border-bottom:1px solid var(--border-color); font-size:13px;">Sipariş ID: <b>#${order.id || 'Online'}</b> - Tutar: <b>${totalAmount.toFixed(2)} TL</b> (${paymentChannel}) <span style="color:#16a34a; font-weight:bold; float:right;">Eşitlendi ✓</span></div>`;
    }

    alert("🎉 Adisyo siparişleri başarıyla içeri alındı ve kasaya işlendi kanka!");
    await loadDailySales();

  } catch (err) {
    console.error("Adisyo Entegrasyon Hatası:", err);
    alert("Adisyo verileri çekilirken hata oluştu: " + err.message);
  }
}

// ==========================================
// DİĞER TEMEL FONKSİYONLAR (Masalar, Stok vb.)
// ==========================================
async function loadTables() {
  const { data, error } = await client.from("tables").select("*").order("id");
  const grid = document.getElementById("tablesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (error || !data) {
    grid.innerHTML = "<p>Masalar yüklenemedi kanka.</p>";
    return;
  }

  data.forEach(table => {
    const card = document.createElement("div");
    card.className = `table-card ${table.is_open ? 'open' : ''}`;
    card.innerHTML = `
      <div class="table-number">${table.name}</div>
      <div class="table-total">${table.is_open ? Number(table.current_total || 0).toFixed(2) + ' TL' : 'Boş'}</div>
      <div style="font-size:11px; color:var(--text-muted);">${table.is_open ? 'Dolu' : 'Tıkla Aç'}</div>
    `;
    card.onclick = () => openTableModal(table);
    grid.appendChild(card);
  });
}

async function loadDailySales() {
  const todayStr = new Date().toISOString().split('T')[0];
  const { data, error } = await client
    .from("sales")
    .select("*")
    .gte("created_at", todayStr + "T00:00:00")
    .order("created_at", { ascending: false });

  const listContainer = document.getElementById("salesList");
  const totalSpan = document.getElementById("salesDailyTotal");
  if (!listContainer) return;

  listContainer.innerHTML = "";
  let totalCiro = 0;

  if (error || !data || data.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:12px;">Bugün henüz satış yapılmadı.</div>`;
    if (totalSpan) totalSpan.innerText = "0,00 TL";
    return;
  }

  data.forEach(sale => {
    totalCiro += Number(sale.total_amount || 0);
    const row = document.createElement("div");
    row.className = "daily-sales-row";
    row.innerHTML = `
      <span>#${sale.id} - ${new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${sale.payment_type || 'Nakit'})</span>
      <strong style="color:var(--primary);">${Number(sale.total_amount).toFixed(2)} TL</strong>
    `;
    listContainer.appendChild(row);
  });

  if (totalSpan) totalSpan.innerText = totalCiro.toFixed(2) + " TL";
}

async function loadIngredients() {
  const { data, error } = await client.from("ingredients").select("*").order("name");
  const tbody = document.getElementById("ingredientsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (error || !data) return;

  data.forEach(ing => {
    const isCritical = Number(ing.stock) <= 5; // Kritik stok sınırı
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ing.name}</td>
      <td><strong>${ing.stock}</strong></td>
      <td>${ing.unit}</td>
      <td>${isCritical ? '<span class="badge-critical">Kritik Stok</span>' : '<span class="badge-active">Normal</span>'}</td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editIngredient(${ing.id}, '${ing.name}', '${ing.unit}', ${ing.stock})">Düzenle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadProductsForManagement() {
  const { data, error } = await client.from("products").select("*").order("name");
  const tbody = document.getElementById("managementProductsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (error || !data) return;
  allProducts = data;

  data.forEach(prod => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${prod.image_url || 'https://via.placeholder.com/40'}" style="width:35px; height:35px; border-radius:4px; object-fit:cover;"></td>
      <td><strong>${prod.name}</strong></td>
      <td>${prod.category}</td>
      <td>${Number(prod.price).toFixed(2)} TL</td>
      <td><span class="badge-active">Aktif</span></td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editProduct(${prod.id})">Düzenle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setupEventListeners() {
  // Yeni masa ekleme butonu
  document.getElementById("addNewTableBtn")?.addEventListener("click", async () => {
    const tableName = prompt("Yeni Masa Adı / Numarası (Örn: Masa 12):");
    if (!tableName) return;
    const { error } = await client.from("tables").insert({ name: tableName, is_open: false, current_total: 0 });
    if (error) alert("Masa eklenemedi: " + error.message);
    else loadTables();
  });
}

function openTableModal(table) {
  currentTableId = table.id;
  document.getElementById("modalTableName").innerText = table.name + " - Sipariş Ekranı";
  document.getElementById("tableModal").style.display = "flex";
  // Ürünleri ve sepeti yükleme tetikleyicileri buraya bağlanır
}

document.getElementById("topClosePanelButton")?.addEventListener("click", () => {
  document.getElementById("tableModal").style.display = "none";
});

document.getElementById("cancelTableButton")?.addEventListener("click", () => {
  document.getElementById("tableModal").style.display = "none";
});

function loadReportsData() {
  // Raporlar ekranı yükleme fonksiyonu
}

function renderPaymentMethods() {
  // Ödeme kanalları listeleme fonksiyonu
}
