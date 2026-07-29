/* KAPTAN NİLİ BULUT POS - TAM ONARILMIŞ CANLI BAĞLANTI SÜRÜMÜ */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elemanları
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginUser = document.getElementById("loginUser");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");

let currentCashSession = null;
let currentProfile = null;
let saleProducts = [];
let selectedCategory = "Tümü";

// 1. GİRİŞ İŞLEMİ
async function login() {
  const selectedUser = loginUser ? loginUser.value : "";
  const password = loginPassword ? loginPassword.value : "";

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  let email = selectedUser;
  if (!email || !email.includes("@")) {
    email = "denizmazlumoglu@gmail.com"; // Supabase Auth mail adresi
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert("Giriş Başarısız: " + error.message);
      return;
    }

    if (loginScreen) loginScreen.style.display = "none";
    if (appShell) appShell.style.display = "block";

    // Veri yüklemelerini başlat
    await loadCashStatus();
    await loadProducts();
    await renderSales();

  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

// 2. KASA DURUMUNU YÜKLE
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
    cashStatus.textContent = "Kasa bilgisi alınamadı.";
  }
}

// 3. SUPABASE'DEN ÜRÜNLERİ VE KATEGORİLERİ ÇEK
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
    console.error("Ürün yükleme hatası:", err.message);
  }
}

// KATEGORİ BUTONLARINI ÇİZ
function renderCategories() {
  const strip = document.getElementById("categoryStrip");
  if (!strip) return;

  const categories = ["Tümü", ...new Set(saleProducts.map(p => p.category || "Diğer"))];
  strip.innerHTML = "";

  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-button" + (category === selectedCategory ? " active-category" : "");
    btn.textContent = category;
    btn.onclick = () => {
      selectedCategory = category;
      renderCategories();
      renderSaleProducts();
    };
    strip.appendChild(btn);
  });
}

// ÜRÜN KARTLARINI EKRANA BAS
function renderSaleProducts() {
  const grid = document.getElementById("saleProductsGrid");
  if (!grid) return;

  const filtered = saleProducts.filter(p => selectedCategory === "Tümü" || (p.category || "Diğer") === selectedCategory);
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="loading">Bu kategoride ürün bulunamadı.</div>';
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sale-product-card";
    card.innerHTML = `
      <div class="sale-product-name">${escapeHtml(product.name)}</div>
      <div class="sale-product-price">${formatMoney(product.price)}</div>
    `;
    grid.appendChild(card);
  });
}

// 4. ANLIK SATIŞLARI SUPABASE 'SALES' TABLOSUNDAN CANLI ÇEK
async function renderSales() {
  const list = document.getElementById("salesList");
  const totalElement = document.getElementById("salesDailyTotal");
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
      if (totalElement) totalElement.textContent = "0,00 TL";
      return;
    }

    let dailyTotal = 0;
    list.innerHTML = sales.map(sale => {
      dailyTotal += Number(sale.total_amount || 0);
      return `
        <div class="daily-sales-row">
          <div><strong>${new Date(sale.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</strong></div>
          <div>${escapeHtml(sale.payment_type || "Nakit")}</div>
          <div><strong>${formatMoney(sale.total_amount)}</strong></div>
        </div>
      `;
    }).join("");

    if (totalElement) totalElement.textContent = formatMoney(dailyTotal);

  } catch (err) {
    list.innerHTML = '<div class="loading">Satış verileri çekilemedi.</div>';
  }
}

// YARDIMCI FONKSİYONLAR
function formatMoney(val) {
  return Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// ETKİLEŞİM DİNLEYİCİLERİ
if (loginButton) loginButton.addEventListener("click", login);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}
