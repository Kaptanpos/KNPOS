/* KAPTAN NİLİ BULUT POS - EKSİKSİZ VE FULL ENTEGRE SÜRÜM */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elemanları
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginUser = document.getElementById("loginUser");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

let currentCashSession = null;
let currentProfile = { role: "admin", full_name: "Deniz Mazlumoğlu" };
let selectedTableId = null;
let saleProducts = [];
let selectedCategory = "Tümü";

const TABLE_STORAGE_KEY = "knpos_tables_v1";
const DEFAULT_TABLES = [
  { id: 1, name: "Masa 1", status: "closed", orders: [], total: 0 },
  { id: 2, name: "Masa 2", status: "closed", orders: [], total: 0 },
  { id: 3, name: "Masa 3", status: "closed", orders: [], total: 0 },
  { id: 4, name: "Masa 4", status: "closed", orders: [], total: 0 },
  { id: 5, name: "Masa 5", status: "closed", orders: [], total: 0 }
];

// 1. GİRİŞ İŞLEMİ
async function login() {
  const password = loginPassword ? loginPassword.value : "";

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  try {
    // Supabase Auth Doğrulaması
    const { data, error } = await client.auth.signInWithPassword({
      email: "denizmazlumoglu@gmail.com",
      password: password
    });

    if (error) {
      alert("Giriş Başarısız: Şifre hatalı veya kullanıcı bulunamadı.");
      return;
    }

    if (loginScreen) loginScreen.style.display = "none";
    if (appShell) appShell.style.display = "block";

    // Tüm ekranları canlandır
    renderTables();
    await loadCashStatus();
    await loadProducts();
    await renderSales();

  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

function logout() {
  if (confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
    client.auth.signOut();
    if (appShell) appShell.style.display = "none";
    if (loginScreen) loginScreen.style.display = "flex";
    if (loginPassword) loginPassword.value = "";
  }
}

// 2. MASA YÖNETİMİ & EKRANA BASTIRMA
function getTables() {
  try {
    const saved = JSON.parse(localStorage.getItem(TABLE_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (_) {}
  localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
  return DEFAULT_TABLES;
}

function saveTables(tables) {
  localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(tables));
}

function renderTables() {
  const grid = document.getElementById("tablesGrid");
  if (!grid) return;

  const tables = getTables();
  grid.innerHTML = "";

  tables.forEach(table => {
    const wrapper = document.createElement("div");
    wrapper.className = "table-card-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `table-card ${table.status || 'closed'}`;
    const num = String(table.name || "").replace(/[^0-9]/g, "") || table.id;
    
    button.innerHTML = `
      <div class="table-number">${String(num).padStart(2, "0")}</div>
      ${table.status === "open" ? `<div class="table-total">${formatMoney(table.total)}</div>` : ""}
    `;
    
    button.onclick = () => openTableModal(table.id);
    wrapper.appendChild(button);
    grid.appendChild(wrapper);
  });
}

async function openTableModal(tableId) {
  selectedTableId = tableId;
  const tables = getTables();
  const table = tables.find(t => t.id === tableId);
  if (!table) return;

  const tableModal = document.getElementById("tableModal");
  const modalName = document.getElementById("modalTableName");
  if (modalName) modalName.textContent = table.name;

  if (table.status === "closed") {
    table.status = "open";
    table.openedAt = new Date().toISOString();
    table.total = 0;
    table.orders = [];
    saveTables(tables);
    renderTables();
  }

  await loadProducts();
  renderCart();
  if (tableModal) tableModal.classList.add("show");
}

function closeTableModal() {
  const tableModal = document.getElementById("tableModal");
  if (tableModal) tableModal.classList.remove("show");
  renderTables();
}

// 3. KASA YÖNETİMİ
async function loadCashStatus() {
  const cashStatus = document.getElementById("cashStatus");
  if (!cashStatus) return;

  try {
    const { data, error } = await client
      .from("cash_sessions")
      .select("*")
      .eq("status", "open")
      .order("id", { ascending: false })
      .limit(1);

    if (error) throw error;
    currentCashSession = data && data.length > 0 ? data[0] : null;

    if (currentCashSession) {
      cashStatus.className = "cash-status cash-open";
      cashStatus.innerHTML = `
        <div class="cash-status-title">KASA AÇIK</div>
        <div class="cash-detail">Açılış Nakdi: <strong>${formatMoney(currentCashSession.opening_amount)}</strong></div>
      `;
    } else {
      cashStatus.className = "cash-status cash-closed";
      cashStatus.innerHTML = `
        <div class="cash-status-title">KASA KAPALI</div>
        <div class="cash-detail">Satış yapmadan önce kasayı açınız.</div>
      `;
    }
  } catch (err) {
    cashStatus.textContent = "Kasa durumu kontrol edilemedi.";
  }
}

// 4. ÜRÜNLER VE SEPET İŞLEMLERİ
async function loadProducts() {
  try {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    saleProducts = data || [];
    renderCategories();
    renderSaleProducts();
  } catch (err) {
    console.error("Ürün hatası:", err.message);
  }
}

function renderCategories() {
  const strip = document.getElementById("categoryStrip");
  if (!strip) return;
  const categories = ["Tümü", ...new Set(saleProducts.map(p => p.category || "Diğer"))];
  strip.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-button" + (cat === selectedCategory ? " active-category" : "");
    btn.textContent = cat;
    btn.onclick = () => {
      selectedCategory = cat;
      renderCategories();
      renderSaleProducts();
    };
    strip.appendChild(btn);
  });
}

function renderSaleProducts() {
  const grid = document.getElementById("saleProductsGrid");
  if (!grid) return;

  const filtered = saleProducts.filter(p => selectedCategory === "Tümü" || (p.category || "Diğer") === selectedCategory);
  grid.innerHTML = "";

  filtered.forEach(product => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sale-product-card";
    card.innerHTML = `
      <div class="sale-product-name">${escapeHtml(product.name)}</div>
      <div class="sale-product-price">${formatMoney(product.price)}</div>
    `;
    card.onclick = () => addToCart(product);
    grid.appendChild(card);
  });
}

function addToCart(product) {
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;

  let item = table.orders.find(o => o.productId === product.id);
  if (item) {
    item.quantity += 1;
  } else {
    table.orders.push({ productId: product.id, name: product.name, price: Number(product.price), quantity: 1 });
  }

  table.total = table.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
  saveTables(tables);
  renderCart();
  renderTables();
}

function renderCart() {
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");

  if (!cartList || !table) return;
  cartList.innerHTML = "";

  if (table.orders.length === 0) {
    cartList.innerHTML = '<div class="cart-empty">Henüz ürün eklenmedi.</div>';
    if (cartTotal) cartTotal.textContent = formatMoney(0);
    return;
  }

  table.orders.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div><strong>${escapeHtml(item.name)}</strong> - ${item.quantity} Adet</div>
      <div>${formatMoney(item.price * item.quantity)}</div>
    `;
    cartList.appendChild(row);
  });

  if (cartTotal) cartTotal.textContent = formatMoney(table.total);
}

// 5. ANLIK SATIŞLAR TABLOSU
async function renderSales() {
  const list = document.getElementById("salesList");
  const totalElem = document.getElementById("salesDailyTotal");
  if (!list) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: sales, error } = await client
      .from("sales")
      .select("*")
      .gte("created_at", today)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!sales || sales.length === 0) {
      list.innerHTML = '<div class="loading">Bugün henüz satış yapılmadı.</div>';
      if (totalElem) totalElem.textContent = "0,00 TL";
      return;
    }

    let sum = 0;
    list.innerHTML = sales.map(s => {
      sum += Number(s.total_amount || 0);
      return `
        <div class="daily-sales-row">
          <div><strong>${new Date(s.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</strong></div>
          <div>${escapeHtml(s.payment_type || "Nakit")}</div>
          <div><strong>${formatMoney(s.total_amount)}</strong></div>
        </div>
      `;
    }).join("");

    if (totalElem) totalElem.textContent = formatMoney(sum);
  } catch (err) {
    list.innerHTML = '<div class="loading">Satışlar çekilemedi.</div>';
  }
}

// YARDIMCI BİLEŞENLER
function formatMoney(val) {
  return Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// OLAY DİNLEYİCİLERİ
if (loginButton) loginButton.addEventListener("click", login);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}

const cancelTableBtn = document.getElementById("cancelTableButton");
if (cancelTableBtn) cancelTableBtn.addEventListener("click", closeTableModal);

const topCloseBtn = document.getElementById("topClosePanelButton");
if (topCloseBtn) topCloseBtn.addEventListener("click", closeTableModal);
