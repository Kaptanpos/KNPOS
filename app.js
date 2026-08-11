/* KAPTAN NİLİ BULUT POS - FULL TEMİZ VE SORUNSUZ SÜRÜM v3.7 */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentCashSession = null;
let selectedTableId = null;
const TABLE_STORAGE_KEY = "knpos_tables_v1";

// ZİL SESİ
function playOrderAlert() {
  const audio = document.getElementById('orderAlertSound');
  if (audio) { audio.currentTime = 0; audio.volume = 1.0; audio.play().catch(e => console.log(e)); }
}

// TEMA YÖNETİMİ
const THEME_STORAGE_KEY = "knpos_primary_color_v1";
async function loadThemeColor() {
  const savedColor = localStorage.getItem(THEME_STORAGE_KEY) || '#2d5a27';
  document.documentElement.style.setProperty('--primary', savedColor);
}

// GİRİŞ İŞLEMİ
async function login() {
  const password = document.getElementById("loginPassword")?.value;
  if (!password) return alert("Lütfen şifrenizi giriniz.");

  try {
    const { error } = await client.auth.signInWithPassword({
      email: "denizmazlumoglu@gmail.com",
      password: password
    });

    if (error) {
      alert("Giriş Başarısız: Şifre hatalı.");
      return;
    }

    const loginScreen = document.getElementById("loginScreen");
    const appShell = document.getElementById("appShell");
    if (loginScreen) loginScreen.style.display = "none";
    if (appShell) appShell.style.display = "block";

    bindEvents();
    renderTables();
    await loadThemeColor();
    loadInternetOrders();
  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

function logout() {
  if (confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
    client.auth.signOut();
    document.getElementById("appShell").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("loginPassword").value = "";
  }
}

// SAYFA VE MENÜ GEÇİŞLERİ
function showPage(pageName) {
  const pages = {
    tables: document.getElementById("pageTables"),
    ingredients: document.getElementById("pageIngredients"),
    internet: document.getElementById("pageInternet"),
    products: document.getElementById("pageProducts"),
    reports: document.getElementById("pageReports"),
    settings: document.getElementById("pageSettings")
  };

  Object.keys(pages).forEach(key => {
    if (pages[key]) pages[key].style.display = "none";
  });

  const activePage = pages[pageName] || pages.tables;
  if (activePage) activePage.style.display = "block";

  const navBtns = document.querySelectorAll(".main-nav button, header nav button");
  navBtns.forEach(btn => {
    const txt = (btn.textContent || "").trim().toUpperCase();
    btn.classList.remove("active-nav");
    if (pageName === "tables" && txt.includes("ANA MENÜ")) btn.classList.add("active-nav");
    if (pageName === "ingredients" && txt.includes("MALZEMELER")) btn.classList.add("active-nav");
    if (pageName === "internet" && txt.includes("İNTERNET")) btn.classList.add("active-nav");
    if (pageName === "products" && txt.includes("ÜRÜNLER")) btn.classList.add("active-nav");
    if (pageName === "reports" && txt.includes("RAPORLAR")) btn.classList.add("active-nav");
    if (pageName === "settings" && txt.includes("GENEL AYARLAR")) btn.classList.add("active-nav");
  });

  if (pageName === "internet") {
    loadInternetOrders();
  }
}

function setupNavigation() {
  const allNavButtons = document.querySelectorAll("header nav button, .main-nav button");
  allNavButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const txt = (btn.textContent || "").trim().toUpperCase();

      if (txt.includes("ANA MENÜ")) showPage("tables");
      else if (txt.includes("MALZEMELER")) showPage("ingredients");
      else if (txt.includes("İNTERNET")) showPage("internet");
      else if (txt.includes("ÜRÜNLER")) showPage("products");
      else if (txt.includes("RAPORLAR")) showPage("reports");
      else if (txt.includes("GENEL AYARLAR")) showPage("settings");
    };
  });
}

