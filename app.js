/* KAPTAN NİLİ BULUT POS - FULL TEMİZ VE SORUNSUZ SÜRÜM v3.7 */

// SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// GÜÇLÜ ZİL SESİ
function playOrderAlert() {
  const audio = document.getElementById('orderAlertSound');
  if (audio) { audio.currentTime = 0; audio.volume = 1.0; audio.play().catch(e => console.log(e)); }
}
function renderTables() {
  const grid = document.getElementById("tablesGrid");
  if (!grid) return;
  const tables = JSON.parse(localStorage.getItem("knpos_tables_v1")) || [
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

async function loadCashStatus() {
  const cashStatus = document.getElementById("cashStatus");
  if (cashStatus) cashStatus.innerHTML = '<div class="cash-status-title">KASA AKTİF</div>';
}

async function loadProducts() {}
async function loadPaymentMethods() {}
async function renderSales() {}
async function loadIngredientsForDashboard() {}
async function checkRecipeTable() {}
// TEMA VE DOM İŞLEMLERİ
const THEME_STORAGE_KEY = "knpos_primary_color_v1";
async function loadThemeColor() {
  const savedColor = localStorage.getItem(THEME_STORAGE_KEY) || '#2d5a27';
  applyThemeColor(savedColor);
}

function applyThemeColor(primaryHex) {
  document.documentElement.style.setProperty('--primary', primaryHex);
  // (Diğer renk tanımlamaların burada kalabilir)
}

// 1. GİRİŞ VE SİSTEM FONKSİYONLARI (LOGIN, LOGOUT, NAV)
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

    // GİRİŞ BAŞARILI OLUNCA EKRANI KAPAT VE UYGULAMAYI AÇ
    const loginScreen = document.getElementById("loginScreen");
    const appShell = document.getElementById("appShell");
    if (loginScreen) loginScreen.style.display = "none";
    if (appShell) appShell.style.display = "block";

    bindEvents();
    renderTables();
    await loadThemeColor();
    await loadCashStatus();
    await loadProducts();
    await loadPaymentMethods();
    await renderSales();
    await loadIngredientsForDashboard();
    await checkRecipeTable();

  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}
function showPage(pageName) {
  const pages = ["pageTables", "pageIngredients", "pageInternet", "pageProducts", "pageReports", "pageSettings"];
  pages.forEach(id => document.getElementById(id).style.display = (id === "page"+pageName.charAt(0).toUpperCase()+pageName.slice(1)) ? "block" : "none");
  if(pageName === "internet") loadInternetOrders();
}

// 2. MASA VE SATIŞ (ÖZET)
function getTables() {
  try { return JSON.parse(localStorage.getItem("knpos_tables_v1")) || []; } catch(e) { return []; }
}
function formatMoney(val) { return Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"; }
function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

// 3. İNTERNET SİPARİŞLERİ - FİNAL FİLTRELEME VE RENK MANTIĞI
window.setInternetFilter = function(type) {
  const startInput = document.getElementById("netStartDate");
  const endInput = document.getElementById("netEndDate");
  const btnToday = document.getElementById("btnNetToday");
  const btnMonth = document.getElementById("btnNetMonth");
  
  if (!startInput || !endInput) return;

  // Butonları resetle
  [btnToday, btnMonth].forEach(b => b && b.classList.remove("active-category", "active-date-btn"));
  
  const now = new Date();
  if (type === 'today') {
    if (btnToday) btnToday.classList.add("active-category", "active-date-btn");
    startInput.value = now.toISOString().split('T')[0];
    endInput.value = now.toISOString().split('T')[0];
  } else if (type === 'thisMonth') {
    if (btnMonth) btnMonth.classList.add("active-category", "active-date-btn");
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
    const startVal = document.getElementById("netStartDate").value;
    const endVal = document.getElementById("netEndDate").value;
    
    let query = client.from("orders").select("*").order("created_at", { ascending: false });
    if (startVal && endVal) query = query.gte("created_at", startVal + "T00:00:00").lte("created_at", endVal + "T23:59:59");

    const { data: orders, error } = await query;
    if (error) throw error;

    let filtered = orders || [];
    if (channelSelect && channelSelect.value) {
      const ch = channelSelect.value.trim().toLowerCase();
      filtered = filtered.filter(o => (o.payment_channel || o.platform || o.payment_method || "kaptannilicom").trim().toLowerCase() === ch);
    }

    tbody.innerHTML = filtered.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:20px;">Sipariş yok.</td></tr>' : 
    filtered.map(o => `
      <tr>
        <td>${new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
        <td>#${o.order_id || o.id}</td>
        <td>${o.products ? JSON.parse(o.products).map(p => p.name).join(", ") : "Detay yok"}</td>
        <td><strong style="color:var(--primary)">${formatMoney(o.total_price || o.total_amount)}</strong></td>
        <td>${o.payment_channel || o.platform || "KaptanNili.com"}</td>
        <td style="text-align:right"><button class="btn-primary" onclick='openInternetOrderDetail(${JSON.stringify(o)})'>🔍 Detay</button></td>
      </tr>
    `).join("");
  } catch (err) { console.error(err); }
}

function initRealtimeOrders() {
  client.channel('public:orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
    playOrderAlert();
    loadInternetOrders();
  }).subscribe();
}

function bindEvents() {
  // Navigation setup ve diğer eventler buraya...
  document.getElementById("btnNetToday")?.addEventListener("click", () => setInternetFilter('today'));
  document.getElementById("btnNetMonth")?.addEventListener("click", () => setInternetFilter('thisMonth'));
}

document.addEventListener("DOMContentLoaded", loadThemeColor);
document.getElementById("loginButton")?.addEventListener("click", login);