// MASA YÖNETİMİ
function renderTables() {
  const grid = document.getElementById("tablesGrid");
  if (!grid) return;
  const tables = JSON.parse(localStorage.getItem(TABLE_STORAGE_KEY)) || [
    { id: 1, name: "Masa 01", status: "closed", orders: [], total: 0 },
    { id: 2, name: "Masa 02", status: "closed", orders: [], total: 0 },
    { id: 3, name: "Masa 03", status: "closed", orders: [], total: 0 },
    { id: 4, name: "Masa 04", status: "closed", orders: [], total: 0 },
    { id: 5, name: "Masa 05", status: "closed", orders: [], total: 0 }
  ];
  grid.innerHTML = tables.map(t => `
    <button type="button" class="table-card ${t.status || 'closed'}">
      <div class="table-number">${escapeHtml(t.name)}</div>
      ${t.status === "open" ? `<div class="table-total">${formatMoney(t.total)}</div>` : ""}
    </button>
  `).join("");
}

// YARDIMCI ARAÇLAR
function formatMoney(val) {
  return Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// İNTERNET SİPARİŞLERİ VE FİLTRELEME (ÜRÜN MANTIĞIYLA AKTİF RENK)
window.setInternetFilter = function(type) {
  const startInput = document.getElementById("netStartDate");
  const endInput = document.getElementById("netEndDate");
  const btnToday = document.getElementById("btnNetToday");
  const btnMonth = document.getElementById("btnNetMonth");
  
  if (!startInput || !endInput) return;

  [btnToday, btnMonth].forEach(b => b && b.classList.remove("active-category"));
  
  const now = new Date();
  if (type === 'today') {
    if (btnToday) btnToday.classList.add("active-category");
    startInput.value = now.toISOString().split('T')[0];
    endInput.value = now.toISOString().split('T')[0];
  } else if (type === 'thisMonth') {
    if (btnMonth) btnMonth.classList.add("active-category");
    startInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    endInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`;
  }

  loadInternetOrders();
};

async function loadInternetOrders() {
  const tbody = document.getElementById("internetOrdersTbody");
  const channelSelect = document.getElementById("netPaymentChannelFilter");
  if (!tbody) return;

  try {
    const startVal = document.getElementById("netStartDate")?.value;
    const endVal = document.getElementById("netEndDate")?.value;
    
    let query = client.from("orders").select("*").order("created_at", { ascending: false });
    if (startVal && endVal) {
      query = query.gte("created_at", startVal + "T00:00:00").lte("created_at", endVal + "T23:59:59");
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    let filtered = orders || [];
    if (channelSelect && channelSelect.value) {
      const ch = channelSelect.value.trim().toLowerCase();
      filtered = filtered.filter(o => (o.payment_channel || o.platform || o.payment_method || "kaptannilicom").trim().toLowerCase() === ch);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Sipariş bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td>${new Date(o.created_at).toLocaleDateString('tr-TR')}<br><small style="color:var(--text-muted);">${new Date(o.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'})}</small></td>
        <td><strong>#${o.order_id || o.id}</strong></td>
        <td>${o.products ? JSON.parse(o.products).map(p => p.name).join(", ") : "Ürün detayı yok"}</td>
        <td><strong style="color:var(--primary);">${formatMoney(o.total_price || o.total_amount)}</strong></td>
        <td>${o.payment_channel || o.platform || "KaptanNili.com"}</td>
        <td style="text-align:right"><button type="button" class="btn-primary" onclick='openInternetOrderDetail(${JSON.stringify(o)})'>🔍 Detay</button></td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Sipariş yükleme hatası:", err);
  }
}

function openInternetOrderDetail(order) {
  alert("Sipariş Detayı: #" + (order.order_id || order.id));
}

function initRealtimeOrders() {
  client.channel('public:orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
    playOrderAlert();
    loadInternetOrders();
  }).subscribe();
}

function bindEvents() {
  setupNavigation();
  document.getElementById("btnNetToday")?.addEventListener("click", () => setInternetFilter('today'));
  document.getElementById("btnNetMonth")?.addEventListener("click", () => setInternetFilter('thisMonth'));
  initRealtimeOrders();
}

// BAŞLANGIÇ
document.addEventListener("DOMContentLoaded", () => {
  loadThemeColor();
});

document.getElementById("loginButton")?.addEventListener("click", login);
document.getElementById("logoutButton")?.addEventListener("click", logout);
document.getElementById("loginPassword")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
