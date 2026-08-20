/* KAPTAN NİLİ BULUT POS - AHK ZORUNLU KURYE SÜRÜMÜ v14 */

// GÜÇLÜ ZİL SESİ FONKSİYONU
function playOrderAlert() {
  const audio = document.getElementById('orderAlertSound');
  if (audio) {
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().catch(err => {
      console.log("Tarayıcı otomatik ses engeline takıldı, kullanıcı etkileşimi bekleniyor.", err);
    });
  }
}

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elemanları
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

let currentCashSession = null;
let selectedTableId = null;
let realtimeOrdersChannel = null;
let saleProducts = [];
let allIngredients = [];
let paymentMethods = [];
let selectedCategory = "Tümü";

const TABLE_STORAGE_KEY = "knpos_tables_v1";
const DEFAULT_TABLES = [
  { id: 1, name: "Masa 01", status: "closed", orders: [], total: 0 },
  { id: 2, name: "Masa 02", status: "closed", orders: [], total: 0 },
  { id: 3, name: "Masa 03", status: "closed", orders: [], total: 0 },
  { id: 4, name: "Masa 04", status: "closed", orders: [], total: 0 },
  { id: 5, name: "Masa 05", status: "closed", orders: [], total: 0 }
];

async function checkRecipeTable() {
  try {
    const { error: recipeErr } = await client.from("recipes").select("*").limit(1);
    if (!recipeErr) return "recipes";
  } catch (err) {
    console.error("Tablo hatası:", err.message);
  }
}

// TEMA RENK YÖNETİMİ
const THEME_STORAGE_KEY = "knpos_primary_color_v1";

async function loadThemeColor() {
  try {
    const savedColor = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedColor) {
      applyThemeColor(savedColor);
    } else {
      applyThemeColor('#2d5a27');
    }
  } catch (err) {
    console.log("Tema yüklenemedi, varsayılan kullanılıyor.");
  }
}

function changeThemeColor(primaryHex, darkHex) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, primaryHex);
    localStorage.setItem("knpos_primary_dark_v1", darkHex);
    applyThemeColor(primaryHex, darkHex);
  } catch (err) {
    console.error("Tema değiştirilemedi:", err);
  }
}

function applyThemeColor(primaryHex, darkHex) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, primaryHex);
    if (darkHex) localStorage.setItem("knpos_primary_dark_v1", darkHex);
  } catch (err) {}

  document.documentElement.style.setProperty('--primary', primaryHex);
  
  let resolvedDark = darkHex || primaryHex;
  if (!darkHex) {
    if (primaryHex === '#2d5a27') resolvedDark = '#1e3d1a';
    else if (primaryHex === '#0f766e') resolvedDark = '#115e59';
    else if (primaryHex === '#78350f') resolvedDark = '#451a03';
    else if (primaryHex === '#1e3a8a') resolvedDark = '#172554';
    else if (primaryHex === '#9d174d') resolvedDark = '#831843';
    else if (primaryHex === '#000000') resolvedDark = '#1c1917';
    else if (primaryHex === '#ef4444') resolvedDark = '#dc2626';
    else if (primaryHex === '#eab308') resolvedDark = '#ca8a04';
    else if (primaryHex === '#06b6d4') resolvedDark = '#0891b2';
    else if (primaryHex === '#ec4899') resolvedDark = '#be185d';
    else if (primaryHex === '#f97316') resolvedDark = '#c2410c';
    else if (primaryHex === '#8b5cf6') resolvedDark = '#6d28d9';
  }

  document.documentElement.style.setProperty('--primary-dark', resolvedDark);
}

// 1. GİRİŞ İŞLEMİ
const AUTH_EMAIL = "denizmazlumoglu@gmail.com";

async function login() {
  const password = loginPassword ? loginPassword.value : "";

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  try {
    const { error } = await client.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: password
    });

    if (error) {
      alert("Giriş Başarısız: Şifre hatalı veya kullanıcı bulunamadı.");
      return;
    }

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

function logout() {
  if (confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
    client.auth.signOut();
    if (appShell) appShell.style.display = "none";
    if (loginScreen) loginScreen.style.display = "flex";
    if (loginPassword) loginPassword.value = "";
  }
}

// 2. SAYFA GEÇİŞLERİ
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

  const navBtns = document.querySelectorAll(".main-nav button");
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

  if (pageName === "tables") {
    renderTables();
    loadCashStatus();
    renderSales();
    loadIngredientsForDashboard();
  } else if (pageName === "products") {
    loadManagementProducts();
  } else if (pageName === "ingredients") {
    loadIngredients();
    initLogDates();
    loadStockMovements();
  } else if (pageName === "reports") {
    initReportDates();
    fetchAndRenderReports();
  } else if (pageName === "settings") {
    loadPaymentMethods();
    mountPasswordSettings();
  } else if (pageName === "internet") {
    loadInternetOrders();
    initRealtimeOrders();
  }
}

function setupNavigation() {
  const allNavButtons = document.querySelectorAll("header nav button");
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

// 3. MASA YÖNETİMİ
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = `table-card ${table.status || 'closed'}`;
    
    button.innerHTML = `
      <div class="table-number">${escapeHtml(table.name)}</div>
      ${table.status === "open" ? `<div class="table-total">${formatMoney(table.total)}</div>` : ""}
    `;
    
    button.onclick = () => openTableModal(table.id);
    grid.appendChild(button);
  });
}

function addNewTable() {
  const tables = getTables();
  const nextNum = tables.length + 1;
  const newTable = { id: Date.now(), name: `Masa ${String(nextNum).padStart(2, "0")}`, status: "closed", orders: [], total: 0 };
  tables.push(newTable);
  saveTables(tables);
  renderTables();
}

function renameTable() {
  if (!selectedTableId) return;
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;

  const newName = prompt("Yeni Masa İsmini Giriniz:", table.name);
  if (newName && newName.trim() !== "") {
    table.name = newName.trim();
    saveTables(tables);
    document.getElementById("modalTableName").textContent = table.name;
    renderTables();
  }
}

function deleteTable() {
  if (!selectedTableId) return;
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;

  if (table.orders && table.orders.length > 0) {
    alert("İçinde açık sipariş olan masayı silemezsiniz! Önce masayı boşaltın.");
    return;
  }

  if (confirm(`'${table.name}' masasını tamamen silmek istediğinize emin misiniz?`)) {
    const updated = tables.filter(t => t.id !== selectedTableId);
    saveTables(updated);
    closeTableModal();
    renderTables();
  }
}

// 4. KASA DURUMU
async function loadCashStatus() {
  const cashStatus = document.getElementById("cashStatus");
  const openPanel = document.getElementById("openCashPanel");
  const closePanel = document.getElementById("closeCashPanel");

  if (!cashStatus) return;

  try {
    const { data, error } = await client.from("cash_sessions").select("*").eq("status", "open").order("id", { ascending: false }).limit(1);
    if (error) throw error;
    currentCashSession = data && data.length > 0 ? data[0] : null;

    if (currentCashSession) {
      cashStatus.className = "cash-status cash-open";
      cashStatus.innerHTML = `
        <div class="cash-status-title">KASA AÇIK</div>
        <div class="cash-detail">Açılış Nakdi: <strong>${formatMoney(currentCashSession.opening_amount)}</strong></div>
      `;
      if (openPanel) openPanel.style.display = "none";
      if (closePanel) closePanel.style.display = "block";
    } else {
      cashStatus.className = "cash-status cash-closed";
      cashStatus.innerHTML = `
        <div class="cash-status-title">KASA KAPALI</div>
        <div class="cash-detail">Satış yapmadan önce kasayı açınız.</div>
      `;
      if (openPanel) openPanel.style.display = "block";
      if (closePanel) closePanel.style.display = "none";
    }
  } catch (err) {
    cashStatus.textContent = "Kasa durumu kontrol edilemedi.";
  }
}

// 5. MASA SİPARİŞ MODALI
async function openTableModal(tableId) {
  if (!currentCashSession) {
    alert("⚠️ Kasa kapalı! Satış yapabilmek veya masa açabilmek için lütfen önce KASAYI AÇINIZ.");
    return;
  }

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
  
  if (tableModal) tableModal.style.display = "flex";
}

function closeTableModal() {
  const tableModal = document.getElementById("tableModal");
  if (tableModal) tableModal.style.display = "none";
  renderTables();
}

function clearCurrentTable() {
  if (!selectedTableId) return;
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  const tableName = table ? table.name : "Seçili masa";

  if (confirm(`${tableName} masasındaki tüm siparişleri silmek ve masayı boşaltmak istediğinize emin misiniz?`)) {
    if (table) {
      table.status = "closed";
      table.openedAt = null;
      table.total = 0;
      table.orders = [];
      saveTables(tables);
    }
    closeTableModal();
    renderTables();
  }
}

// 6. ÜRÜNLER (SATIŞ KATALOĞU)
async function loadProducts() {
  try {
    const { data, error } = await client.from("products").select("*").eq("active", true).order("name", { ascending: true });
    if (error) throw error;
    saleProducts = data || [];
    renderCategories();
    renderSaleProducts();
  } catch (err) {
    console.error("Ürün hatası:", err.message);
  }
}

function getProductEmoji(category) {
  const val = String(category || "").toLowerCase();
  if (val.includes("dondurma")) return "🍦";
  if (val.includes("içecek")) return "🥤";
  if (val.includes("kurabiye")) return "🍪";
  if (val.includes("brownie")) return "🍫";
  if (val.includes("ekler")) return "🧁";
  if (val.includes("profiterol")) return "🍰";
  return "🍽️";
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

  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  const filtered = saleProducts.filter(p => selectedCategory === "Tümü" || (p.category || "Diğer") === selectedCategory);
  
  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px;">Bu kategoride ürün bulunamadı.</div>';
    return;
  }

  filtered.forEach(product => {
    const orderItem = table?.orders?.find(o => o.productId === product.id);
    const quantity = orderItem ? orderItem.quantity : 0;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "sale-product-card";

    const imageHtml = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" onerror="this.parentElement.textContent='${getProductEmoji(product.category)}'">`
      : getProductEmoji(product.category);

    card.innerHTML = `
      <div class="quantity-badge ${quantity > 0 ? "show" : ""}">${quantity}</div>
      <div class="product-image-box">${imageHtml}</div>
      <div style="font-size:12px; font-weight:bold; margin-top:4px;">${escapeHtml(product.name)}</div>
      <div style="font-size:13px; color:var(--primary); font-weight:800; margin-top:2px;">${formatMoney(product.price)}</div>
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
  renderSaleProducts();
  renderTables();
}

function renderCart() {
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");

  if (!cartList || !table) return;
  cartList.innerHTML = "";

  if (!table.orders || table.orders.length === 0) {
    cartList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px 0;">Henüz ürün eklenmedi.</div>';
    if (cartTotal) cartTotal.textContent = formatMoney(0);
    return;
  }

  table.orders.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div>
        <div style="font-size:13px; font-weight:bold;">${escapeHtml(item.name)}</div>
        <div style="font-size:11px; color:var(--text-muted);">${formatMoney(item.price)} × ${item.quantity} = ${formatMoney(item.price * item.quantity)}</div>
      </div>
      <div class="cart-controls">
        <button class="qty-button qty-minus" type="button">−</button>
        <span style="font-size:13px; font-weight:bold;">${item.quantity}</span>
        <button class="qty-button qty-plus" type="button">+</button>
      </div>
    `;

    row.querySelector(".qty-minus").onclick = () => changeQty(item.productId, -1);
    row.querySelector(".qty-plus").onclick = () => changeQty(item.productId, 1);

    cartList.appendChild(row);
  });

  if (cartTotal) cartTotal.textContent = formatMoney(table.total);
}

function changeQty(productId, delta) {
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;

  let item = table.orders.find(o => o.productId === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    table.orders = table.orders.filter(o => o.productId !== productId);
  }

  table.total = table.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
  saveTables(tables);
  renderCart();
  renderSaleProducts();
  renderTables();
}

// 7. MALZEMELER VE ÜRETİM
async function loadIngredientsForDashboard() {
  try {
    const { data, error } = await client.from("ingredients").select("*").order("name", { ascending: true });
    if (!error && data) {
      allIngredients = data;
      populateProductionDropdown();
    }
  } catch (err) {
    console.error("Malzemeler yüklenemedi:", err.message);
  }
}

async function loadIngredients() {
  try {
    const { data, error } = await client.from("ingredients").select("*").order("name", { ascending: true });
    if (error) throw error;
    allIngredients = data || [];
    renderIngredientsTable(allIngredients);
    populateProductionDropdown();
  } catch (err) {
    alert("Malzemeler yüklenirken hata oluştu: " + err.message);
  }
}

function populateProductionDropdown() {
  const select = document.getElementById("prodInputIngSelect");
  if (!select) return;
  if (!allIngredients || allIngredients.length === 0) {
    select.innerHTML = '<option value="">Önce Malzeme Ekleyin</option>';
    return;
  }
  select.innerHTML = allIngredients.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit || 'gr'})</option>`).join("");
}

// 8. ÖDEME KANALLARI
async function loadPaymentMethods() {
  const defaultMethods = [
    { id: 1, name: "Nakit" },
    { id: 2, name: "Kredi Kartı" },
    { id: 3, name: "Yemeksepeti" },
    { id: 4, name: "Trendyol" },
    { id: 5, name: "Getir" },
    { id: 6, name: "KaptanNili.com" }
  ];

  try {
    const { data, error } = await client.from("payment_methods").select("*").eq("active", true).order("id", { ascending: true });
    if (error || !data || data.length === 0) {
      paymentMethods = defaultMethods;
    } else {
      paymentMethods = data;
    }
  } catch (err) {
    paymentMethods = defaultMethods;
  }
}

// 9. ÖDEME VE ADİSYON DETAY KAYIT
function openPaymentModal() {
  const table = getTables().find(t => t.id === selectedTableId);
  const paymentModal = document.getElementById("paymentModal");
  const paymentTitle = document.getElementById("paymentTotalTitle");
  const grid = document.getElementById("quickPaymentGrid");

  if (!table || !paymentModal || !grid) return;

  if (paymentTitle) {
    paymentTitle.innerHTML = `<strong>${escapeHtml(table.name)}</strong> • Ödenecek Tutar: <strong style="color:var(--primary); font-size:18px;">${formatMoney(table.total)}</strong>`;
  }

  if (!paymentMethods || paymentMethods.length === 0) {
    paymentMethods = [
      { id: 1, name: "Nakit" },
      { id: 2, name: "Kredi Kartı" },
      { id: 3, name: "Yemeksepeti" },
      { id: 4, name: "Trendyol" },
      { id: 5, name: "Getir" },
      { id: 6, name: "KaptanNili.com" }
    ];
  }

  grid.innerHTML = paymentMethods.map(m => `
    <button type="button" class="btn-pay-channel-large" onclick="completePaymentWithChannel('${escapeHtml(m.name)}')">
      💳 ${escapeHtml(m.name)}
    </button>
  `).join("");

  paymentModal.style.display = "flex";
}

async function completePaymentWithChannel(channelName) {
  const tables = getTables();
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;

  try {
    const { data: sale, error: saleErr } = await client
      .from("sales")
      .insert({ total_amount: Number(table.total), payment_type: channelName })
      .select("id")
      .single();

    if (saleErr) throw saleErr;

    if (table.orders && table.orders.length > 0) {
      const saleItems = table.orders.map(item => ({
        sale_id: sale.id,
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        line_total: Number(item.quantity) * Number(item.price)
      }));

      await client.from("sale_items").insert(saleItems);
    }

    try {
      await deductStockFromRecipe(table.orders);
    } catch (stockErr) {
      console.log("Stok düşüşü uyarısı:", stockErr.message);
    }

    table.status = "closed";
    table.openedAt = null;
    table.total = 0;
    table.orders = [];
    saveTables(tables);

    const paymentModal = document.getElementById("paymentModal");
    if (paymentModal) paymentModal.style.display = "none";

    closeTableModal();
    renderTables();
    await renderSales();

    alert(`Satış [ ${channelName} ] başarıyla tamamlandı!`);
  } catch (err) {
    alert("Satış kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
  }
}

// 10. ANLIK SATIŞLAR VE BÜYÜTEÇ DETAY
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
      list.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Bugün henüz satış yapılmadı.</div>';
      if (totalElem) totalElem.textContent = formatMoney(0);
      return;
    }

    let sum = 0;
    list.innerHTML = sales.map(s => {
      sum += Number(s.total_amount || 0);
      const timeStr = new Date(s.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
      const safeChannel = escapeHtml(s.payment_type || "Nakit");
      
      return `
        <div class="daily-sales-row" onclick="openReceiptDetailModal(${s.id}, '${timeStr}', '${safeChannel}', ${s.total_amount})" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid var(--border-color); align-items: center;">
          <div><strong>${timeStr}</strong></div>
          <div><strong style="color:var(--primary);">${safeChannel}</strong></div>
          <div style="text-align:right;"><strong>${formatMoney(s.total_amount)} 🔍</strong></div>
        </div>
      `;
    }).join("");

    if (totalElem) totalElem.textContent = formatMoney(sum);
  } catch (err) {
    list.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Satışlar çekilemedi.</div>';
    if (totalElem) totalElem.textContent = formatMoney(0);
  }
}

async function openReceiptDetailModal(saleId, timeStr, paymentType, totalAmount) {
  const modal = document.getElementById("receiptDetailModal");
  const subtitle = document.getElementById("receiptSubtitle");
  const container = document.getElementById("receiptItemsContainer");
  const totalElem = document.getElementById("receiptTotalAmount");

  if (!modal || !container) return;

  if (subtitle) subtitle.textContent = `Saat: ${timeStr} • Kanal: ${paymentType}`;
  if (totalElem) totalElem.textContent = formatMoney(totalAmount);
  
  container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:12px;">Adisyon detayları yükleniyor...</div>';
  modal.style.display = "flex";

  try {
    const { data: items, error } = await client.from("sale_items").select("*").eq("sale_id", saleId);
    if (error) throw error;

    if (!items || items.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Bu adisyona ait detay bulunamadı.</div>';
      return;
    }

    const { data: productsData } = await client.from("products").select("id, name");
    const productMap = {};
    if (productsData) {
      productsData.forEach(p => { productMap[p.id] = p.name; });
    }

    const cachedNames = getInternetSaleProductNames(saleId);
    container.innerHTML = items.map((item, itemIndex) => {
      const savedName = String(item.product_name || item.name || item.title || item.urun_adi || item.description || "").trim();
      const cachedName = String(cachedNames[itemIndex] || "").trim();
      const mappedName = (productMap[item.product_id] || "").trim();
      // İnternet siparişindeki gerçek ad önceliklidir. product_id=1 gibi yedek
      // kimliklerin "Ürün" adını ezmesine izin verme.
      const prodName = cachedName || ((savedName && normalizeProductName(savedName) !== "urun") ? savedName : "") || mappedName || "Ürün";
      const lineTotal = Number(item.line_total || (item.quantity * item.unit_price) || 0);
      return `
        <div class="receipt-detail-row" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <div>
            <strong>${escapeHtml(prodName)}</strong><br>
            <span style="font-size:11px; color:var(--text-muted);">${item.quantity} Adet × ${formatMoney(item.unit_price)}</span>
          </div>
          <div style="font-weight:bold; color:var(--primary); align-self:center;">
            ${formatMoney(lineTotal)}
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = '<div style="text-align:center; padding:15px; color:#dc2626; font-size:12px;">Adisyon içeriği çekilemedi.</div>';
  }
}

// 11. REÇETEDEN STOK DÜŞME
async function deductStockFromRecipe(orders) {
  try {
    for (const item of orders) {
      const { data: recipeItems } = await client
        .from("recipes")
        .select("ingredient_id, quantity_required, quantity")
        .eq("product_id", item.productId);

      if (!recipeItems) continue;

      for (const r of recipeItems) {
        const qtyPerItem = Number(r.quantity_required || r.quantity || 0);
        const totalDeduct = qtyPerItem * Number(item.quantity);

        const { data: ingData } = await client
          .from("ingredients")
          .select("stock_quantity")
          .eq("id", r.ingredient_id)
          .single();

        if (ingData) {
          const currentStock = ingData.stock_quantity ?? 0;
          const newStock = Math.max(0, Number(currentStock) - totalDeduct);
          await client.from("ingredients").update({ stock_quantity: newStock }).eq("id", r.ingredient_id);
        }
      }
    }
  } catch (err) {
    console.error("Stok düşüş hatası:", err.message);
  }
}

// 12. ÜRÜN YÖNETİMİ VE YENİ ÜRÜN KAYDETME
async function loadManagementProducts() {
  const tbody = document.getElementById("managementProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Ürünler yükleniyor...</td></tr>';

  try {
    const { data, error } = await client.from("products").select("*").order("name", { ascending: true });
    if (error) throw error;
    
    window.kaptanManagementList = data || [];
    await loadRecipeProductIds();
    renderManagementProductsTable(window.kaptanManagementList);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#dc2626; padding:20px;">Ürünler yüklenemedi.</td></tr>';
  }
}

// Reçetesi olan ürün id'lerini tut (yeşil / mor buton rengi için)
window.kaptanRecipeProductIds = window.kaptanRecipeProductIds || new Set();

async function loadRecipeProductIds() {
  try {
    const { data, error } = await client.from("recipes").select("product_id");
    if (error) throw error;
    window.kaptanRecipeProductIds = new Set((data || []).map(r => Number(r.product_id)));
  } catch (err) {
    console.log("Reçete durumu okunamadı:", err.message);
  }
}

function hasRecipe(productId) {
  return window.kaptanRecipeProductIds && window.kaptanRecipeProductIds.has(Number(productId));
}

async function refreshRecipeBadges() {
  await loadRecipeProductIds();
  if (window.kaptanManagementList) renderManagementProductsTable(window.kaptanManagementList);
}

function renderManagementProductsTable(products) {
  const tbody = document.getElementById("managementProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Kayıtlı ürün bulunamadı.</td></tr>';
    return;
  }

  products.forEach(p => {
    const tr = document.createElement("tr");
    const imageHtml = p.image_url ? `<img src="${escapeHtml(p.image_url)}" style="width:30px;height:30px;object-fit:contain;">` : "🍰";
    
    tr.innerHTML = `
      <td>${imageHtml}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category || "Genel")}</td>
      <td><strong style="color:var(--primary);">${formatMoney(p.price)}</strong></td>
      <td>${p.active !== false ? '<span class="badge-active">Aktif</span>' : '<span class="badge-passive">Pasif</span>'}</td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editManagementProduct(${p.id})">Düzenle</button>
        <button type="button" class="btn-recipe" title="${hasRecipe(p.id) ? 'Reçete girilmiş' : 'Reçete girilmemiş'}" style="background:${hasRecipe(p.id) ? '#16a34a' : '#7c3aed'};color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;" onclick="openRecipeModal(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Reçete</button>
        <button type="button" class="btn-toggle" onclick="toggleProductStatus(${p.id}, ${p.active !== false})">${p.active !== false ? 'Pasif Yap' : 'Aktif Yap'}</button>
        <button type="button" class="btn-prod-delete" onclick="deleteProduct(${p.id})" style="background:#dc2626;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-left:4px;">Sil</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleNewProductSubmit() {
  const nameInput = document.getElementById("prodNameInput");
  const categorySelect = document.getElementById("prodCategorySelect");
  const priceInput = document.getElementById("prodPriceInput");
  const imageInput = document.getElementById("prodImageInput");
  const editIdInput = document.getElementById("editProductId");

  const nameVal = nameInput ? nameInput.value.trim() : "";
  const catVal = categorySelect ? categorySelect.value : "Profiterol";
  const priceVal = priceInput ? parseFloat(priceInput.value) : 0;
  const imageVal = imageInput ? imageInput.value.trim() : "";
  const editId = editIdInput ? editIdInput.value : "";

  if (!nameVal) {
    alert("Lütfen ürün adı giriniz.");
    if (nameInput) nameInput.focus();
    return;
  }
  if (isNaN(priceVal) || priceVal < 0) {
    alert("Lütfen geçerli bir satış fiyatı giriniz.");
    if (priceInput) priceInput.focus();
    return;
  }

  try {
    if (!editId) {
      const { data: existing, error: checkErr } = await client
        .from("products")
        .select("id, name")
        .ilike("name", nameVal);

      if (checkErr) throw checkErr;

      if (existing && existing.length > 0) {
        alert(`⚠️ Kayıt Yapılamadı: '${nameVal}' isminde bir ürün zaten sistemde kayıtlı!`);
        return;
      }

      const { error: insertErr } = await client.from("products").insert({
        name: nameVal,
        category: catVal,
        price: priceVal,
        image_url: imageVal,
        active: true
      });

      if (insertErr) throw insertErr;
      alert(`✅ '${nameVal}' başarıyla eklendi!`);
    } else {
      const { error: updateErr } = await client.from("products").update({
        name: nameVal,
        category: catVal,
        price: priceVal,
        image_url: imageVal
      }).eq("id", editId);

      if (updateErr) throw updateErr;
      alert(`✅ Ürün başarıyla güncellendi!`);
      resetProductForm();
    }

    if (nameInput) nameInput.value = "";
    if (priceInput) priceInput.value = "";
    if (imageInput) imageInput.value = "";

    await loadManagementProducts();
    await loadProducts();

  } catch (err) {
    alert("İşlem başarısız: " + err.message);
  }
}

function editManagementProduct(id) {
  const list = window.kaptanManagementList || [];
  const product = list.find(p => p.id === id);
  if (!product) return;

  document.getElementById("editProductId").value = product.id;
  document.getElementById("prodNameInput").value = product.name;
  document.getElementById("prodCategorySelect").value = product.category || "Profiterol";
  document.getElementById("prodPriceInput").value = product.price;
  document.getElementById("prodImageInput").value = product.image_url || "";

  document.getElementById("productFormTitle").textContent = "Ürün Düzenle";
  document.getElementById("resetProductFormBtn").style.display = "inline-block";
}

function resetProductForm() {
  document.getElementById("editProductId").value = "";
  document.getElementById("prodNameInput").value = "";
  document.getElementById("prodPriceInput").value = "";
  document.getElementById("prodImageInput").value = "";
  document.getElementById("productFormTitle").textContent = "Yeni Ürün Ekle";
  document.getElementById("resetProductFormBtn").style.display = "none";
}

async function toggleProductStatus(id, currentStatus) {
  try {
    const { error } = await client.from("products").update({ active: !currentStatus }).eq("id", id);
    if (error) throw error;
    await loadManagementProducts();
    await loadProducts();
  } catch (err) {
    alert("Ürün durumu değiştirilemedi: " + err.message);
  }
}

function formatMoney(val) {
  return Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// GLOBAL EVENT DELEGATION
document.addEventListener("click", function(e) {
  const target = e.target;
  if (!target) return;

  if (target.id === "clearTableButton" || target.closest("#clearTableButton")) {
    e.preventDefault();
    clearCurrentTable();
    return;
  }

  if (target.id === "topClosePanelButton" || target.id === "cancelTableButton") {
    e.preventDefault();
    closeTableModal();
    return;
  }

  if (target.id === "addNewTableBtn") {
    e.preventDefault();
    addNewTable();
    return;
  }

  if (target.id === "renameTableBtn") {
    e.preventDefault();
    renameTable();
    return;
  }

  if (target.id === "deleteTableBtn") {
    e.preventDefault();
    deleteTable();
    return;
  }

  if (target.id === "closeReceiptDetailBtn") {
    e.preventDefault();
    document.getElementById("receiptDetailModal").style.display = "none";
    return;
  }

  if (target.id === "closeRecipeModalBtn" || target.closest("#closeRecipeModalBtn")) {
    e.preventDefault();
    const recipeModal = document.getElementById("recipeModal");
    if (recipeModal) recipeModal.style.display = "none";
    return;
  }

  if (target.id === "saveProductBtn") {
    e.preventDefault();
    handleNewProductSubmit();
    return;
  }

  if (target.id === "resetProductFormBtn") {
    e.preventDefault();
    resetProductForm();
    return;
  }
});

function bindEvents() {
  setupNavigation();

  const closeTableBtn = document.getElementById("closeTableButton");
  if (closeTableBtn) {
    closeTableBtn.onclick = () => {
      const table = getTables().find(t => t.id === selectedTableId);
      if (!table || !table.orders || table.orders.length === 0) {
        alert("Masayı kapatmadan önce en az bir ürün ekleyiniz.");
        return;
      }
      openPaymentModal();
    };
  }

  const cancelPayBtn = document.getElementById("cancelPaymentButton");
  if (cancelPayBtn) {
    cancelPayBtn.onclick = () => {
      const paymentModal = document.getElementById("paymentModal");
      if (paymentModal) paymentModal.style.display = "none";
    };
  }

  const openCashBtn = document.getElementById("openCashButton");
  if (openCashBtn) {
    openCashBtn.onclick = async () => {
      const openingInput = document.getElementById("openingAmount");
      const amount = Number(openingInput?.value || 0);

      if (!openingInput || openingInput.value === "" || amount < 0) {
        alert("Lütfen geçerli bir açılış tutarı giriniz.");
        return;
      }

      try {
        await client.from("cash_sessions").insert({
          opening_amount: amount,
          status: "open",
          opened_at: new Date().toISOString()
        });
        openingInput.value = "";
        alert("Kasa başarıyla açıldı!");
        await loadCashStatus();
      } catch (err) {
        alert("Kasa açılamadı: " + err.message);
      }
    };
  }

  const closeCashBtn = document.getElementById("closeCashButton");
  if (closeCashBtn) {
    closeCashBtn.onclick = async () => {
      if (!currentCashSession) return;
      const closingInput = document.getElementById("closingAmount");
      const amount = Number(closingInput?.value || 0);

      if (!confirm("Kasayı kapatmak istediğinize emin misiniz?")) return;

      try {
        await client.from("cash_sessions").update({
          closing_amount: amount,
          closed_at: new Date().toISOString(),
          status: "closed"
        }).eq("id", currentCashSession.id);

        if (closingInput) closingInput.value = "";
        alert("Kasa başarıyla kapatıldı!");
        currentCashSession = null;
        await loadCashStatus();
      } catch (err) {
        alert("Kasa kapatılamadı: " + err.message);
      }
    };
  }
}

// İLK AÇILIŞ
document.addEventListener("DOMContentLoaded", () => {
  loadThemeColor();

  document.getElementById("netStartDate")?.addEventListener("change", clearInternetQuickFilterState);
  document.getElementById("netEndDate")?.addEventListener("change", clearInternetQuickFilterState);
  document.getElementById("netPaymentChannelFilter")?.addEventListener("change", loadInternetOrders);
});

if (loginButton) loginButton.addEventListener("click", login);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    e.key === "Enter" && login();
  });
}

// MALZEME VE REÇETE YÖNETİMİ
function renderIngredientsTable(ingredients) {
  const tbody = document.getElementById("ingredientsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!ingredients || ingredients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Kayıtlı malzeme bulunamadı.</td></tr>';
    return;
  }

  ingredients.forEach(ing => {
    const tr = document.createElement("tr");
    const currentStock = ing.stock_quantity ?? 0;
    const isCritical = Number(currentStock) <= 0;

    tr.innerHTML = `
      <td><strong>${escapeHtml(ing.name)}</strong></td>
      <td><strong style="font-size:15px; color:${isCritical ? '#dc2626' : 'var(--primary)'};">${currentStock}</strong></td>
      <td>${escapeHtml(ing.unit || 'gr')}</td>
      <td>${isCritical ? '<span class="badge-critical">⚠️ Kritik Stok</span>' : '<span class="badge-active">Normal</span>'}</td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editIngredient(${ing.id})">Düzenle</button>
        <button type="button" class="btn-toggle" onclick="adjustIngredientStock(${ing.id})">Stok Ekle/Düş</button>
        <button type="button" class="btn-ing-delete" onclick="deleteIngredient(${ing.id})" style="background:#dc2626;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-left:4px;">Sil</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function adjustIngredientStock(id) {
  const ing = allIngredients.find(i => i.id === id);
  if (!ing) return;

  const currentStock = ing.stock_quantity ?? 0;
  const amountStr = prompt(`'${ing.name}' için eklenecek (+) veya düşülecek (-) miktarı giriniz (Örn: 500 veya -250):`);
  if (!amountStr) return;

  const delta = parseFloat(amountStr);
  if (isNaN(delta)) {
    alert("Geçersiz miktar girdiniz.");
    return;
  }

  const newStock = Math.max(0, Number(currentStock) + delta);

  try {
    const { error: updateErr } = await client.from("ingredients").update({ stock_quantity: newStock }).eq("id", id);
    if (updateErr) throw updateErr;

    alert(`✅ Başarılı! '${ing.name}' stoğu güncellendi.`);
    await loadIngredients();
  } catch (err) {
    alert("Stok güncellenemedi: " + err.message);
  }
}

function editIngredient(id) {
  const ing = allIngredients.find(i => i.id === id);
  if (!ing) return;

  document.getElementById("editIngId").value = ing.id;
  document.getElementById("ingNameInput").value = ing.name;
  document.getElementById("ingUnitSelect").value = ing.unit || "gr";
  document.getElementById("ingStockInput").value = ing.stock_quantity ?? 0;

  document.getElementById("ingFormTitle").textContent = "Malzeme Düzenle";
  document.getElementById("resetIngFormBtn").style.display = "inline-block";
}

let selectedRecipeProductId = null;

async function openRecipeModal(productId, productName) {
  selectedRecipeProductId = productId;
  const modal = document.getElementById("recipeModal");
  const title = document.getElementById("recipeModalTitle");
  const select = document.getElementById("recipeIngSelect");

  if (!modal) return;

  if (title) title.textContent = `Reçete: ${productName}`;
  
  if (select) {
    if (!allIngredients || allIngredients.length === 0) {
      try {
        const { data } = await client.from("ingredients").select("*").order("name", { ascending: true });
        allIngredients = data || [];
      } catch (e) {}
    }
    select.innerHTML = allIngredients.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit || 'gr'})</option>`).join("");
  }

  modal.style.display = "flex";
  await loadRecipeItemsForProduct(productId);
}

async function loadRecipeItemsForProduct(productId) {
  const container = document.getElementById("recipeItemsList");
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted);">Reçete bileşenleri yükleniyor...</div>';

  try {
    const { data: recipeItems, error } = await client
      .from("recipes")
      .select("*")
      .eq("product_id", productId);

    if (error) throw error;

    if (!recipeItems || recipeItems.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:13px;">Bu ürün için henüz reçete bileşeni eklenmemiş.</div>';
      return;
    }

    container.innerHTML = recipeItems.map(r => {
      const ing = allIngredients.find(i => i.id === r.ingredient_id);
      const ingName = ing ? ing.name : "Malzeme #" + r.ingredient_id;
      const qty = r.quantity_required || r.quantity || 0;
      const unit = ing ? (ing.unit || 'gr') : 'gr';

      return `
        <div class="recipe-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <div><strong>${escapeHtml(ingName)}</strong>: <span style="color:var(--primary); font-weight:bold;">${qty} ${unit}</span></div>
          <button type="button" class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRecipeItem(${r.id}, ${productId})">Kaldır</button>
        </div>
      `;
    }).join("");

  } catch (err) {
    container.innerHTML = '<div style="text-align:center; padding:15px; color:#dc2626; font-size:13px;">Reçete yüklenemedi.</div>';
  }
}

async function addRecipeItem() {
  if (!selectedRecipeProductId) return;

  const select = document.getElementById("recipeIngSelect");
  const qtyInput = document.getElementById("recipeQtyInput");

  const ingId = select ? select.value : "";
  const qty = qtyInput ? parseFloat(qtyInput.value) : 0;

  if (!ingId || isNaN(qty) || qty <= 0) {
    alert("Lütfen geçerli bir malzeme seçin ve miktar girin.");
    return;
  }

  try {
    const { error } = await client.from("recipes").insert({
      product_id: selectedRecipeProductId,
      ingredient_id: Number(ingId),
      quantity_required: qty
    });

    if (error) throw error;

    if (qtyInput) qtyInput.value = "";
    await loadRecipeItemsForProduct(selectedRecipeProductId);
    await refreshRecipeBadges();
    alert("✅ Reçeteye malzeme eklendi!");

  } catch (err) {
    alert("Eklenemedi: " + err.message);
  }
}

async function deleteRecipeItem(recipeId, productId) {
  if (!confirm("Bu malzemeyi reçeteden kaldırmak istediğinize emin misiniz?")) return;

  try {
    const { error } = await client.from("recipes").delete().eq("id", recipeId);
    if (error) throw error;
    await loadRecipeItemsForProduct(productId);
    await refreshRecipeBadges();
  } catch (err) {
    alert("Kaldırılamadı: " + err.message);
  }
}

// RAPORLAR TARİH FİLTRELERİ
function setReportDateRange(type) {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  const now = new Date();
  
  const todayStr = now.toISOString().split("T")[0];
  endInput.value = todayStr;

  ['reportFilterTodayBtn', 'reportFilterWeekBtn', 'reportFilterMonthBtn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.remove("active-date-btn");
  });

  if (type === "today") {
    startInput.value = todayStr;
    const btn = document.getElementById("reportFilterTodayBtn");
    if (btn) btn.classList.add("active-date-btn");
  } else if (type === "week") {
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startInput.value = firstDay.toISOString().split("T")[0];
    const btn = document.getElementById("reportFilterWeekBtn");
    if (btn) btn.classList.add("active-date-btn");
  } else if (type === "month") {
    const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    startInput.value = firstDayStr;
    const btn = document.getElementById("reportFilterMonthBtn");
    if (btn) btn.classList.add("active-date-btn");
  }

  if (typeof fetchAndRenderReports === "function") {
    fetchAndRenderReports();
  }
}

function initReportDates() {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  const todayStr = new Date().toISOString().split("T")[0];

  if (startInput && !startInput.value) startInput.value = todayStr;
  if (endInput && !endInput.value) endInput.value = todayStr;

  const todayBtn = document.getElementById("reportFilterTodayBtn");
  if (todayBtn) todayBtn.classList.add("active-date-btn");
}

function switchReportTab(tabId) {
  const tabs = ['tabSummary', 'tabPayments', 'tabCategories', 'tabProducts'];
  tabs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === tabId) ? "block" : "none";
  });

  const buttons = document.querySelectorAll(".report-tab-strip button");
  buttons.forEach(btn => {
    btn.classList.remove("active-tab");
    if ((tabId === 'tabSummary' && btn.textContent.includes("Özet")) ||
        (tabId === 'tabPayments' && btn.textContent.includes("Ödeme")) ||
        (tabId === 'tabCategories' && btn.textContent.includes("Kategori")) ||
        (tabId === 'tabProducts' && btn.textContent.includes("Performans"))) {
      btn.classList.add("active-tab");
    }
  });

  if (tabId === 'tabPayments' || tabId === 'tabCategories' || tabId === 'tabProducts') {
    fetchAndRenderReports();
  }
}

async function fetchAndRenderReports() {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");

  const startDate = startInput ? startInput.value : new Date().toISOString().split('T')[0];
  const endDate = endInput ? endInput.value : new Date().toISOString().split('T')[0];

  try {
    const { data: sales, error: salesErr } = await client
      .from("sales")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    if (salesErr) throw salesErr;

    const saleIds = (sales || []).map(s => s.id);
    let saleItems = [];
    if (saleIds.length > 0) {
      const { data: items, error: itemsErr } = await client
        .from("sale_items")
        .select("*")
        .in("sale_id", saleIds);
      if (!itemsErr) saleItems = items || [];
    }

    const { data: productsData } = await client.from("products").select("id, name, category");
    const productMap = {};
    if (productsData) {
      productsData.forEach(p => { productMap[p.id] = p; });
    }

    let totalRevenue = 0;
    let totalSalesCount = (sales || []).length;
    let totalItemsSold = 0;

    const paymentMap = {};
    const categoryMap = {};
    const productSalesMap = {};

    (sales || []).forEach(s => {
      const amt = Number(s.total_amount || 0);
      totalRevenue += amt;
      const ch = s.payment_type || "Nakit";
      paymentMap[ch] = (paymentMap[ch] || { count: 0, total: 0 });
      paymentMap[ch].count += 1;
      paymentMap[ch].total += amt;
    });

    saleItems.forEach(item => {
      const qty = Number(item.quantity || 0);
      const lineTot = Number(item.line_total || (qty * Number(item.unit_price || 0)) || 0);
      totalItemsSold += qty;

      const prod = productMap[item.product_id] || { name: "Bilinmeyen Ürün", category: "Diğer" };
      const cat = prod.category || "Diğer";
      categoryMap[cat] = (categoryMap[cat] || 0) + lineTot;

      if (!productSalesMap[item.product_id]) {
        productSalesMap[item.product_id] = { name: prod.name, category: cat, qty: 0, total: 0 };
      }
      productSalesMap[item.product_id].qty += qty;
      productSalesMap[item.product_id].total += lineTot;
    });

    document.getElementById("metricTotalRevenue").textContent = formatMoney(totalRevenue);
    document.getElementById("metricTotalSalesCount").textContent = totalSalesCount;
    document.getElementById("metricTotalItemsSold").textContent = totalItemsSold + " Adet";

    const paymentTbody = document.getElementById("paymentReportTbody");
    if (paymentTbody) {
      paymentTbody.innerHTML = Object.keys(paymentMap).length === 0 
        ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:15px;">Bu tarih aralığında satış bulunamadı.</td></tr>'
        : Object.keys(paymentMap).map(k => `
            <tr>
              <td><strong>${escapeHtml(k)}</strong></td>
              <td>${paymentMap[k].count}</td>
              <td style="text-align:right; font-weight:bold; color:var(--primary);">${formatMoney(paymentMap[k].total)}</td>
            </tr>
          `).join("");
    }

    const productTbody = document.getElementById("productReportTbody");
    const productArr = Object.values(productSalesMap).sort((a,b) => b.total - a.total);
    if (productTbody) {
      productTbody.innerHTML = productArr.length === 0
        ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">Satış detayı bulunamadı.</td></tr>'
        : productArr.map(p => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td>${escapeHtml(p.category)}</td>
              <td>${p.qty} Adet</td>
              <td style="text-align:right; font-weight:bold; color:var(--primary);">${formatMoney(p.total)}</td>
            </tr>
          `).join("");
    }

    renderCharts(paymentMap, categoryMap, productArr);

  } catch (err) {
    console.error("Raporlar yüklenirken hata:", err.message);
  }
}

function renderCharts(paymentMap, categoryMap, productArr) {
  const payCtx = document.getElementById("paymentChart")?.getContext("2d");
  if (payCtx) {
    if (window.myPaymentChart) window.myPaymentChart.destroy();
    window.myPaymentChart = new Chart(payCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(paymentMap),
        datasets: [{
          data: Object.keys(paymentMap).map(k => paymentMap[k].total),
          backgroundColor: ['#2d5a27', '#0284c7', '#7c3aed', '#f59e0b', '#dc2626', '#10b981']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const catCtx = document.getElementById("categoryChart")?.getContext("2d");
  if (catCtx) {
    if (window.myCategoryChart) window.myCategoryChart.destroy();
    window.myCategoryChart = new Chart(catCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(categoryMap),
        datasets: [{
          label: 'Ciro (TL)',
          data: Object.keys(categoryMap).map(k => categoryMap[k]),
          backgroundColor: '#2d5a27'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const prodCtx = document.getElementById("productChart")?.getContext("2d");
  if (prodCtx) {
    const top10 = productArr.slice(0, 10);
    if (window.myProductChart) window.myProductChart.destroy();
    window.myProductChart = new Chart(prodCtx, {
      type: 'bar',
      data: {
        labels: top10.map(p => p.name),
        datasets: [{
          label: 'Ürün Cirosu (TL)',
          data: top10.map(p => p.total),
          backgroundColor: '#0284c7'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

document.addEventListener("click", function(e) {
  const target = e.target;
  if (!target) return;
  if (target.id === "runReportBtn") {
    e.preventDefault();
    fetchAndRenderReports();
  }
});

// ÖDEME KANALLARI YÖNETİMİ
async function loadPaymentMethods() {
  const defaultMethods = [{ id: 1, name: "Nakit" }, { id: 2, name: "Kredi Kartı" }, { id: 3, name: "Yemeksepeti" }, { id: 4, name: "Trendyol" }, { id: 5, name: "Getir" }, { id: 6, name: "KaptanNili.com" }];
  try {
    const { data } = await client.from("payment_methods").select("*").order("id", { ascending: true });
    paymentMethods = (data && data.length > 0) ? data : defaultMethods;
  } catch (e) { paymentMethods = defaultMethods; }
  renderPaymentMethodsList();
}

function renderPaymentMethodsList() {
  const container = document.getElementById("paymentMethodsList");
  if (!container) return;
  container.innerHTML = paymentMethods.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-color); font-size:13px;">
      <span><strong>${escapeHtml(m.name)}</strong></span>
      <button type="button" style="background:#dc2626; color:white; border:none; padding:4px 10px; border-radius:6px; cursor:pointer;" onclick="deletePaymentMethod(${m.id})">Sil</button>
    </div>`).join("");
}

async function addPaymentMethod() {
  const input = document.getElementById("newPaymentMethodInput");
  const name = input ? input.value.trim() : "";
  if (!name) return;
  try {
    await client.from("payment_methods").insert({ name: name, active: true });
    if (input) input.value = "";
    await loadPaymentMethods();
  } catch (e) {}
}

async function deletePaymentMethod(id) {
  if (!confirm("Silinsin mi?")) return;
  try {
    await client.from("payment_methods").delete().eq("id", id);
    await loadPaymentMethods();
  } catch (e) {}
}

// ==========================================
// KESİNTİSİZ SÜREKLİ ZİL VE ÖZEL UYARI MODALI
// ==========================================
let activeAlertInterval = null;

function initRealtimeOrders() {
  if (realtimeOrdersChannel) return;

  realtimeOrdersChannel = client
    .channel("public:orders")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, payload => {
      console.log("Yeni internet siparişi geldi!", payload.new);
      loadInternetOrders();

      // 1. Zili çalmaya başla
      if (activeAlertInterval) clearInterval(activeAlertInterval);
      playOrderAlert();
      activeAlertInterval = setInterval(() => {
        playOrderAlert();
      }, 3000); // Her 3 saniyede bir sen "Tamam" diyene kadar tekrar çalar

      // 2. Tarayıcının bloklayıcı alert'i yerine kendi özel modalımızı açalım ki ses susmasın
      showOrderAlertModal();
    })
    .subscribe();
}

function showOrderAlertModal() {
  let modal = document.getElementById("customOrderAlertModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "customOrderAlertModal";
    modal.className = "modal-overlay";
    modal.style.zIndex = "999999";
    modal.innerHTML = `
      <div class="recipe-modal-card" style="width: 400px; text-align: center; padding: 30px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
        <h3 style="color: var(--primary); margin-bottom: 15px; font-size: 20px;">YENİ İNTERNET SİPARİŞİ GELDİ!</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 25px;">Sipariş panelinize düştü. Susturmak için aşağıdaki butona basın.</p>
        <button type="button" class="btn-primary" id="stopAlertBtn" style="width: 100%; padding: 14px; font-size: 16px; background: #dc2626;">TAMAM / SESİ SUSTUR</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = "flex";

  // Kullanıcı Tamam'a basınca zili sustur ve modalı kapat
  document.getElementById("stopAlertBtn").onclick = function() {
    if (activeAlertInterval) {
      clearInterval(activeAlertInterval);
      activeAlertInterval = null;
    }
    // Ses elementini de durdur
    const audio = document.getElementById('orderAlertSound');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    modal.style.display = "none";
  };
}


// Sadece AYNI GÜN içindeki siparişler iptal edilebilir
function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function canCancelInternetOrder(order) {
  if (!order || !order.created_at) return false;
  const created = new Date(order.created_at);
  if (Number.isNaN(created.getTime())) return false;
  return isSameLocalDay(created, new Date());
}

async function quickCancelInternetOrder(orderId, orderNo, createdAt) {
  if (!canCancelInternetOrder({ created_at: createdAt })) {
    alert("Bu sipariş bugüne ait değil. Sadece aynı gün içindeki siparişler iptal edilebilir.");
    return;
  }
  if (!confirm(`Sipariş #${orderNo} iptal edilsin mi?`)) return;

  try {
    const { data: existing, error: fetchError } = await client.from("orders").select("created_at").eq("id", orderId).single();
    if (fetchError) throw fetchError;
    if (!canCancelInternetOrder(existing)) {
      alert("Bu sipariş bugüne ait değil. Sadece aynı gün içindeki siparişler iptal edilebilir.");
      return;
    }
    const { error } = await client.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) throw error;
    await loadInternetOrders();
  } catch (err) {
    alert("Sipariş iptal edilemedi: " + (err?.message || "Bilinmeyen hata"));
  }
}

// İNTERNET SİPARİŞ ÜRÜNLERİ: AD ÇÖZÜMLEME VE EŞLEŞTİRME
function normalizeProductName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ");
}

function getInternetProductName(p, seen = new Set()) {
  if (p == null) return "";
  if (typeof p === "string") return p.trim();
  if (typeof p !== "object" || seen.has(p)) return "";
  seen.add(p);

  const isRealName = value => {
    const text = String(value || "").trim();
    return text && !["ürün", "urun", "product", "item"].includes(normalizeProductName(text));
  };
  const directKeys = [
    "product_name", "productName", "urun_adi", "urunAdi", "ürün_adı",
    "item_name", "itemName", "menu_name", "menuName", "name", "title",
    "label", "description", "aciklama", "urun", "ürün"
  ];
  for (const k of directKeys) {
    if (typeof p[k] === "string" && isRealName(p[k])) return p[k].trim();
  }

  // Site verisi hangi seviyede gelirse gelsin tüm iç içe nesne/dizileri tara.
  for (const value of Object.values(p)) {
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const nested = getInternetProductName(entry, seen);
          if (nested) return nested;
        }
      } else {
        const nested = getInternetProductName(value, seen);
        if (nested) return nested;
      }
    }
  }
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "string" && isRealName(v) && /(name|title|ad|isim|urun|ürün|product|item)/i.test(k)) return v.trim();
  }
  return "";
}

const INTERNET_SALE_NAMES_KEY = "knpos_internet_sale_product_names_v1";

function getInternetSaleProductNames(saleId) {
  try {
    const all = JSON.parse(localStorage.getItem(INTERNET_SALE_NAMES_KEY) || "{}");
    return Array.isArray(all[String(saleId)]) ? all[String(saleId)] : [];
  } catch (e) {
    return [];
  }
}

function saveInternetSaleProductNames(saleId, saleItems) {
  try {
    const all = JSON.parse(localStorage.getItem(INTERNET_SALE_NAMES_KEY) || "{}");
    all[String(saleId)] = saleItems.map(item => String(item.product_name || "Ürün").trim());
    localStorage.setItem(INTERNET_SALE_NAMES_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("İnternet siparişi ürün adları yerel olarak saklanamadı.");
  }
}

function getInternetProductQty(p) {
  const q = Number(p?.qty ?? p?.quantity ?? p?.adet ?? 1);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

function getInternetProductPrice(p) {
  const val = Number(p?.price ?? p?.unit_price ?? p?.fiyat ?? 0);
  return Number.isFinite(val) ? val : 0;
}

function parseInternetProducts(order) {
  let prods = order?.products ?? order?.items ?? order?.order_items;
  if (typeof prods === "string") {
    try { prods = JSON.parse(prods); } catch (e) { prods = []; }
  }
  return Array.isArray(prods) ? prods : [];
}

// Sipariş ürün adlarını ürün kartlarıyla eşleştirip doğru product_id bulur
async function buildSaleItemsFromInternetOrder(prods, saleId, fallbackTotal) {
  const { data: productsData } = await client.from("products").select("id, name, price");
  const byName = {};
  (productsData || []).forEach(p => { byName[normalizeProductName(p.name)] = p; });

  return prods.map(p => {
    const name = getInternetProductName(p);
    const match = byName[normalizeProductName(name)] || null;
    const qty = getInternetProductQty(p);
    const price = getInternetProductPrice(p) || Number(match?.price || 0) || Number(fallbackTotal || 0) / Math.max(prods.length, 1) / qty;
    return {
      sale_id: saleId,
      product_id: match ? Number(match.id) : null,
      product_name: name || (match ? match.name : "") || "Ürün",
      quantity: qty,
      unit_price: Number(price.toFixed ? price.toFixed(2) : price),
      line_total: Number((qty * price).toFixed(2))
    };
  });
}

// sale_items'a ürün adını kaydeder; kolon adı farklıysa sırayla dener
async function insertSaleItemsSafe(saleItems) {
  if (!saleItems || saleItems.length === 0) return;

  const nameColumns = ["product_name", "name", "title", "urun_adi", "description"];
  for (const col of nameColumns) {
    const rows = saleItems.map(({ product_name, ...rest }) => {
      const row = { ...rest };
      if (row.product_id == null) delete row.product_id;
      row[col] = product_name;
      return row;
    });
    const { error } = await client.from("sale_items").insert(rows);
    if (!error) return;
    // kolon yoksa sıradakini dene, başka hata ise dur
    if (!/column|schema cache|does not exist/i.test(error.message || "")) {
      // product_id zorunlu olabilir: eşleşen id yoksa 1'e düşür
      const retry = rows.map(r => ({ ...r, product_id: r.product_id == null ? 1 : r.product_id }));
      const { error: e2 } = await client.from("sale_items").insert(retry);
      if (!e2) return;
      throw e2;
    }
  }

  // Hiçbir ad kolonu yoksa: en azından product_id ile kaydet
  const bare = saleItems.map(({ product_name, ...rest }) => ({
    ...rest,
    product_id: rest.product_id == null ? 1 : rest.product_id
  }));
  const { error: err3 } = await client.from("sale_items").insert(bare);
  if (err3) throw err3;
}

// TEK VE KUSURSUZ İNTERNET SİPARİŞ DETAY FONKSİYONU
function openInternetOrderDetail(order) {
  let modal = document.getElementById("internetOrderDetailModal");
  if (!modal) {
    const modalDiv = document.createElement("div");
    modalDiv.id = "internetOrderDetailModal";
    modalDiv.className = "modal-overlay";
    modalDiv.innerHTML = `
      <div class="recipe-modal-card" style="width: 550px; max-width: 95vw; text-align: left;">
        <h3 style="color:var(--primary); margin-bottom:10px; border-bottom:2px solid var(--border-color); padding-bottom:8px;">
          👤 <span id="detCustomerName">İsimsiz Müşteri</span> <span style="float:right; font-size:14px; color:var(--text-muted);" id="detOrderId">#103</span>
        </h3>
        <div id="detContentBody" style="font-size:13px; line-height:1.6; max-height:350px; overflow-y:auto; margin-bottom:15px;">
          <!-- Detaylar buraya dolacak -->
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-primary" style="background:#16a34a;" onclick="window.print()">🖨️ YAZDIR</button>
          <button type="button" class="btn-primary" style="background:#2563eb;" id="saveInternetOrderBtn">💾 Siparişi Kaydet (Satışa Ekle)</button>
          <button type="button" class="btn-danger" id="cancelInternetOrderBtn">❌ İptal Et</button>
          <button type="button" class="btn-secondary" onclick="document.getElementById('internetOrderDetailModal').style.display='none'">KAPAT</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    modal = modalDiv;
  }

  const custName = order.customer_name || order.name || "İsimsiz Müşteri";
  const orderIdText = order.order_id || order.id || "103";
  const phoneVal = order.phone || order.telefon || "-";
  const emailVal = order.email || "-";
  const addressVal = order.address || "-";
  const noteVal = order.order_notes || order.notes || "Not yok";
  const paymentVal = order.payment_channel || order.platform || "kaptannilicom";
  const totalVal = order.total_price || order.total_amount || 0;

  document.getElementById("detCustomerName").textContent = custName;
  document.getElementById("detOrderId").textContent = "#" + orderIdText;

  const orderProducts = parseInternetProducts(order);
  let productsHtml = orderProducts.length
    ? orderProducts.map(p => `• ${escapeHtml(getInternetProductName(p) || "Ürün")} (${getInternetProductQty(p)} Adet)`).join("<br>")
    : "• Ürün bilgisi yok";

  const contentBody = document.getElementById("detContentBody");
  contentBody.innerHTML = `
    <p><strong>🕒 Sipariş Zamanı:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('tr-TR') : '-'}</p>
    <p><strong>📞 Telefon:</strong> ${escapeHtml(phoneVal)}</p>
    <p><strong>📧 E-posta:</strong> ${escapeHtml(emailVal)}</p>
    <p><strong>📍 Adres:</strong> ${escapeHtml(addressVal)}</p>
    <p><strong>🛒 Ürünler:</strong><br><span style="color:var(--primary); font-weight:bold;">${productsHtml}</span></p>
    <p><strong>📝 Müşteri Notu:</strong> ${escapeHtml(noteVal)}</p>
    <p><strong>💳 Ödeme Yöntemi:</strong> ${escapeHtml(paymentVal)}</p>
    <p><strong>💰 Toplam Tutar:</strong> <span style="color:var(--primary); font-weight:bold; font-size:15px;">${formatMoney(totalVal)}</span></p>
  `;

  document.getElementById("saveInternetOrderBtn").onclick = async function() {
    if (!currentCashSession) {
      alert("⚠️ Kasa kapalı! İnternet siparişini onaylayıp ciroya eklemek için önce kasayı açmalısınız.");
      return;
    }

    if (confirm(`Sipariş #${orderIdText} onaylanıp günlük satışlara işlensin mi?`)) {
      try {
        const { data: sale, error: saleErr } = await client
          .from("sales")
          .insert({ total_amount: Number(totalVal), payment_type: paymentVal })
          .select("id")
          .single();

        if (saleErr) throw saleErr;

        const prods = parseInternetProducts(order);
        if (prods.length > 0) {
          const saleItems = await buildSaleItemsFromInternetOrder(prods, sale.id, totalVal);
          await insertSaleItemsSafe(saleItems);
          // Veritabanında ürün adı kolonu olmasa dahi adisyonda gerçek adı göster.
          saveInternetSaleProductNames(sale.id, saleItems);
        }

        await client.from("orders").update({ status: "completed" }).eq("id", order.id);

        alert("✅ Sipariş başarıyla günlük satışlara eklendi!");
        document.getElementById('internetOrderDetailModal').style.display = 'none';
        await renderSales();
        await loadInternetOrders();

      } catch (err) {
        alert("İşlem başarısız: " + err.message);
      }
    }
  };

  // Kuryeye gönder butonu (detay modalı)
  const cancelWrap = document.getElementById("cancelInternetOrderBtn")?.parentElement;
  if (cancelWrap && !document.getElementById("courierSendBtn")) {
    const cb = document.createElement("button");
    cb.type = "button";
    cb.id = "courierSendBtn";
    cb.style.cssText = "background:#25D366;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer";
    cb.textContent = "🛵 KURYEYE GÖNDER";
    cancelWrap.insertBefore(cb, cancelWrap.firstChild);
  }
  const courierBtnEl = document.getElementById("courierSendBtn");
  if (courierBtnEl) {
    courierBtnEl.style.display = (order.status === "cancelled") ? "none" : "";
    courierBtnEl.onclick = function () { sendOrderToCourier(order); };
  }

  const cancelBtnEl = document.getElementById("cancelInternetOrderBtn");
  const cancellable = canCancelInternetOrder(order);
  cancelBtnEl.style.display = cancellable ? "" : "none";
  cancelBtnEl.onclick = async function() {
    if (!canCancelInternetOrder(order)) {
      alert("Bu sipariş bugüne ait değil. Sadece aynı gün içindeki siparişler iptal edilebilir.");
      return;
    }
    if (confirm(`Sipariş #${orderIdText} iptal edilsin mi?`)) {
      await client.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      alert("❌ Sipariş iptal edildi.");
      document.getElementById('internetOrderDetailModal').style.display = 'none';
      await loadInternetOrders();
    }
  };

  modal.style.display = "flex";
}
// İNTERNET PANELİ: TARİH VE ÖDEME KANALI FİLTRELERİ
function formatLocalDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localDateBoundaryToIso(dateValue, nextDay = false) {
  if (!dateValue) return null;
  const parts = dateValue.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const boundary = new Date(parts[0], parts[1] - 1, parts[2] + (nextDay ? 1 : 0), 0, 0, 0, 0);
  return boundary.toISOString();
}

function normalizePaymentChannel(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "");
}

function getPaymentChannelKey(order) {
  const normalized = normalizePaymentChannel(
    order.payment_channel || order.platform || order.payment_method || order.payment_type
  );

  if (["kaptannilicom", "kaptannili", "online", "web", "website", "site"].includes(normalized)) {
    return "kaptannilicom";
  }
  if (["kapidaodeme", "kapidanakit", "nakit", "cash", "cod", "cashondelivery"].includes(normalized)) {
    return "kapida_odeme";
  }
  if (["kredikarti", "kart", "creditcard", "card", "onlineodeme", "iyzico"].includes(normalized)) {
    return "kredi_karti";
  }
  return normalized;
}

function setInternetFilter(type) {
  const startInput = document.getElementById("netStartDate");
  const endInput = document.getElementById("netEndDate");
  const btnToday = document.getElementById("btnNetToday");
  const btnMonth = document.getElementById("btnNetMonth");
  if (!startInput || !endInput) return;

  btnToday?.classList.toggle("active-date-btn", type === "today");
  btnMonth?.classList.toggle("active-date-btn", type === "thisMonth");

  const now = new Date();
  if (type === "today") {
    const today = formatLocalDate(now);
    startInput.value = today;
    endInput.value = today;
  } else if (type === "thisMonth") {
    startInput.value = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    endInput.value = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  } else {
    startInput.value = "";
    endInput.value = "";
  }

  loadInternetOrders();
}

function clearInternetQuickFilterState() {
  document.getElementById("btnNetToday")?.classList.remove("active-date-btn");
  document.getElementById("btnNetMonth")?.classList.remove("active-date-btn");
}

async function loadInternetOrders() {
  const tbody = document.getElementById("internetOrdersTbody");
  if (!tbody) return;

  const startValue = document.getElementById("netStartDate")?.value || "";
  const endValue = document.getElementById("netEndDate")?.value || "";
  const selectedChannel = document.getElementById("netPaymentChannelFilter")?.value || "";

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Siparişler yükleniyor...</td></tr>';

  try {
    let query = client.from("orders").select("*").order("created_at", { ascending: false });

    const startIso = localDateBoundaryToIso(startValue);
    const endExclusiveIso = localDateBoundaryToIso(endValue, true);
    if (startIso) query = query.gte("created_at", startIso);
    if (endExclusiveIso) query = query.lt("created_at", endExclusiveIso);

    const { data: orders, error } = await query;
    if (error) throw error;

    const filteredOrders = (orders || []).filter(order => {
      return !selectedChannel || getPaymentChannelKey(order) === selectedChannel;
    });

    if (filteredOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:20px;">Seçilen kriterlere uygun internet siparişi bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredOrders.map(order => {
      const timeStr = order.created_at
        ? new Date(order.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "Şimdi";
      const orderNo = escapeHtml(order.order_id || order.id);
      const totalFormatted = formatMoney(order.total_price || order.total_amount || 0);
      const rawChannel = order.payment_channel || order.platform || order.payment_method || order.payment_type || "Belirtilmemiş";
      const paymentChannel = escapeHtml(rawChannel);
      const orderStatus = order.status || "pending";

      let productsSummary = "Ürün bilgisi yok";
      try {
        let products = parseInternetProducts(order);
        if (Array.isArray(products) && products.length > 0) {
          productsSummary = products
            .map(product => `${escapeHtml(getInternetProductName(product) || "Ürün")} (${getInternetProductQty(product)} Adet)`)
            .join(", ");
        }
      } catch (_) {
        productsSummary = "Ürün detayları yüklenemedi";
      }

      const encodedOrder = encodeURIComponent(JSON.stringify(order));
      let actionButtons = `<button type="button" class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick="openInternetOrderDetail(JSON.parse(decodeURIComponent('${encodedOrder}')))">🔍 Detay</button>`;

      if (orderStatus !== "cancelled") {
        const sentBefore = typeof isCourierSent === "function" && isCourierSent(order.id || order.order_id);
        actionButtons += ` <button type="button" style="padding:6px 10px; font-size:12px; margin-left:6px; border:0; border-radius:6px; cursor:pointer; color:#fff; background:${sentBefore ? "#16a34a" : "#25D366"};" onclick="sendOrderToCourier('${encodedOrder}')">${sentBefore ? "✅ Kuryeye Gönderildi" : "🛵 Kuryeye Gönder"}</button>`;
      }

      if (orderStatus === "pending" || !order.status) {
        if (canCancelInternetOrder(order)) {
          actionButtons += ` <button type="button" class="btn-danger" style="padding:6px 10px; font-size:12px; margin-left:6px;" onclick="quickCancelInternetOrder('${escapeHtml(order.id)}', '${orderNo}', '${escapeHtml(order.created_at || "")}')">❌ İptal</button>`;
        } else {
          actionButtons += ' <span style="font-size:11px; color:#64748b; margin-left:6px;">İptal süresi doldu</span>';
        }
      } else if (orderStatus === "completed") {
        actionButtons += ' <span style="font-size:11px; color:#16a34a; font-weight:bold; margin-left:6px;">✓ Kaydedildi</span>';
      } else if (orderStatus === "cancelled") {
        actionButtons += ' <span style="font-size:11px; color:#dc2626; font-weight:bold; margin-left:6px;">✕ İptal Edildi</span>';
      }

      return `
        <tr>
          <td><strong>${timeStr}</strong></td>
          <td><strong>#${orderNo}</strong></td>
          <td>${productsSummary}</td>
          <td><strong style="color:var(--primary);">${totalFormatted}</strong></td>
          <td>${paymentChannel}</td>
          <td style="text-align:right; white-space:nowrap;">${actionButtons}</td>
        </tr>`;
    }).join("");
  } catch (err) {
    const message = escapeHtml(err?.message || "Bilinmeyen hata");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; padding:20px;">Siparişler yüklenemedi: ${message}</td></tr>`;
  }
}

function processInternetOrder(orderId) {
  alert(`Sipariş #${orderId} işleme alındı!`);
}

/* ============================================================
   v7 EK: MALZEME KAYDET / DÜZENLE / ARAMA (eksik olan bölüm)
   ============================================================ */

function resetIngForm() {
  const idEl = document.getElementById("editIngId");
  const nameEl = document.getElementById("ingNameInput");
  const unitEl = document.getElementById("ingUnitSelect");
  const stockEl = document.getElementById("ingStockInput");
  const titleEl = document.getElementById("ingFormTitle");
  const cancelBtn = document.getElementById("resetIngFormBtn");

  if (idEl) idEl.value = "";
  if (nameEl) nameEl.value = "";
  if (unitEl) unitEl.value = "gr";
  if (stockEl) stockEl.value = "";
  if (titleEl) titleEl.textContent = "Yeni Malzeme / Yarı Mamul Ekle";
  if (cancelBtn) cancelBtn.style.display = "none";
}

async function saveIngredient() {
  const btn = document.getElementById("saveIngBtn");
  const id = (document.getElementById("editIngId")?.value || "").trim();
  const name = (document.getElementById("ingNameInput")?.value || "").trim();
  const unit = document.getElementById("ingUnitSelect")?.value || "gr";
  const stockRaw = (document.getElementById("ingStockInput")?.value || "").trim();
  const stock = stockRaw === "" ? 0 : Number(stockRaw);

  if (!name) {
    alert("Malzeme adı boş olamaz.");
    document.getElementById("ingNameInput")?.focus();
    return;
  }
  if (isNaN(stock)) {
    alert("Stok miktarı sayı olmalı.");
    return;
  }
  if (!client) {
    alert("Veritabanı bağlantısı yok.");
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "KAYDEDİLİYOR..."; }

  try {
    if (id) {
      const { error } = await client
        .from("ingredients")
        .update({ name: name, unit: unit, stock_quantity: stock })
        .eq("id", Number(id));
      if (error) throw error;
    } else {
      // Aynı isimde malzeme varsa uyar
      const dup = (allIngredients || []).find(
        i => (i.name || "").trim().toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr")
      );
      if (dup && !confirm(`"${dup.name}" zaten var. Yine de yeni kayıt eklensin mi?`)) {
        if (btn) { btn.disabled = false; btn.textContent = "KAYDET"; }
        return;
      }
      const { error } = await client
        .from("ingredients")
        .insert([{ name: name, unit: unit, stock_quantity: stock }]);
      if (error) throw error;
    }

    resetIngForm();
    await loadIngredients();
    const s = document.getElementById("searchIngInput");
    if (s && s.value.trim()) filterIngredientsList();
  } catch (err) {
    alert("Malzeme kaydedilemedi: " + (err?.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "KAYDET"; }
  }
}

function ingSearchNormalize(v) {
  return (v || "")
    .toString()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function filterIngredientsList() {
  const q = ingSearchNormalize(document.getElementById("searchIngInput")?.value);
  const list = allIngredients || [];
  if (!q) {
    renderIngredientsTable(list);
    return;
  }
  const filtered = list.filter(i =>
    ingSearchNormalize(i.name).includes(q) ||
    ingSearchNormalize(i.unit).includes(q)
  );
  renderIngredientsTable(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveIngBtn")?.addEventListener("click", saveIngredient);
  document.getElementById("resetIngFormBtn")?.addEventListener("click", resetIngForm);

  const searchEl = document.getElementById("searchIngInput");
  if (searchEl) {
    searchEl.addEventListener("input", filterIngredientsList);
    searchEl.addEventListener("search", filterIngredientsList);
  }

  document.getElementById("ingNameInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveIngredient();
  });
  document.getElementById("ingStockInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveIngredient();
  });
});

// Liste her yüklendiğinde arama kutusundaki filtre korunsun
const __origLoadIngredients = typeof loadIngredients === "function" ? loadIngredients : null;
if (__origLoadIngredients) {
  window.loadIngredients = async function () {
    await __origLoadIngredients.apply(this, arguments);
    const s = document.getElementById("searchIngInput");
    if (s && s.value.trim()) filterIngredientsList();
  };
}

window.saveIngredient = saveIngredient;
window.resetIngForm = resetIngForm;
window.filterIngredientsList = filterIngredientsList;

/* ================= REÇETE DÜZELTME EKİ (v3.8) ================= */
/* Sorun: #addRecipeItemBtn (EKLE) hiçbir yere bağlı değildi ve
   reçete fonksiyonları window'a atanmadığı için inline onclick'ler
   ReferenceError veriyordu. Ayrıca exportRecipeExcel/importRecipeExcel yoktu. */

// 1) Reçete satırı ekleme: kolon adı farklıysa (quantity_required / quantity / amount) otomatik dene
async function addRecipeItemSafe() {
  if (!selectedRecipeProductId) {
    alert("Önce bir ürün seçin.");
    return;
  }
  const select = document.getElementById("recipeIngSelect");
  const qtyInput = document.getElementById("recipeQtyInput");
  const ingId = select ? select.value : "";
  const qty = qtyInput ? parseFloat(String(qtyInput.value).replace(",", ".")) : NaN;

  if (!ingId) { alert("Lütfen bir malzeme seçin."); return; }
  if (isNaN(qty) || qty <= 0) { alert("Lütfen geçerli bir miktar girin."); return; }

  const base = { product_id: Number(selectedRecipeProductId), ingredient_id: Number(ingId) };
  const qtyColumns = ["quantity_required", "quantity", "amount", "miktar"];
  let lastErr = null;

  for (const col of qtyColumns) {
    const { error } = await client.from("recipes").insert({ ...base, [col]: qty });
    if (!error) {
      if (qtyInput) qtyInput.value = "";
      await loadRecipeItemsForProduct(selectedRecipeProductId);
      await refreshRecipeBadges();
      return;
    }
    lastErr = error;
    // kolon yoksa sıradakini dene, başka hata ise dur
    if (!/column|schema cache|does not exist/i.test(error.message || "")) break;
  }
  alert("Reçeteye eklenemedi: " + (lastErr?.message || "bilinmeyen hata"));
}

// 2) Butonu bağla (delege + doğrudan) — modal sonradan açılsa da çalışır
document.addEventListener("click", function (e) {
  const btn = e.target.closest && e.target.closest("#addRecipeItemBtn");
  if (btn) {
    e.preventDefault();
    addRecipeItemSafe();
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && e.target && e.target.id === "recipeQtyInput") {
    e.preventDefault();
    addRecipeItemSafe();
  }
});

// 3) Reçete Excel indir / yükle
function exportRecipeExcel() {
  if (typeof XLSX === "undefined") { alert("Excel kütüphanesi yüklenemedi."); return; }
  if (!selectedRecipeProductId) { alert("Önce ürün reçetesini açın."); return; }
  client.from("recipes").select("*").eq("product_id", selectedRecipeProductId).then(({ data }) => {
    const rows = (data || []).map(r => {
      const ing = (allIngredients || []).find(i => i.id === r.ingredient_id);
      return {
        malzeme_id: r.ingredient_id,
        malzeme_adi: ing ? ing.name : "",
        miktar: r.quantity_required ?? r.quantity ?? 0,
        birim: ing ? (ing.unit || "gr") : "gr"
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ malzeme_id: "", malzeme_adi: "", miktar: "", birim: "" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recete");
    XLSX.writeFile(wb, "recete_" + selectedRecipeProductId + ".xlsx");
  });
}

async function importRecipeExcel(event) {
  if (typeof XLSX === "undefined") { alert("Excel kütüphanesi yüklenemedi."); return; }
  const file = event?.target?.files?.[0];
  if (!file || !selectedRecipeProductId) return;

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  const normName = (s) => String(s || "").toLocaleLowerCase("tr").replace(/\s+/g, "");
  let ok = 0, fail = 0;

  for (const row of rows) {
    const qty = parseFloat(String(row.miktar ?? row.quantity ?? "").replace(",", "."));
    let ingId = Number(row.malzeme_id || row.ingredient_id || 0);
    if (!ingId && row.malzeme_adi) {
      const found = (allIngredients || []).find(i => normName(i.name) === normName(row.malzeme_adi));
      if (found) ingId = found.id;
    }
    if (!ingId || isNaN(qty) || qty <= 0) { fail++; continue; }

    const { error } = await client.from("recipes").insert({
      product_id: Number(selectedRecipeProductId),
      ingredient_id: ingId,
      quantity_required: qty
    });
    error ? fail++ : ok++;
  }

  event.target.value = "";
  await loadRecipeItemsForProduct(selectedRecipeProductId);
  alert(`Excel yüklendi. Eklenen: ${ok}, atlanan: ${fail}`);
}

// 4) Inline onclick'ler için global erişim
window.openRecipeModal = openRecipeModal;
window.loadRecipeItemsForProduct = loadRecipeItemsForProduct;
window.addRecipeItem = addRecipeItemSafe;
window.addRecipeItemSafe = addRecipeItemSafe;
window.deleteRecipeItem = deleteRecipeItem;
window.exportRecipeExcel = exportRecipeExcel;
window.importRecipeExcel = importRecipeExcel;
window.editIngredient = editIngredient;

async function deleteIngredient(id) {
  const ing = (allIngredients || []).find(i => i.id === id);
  const name = ing ? ing.name : "Bu malzeme";
  if (!confirm(`'${name}' silinsin mi?\n\nBu malzeme reçetelerde kullanılıyorsa reçete satırları da silinecek. Bu işlem geri alınamaz.`)) return;

  try {
    // Önce reçetelerdeki bağlı satırları temizle (foreign key hatasını önler)
    try { await client.from("recipe_items").delete().eq("ingredient_id", id); } catch (e) { /* tablo yoksa geç */ }

    const { error } = await client.from("ingredients").delete().eq("id", id);
    if (error) throw error;

    // Düzenleme formunda bu malzeme açıksa formu sıfırla
    const editEl = document.getElementById("editIngId");
    if (editEl && String(editEl.value) === String(id) && typeof resetIngForm === "function") resetIngForm();

    alert(`✅ '${name}' silindi.`);
    await loadIngredients();
    if (typeof loadIngredientsForDashboard === "function") loadIngredientsForDashboard();
    if (selectedRecipeProductId && typeof loadRecipeItemsForProduct === "function") {
      loadRecipeItemsForProduct(selectedRecipeProductId);
    }
  } catch (err) {
    alert("Malzeme silinemedi: " + (err.message || err));
  }
}
window.deleteIngredient = deleteIngredient;

async function deleteProduct(id) {
  const list = (window.kaptanManagementList || saleProducts || []);
  const p = list.find(x => x.id === id);
  const name = p ? p.name : "Bu ürün";
  if (!confirm(`'${name}' silinsin mi?\n\nÜrünün reçetesi de silinecek. Bu işlem geri alınamaz.`)) return;

  try {
    try { await client.from("recipe_items").delete().eq("product_id", id); } catch (e) { /* tablo yoksa geç */ }

    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      // Geçmiş satışlara bağlıysa silinemez -> pasife al
      if (String(error.message || "").toLowerCase().includes("foreign key") || error.code === "23503") {
        const passivate = confirm(`'${name}' geçmiş satışlarda kullanıldığı için silinemiyor.\n\nBunun yerine PASİF yapılsın mı? (Satış ekranında görünmez)`);
        if (passivate) {
          const { error: upErr } = await client.from("products").update({ active: false }).eq("id", id);
          if (upErr) throw upErr;
          alert(`'${name}' pasif yapıldı.`);
          await loadProducts();
          if (typeof loadManagementProducts === "function") await loadManagementProducts();
        }
        return;
      }
      throw error;
    }

    const editEl = document.getElementById("editProductId");
    if (editEl && String(editEl.value) === String(id) && typeof resetProductForm === "function") resetProductForm();

    alert(`✅ '${name}' silindi.`);
    await loadProducts();
    if (typeof loadManagementProducts === "function") await loadManagementProducts();
  } catch (err) {
    alert("Ürün silinemedi: " + (err.message || err));
  }
}
window.deleteProduct = deleteProduct;


// Reçete renk durumu global erişim
window.loadRecipeProductIds = loadRecipeProductIds;
window.hasRecipe = hasRecipe;
window.refreshRecipeBadges = refreshRecipeBadges;

/* =========================================================
   ŞİFRE DEĞİŞTİRME (GENEL AYARLAR) - e-posta kodu YOK
   Mevcut şifre + yeni şifre ile doğrudan değiştirir.
   ========================================================= */
function mountPasswordSettings() {
  const page = document.getElementById("pageSettings");
  if (!page || document.getElementById("passwordSettingsCard")) return;

  const card = document.createElement("div");
  card.id = "passwordSettingsCard";
  card.style.cssText =
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-top:20px;max-width:520px;box-shadow:0 1px 3px rgba(0,0,0,.08)";
  card.innerHTML = `
    <h3 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827">Şifre Değiştir</h3>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280">Mevcut şifrenizi girerek yeni şifrenizi belirleyin.</p>

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Mevcut Şifre</label>
    <input id="pwCurrent" type="password" autocomplete="current-password"
      style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:12px">

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Yeni Şifre</label>
    <input id="pwNew" type="password" autocomplete="new-password"
      style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:4px">
    <div id="pwStrength" style="font-size:12px;color:#6b7280;margin-bottom:12px">En az 8 karakter, harf ve rakam içermeli.</div>

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Yeni Şifre (Tekrar)</label>
    <input id="pwRepeat" type="password" autocomplete="new-password"
      style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:12px">

    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;margin-bottom:16px">
      <input id="pwShow" type="checkbox"> Şifreleri göster
    </label>

    <button id="pwSaveBtn"
      style="width:100%;padding:12px;border:0;border-radius:8px;background:#111827;color:#fff;font-weight:700;cursor:pointer">
      ŞİFREYİ GÜNCELLE
    </button>
    <div id="pwMsg" style="margin-top:12px;font-size:13px"></div>
  `;
  page.appendChild(card);

  const $ = (id) => document.getElementById(id);
  const msg = (text, ok) => {
    const el = $("pwMsg");
    el.textContent = text;
    el.style.color = ok ? "#16a34a" : "#dc2626";
  };

  $("pwShow").addEventListener("change", (e) => {
    const t = e.target.checked ? "text" : "password";
    ["pwCurrent", "pwNew", "pwRepeat"].forEach((id) => ($(id).type = t));
  });

  $("pwNew").addEventListener("input", (e) => {
    const v = e.target.value;
    const el = $("pwStrength");
    if (!v) { el.textContent = "En az 8 karakter, harf ve rakam içermeli."; el.style.color = "#6b7280"; return; }
    const strong = v.length >= 12 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
    const ok = v.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(v) && /\d/.test(v);
    el.textContent = strong ? "Şifre gücü: Güçlü" : ok ? "Şifre gücü: Orta" : "Şifre gücü: Zayıf (en az 8 karakter, harf + rakam)";
    el.style.color = strong ? "#16a34a" : ok ? "#d97706" : "#dc2626";
  });

  $("pwSaveBtn").addEventListener("click", changeAppPassword);
}

async function changeAppPassword() {
  const btn = document.getElementById("pwSaveBtn");
  const cur = document.getElementById("pwCurrent").value.trim();
  const nw = document.getElementById("pwNew").value.trim();
  const rp = document.getElementById("pwRepeat").value.trim();
  const msgEl = document.getElementById("pwMsg");
  const say = (t, ok) => { msgEl.textContent = t; msgEl.style.color = ok ? "#16a34a" : "#dc2626"; };

  if (!cur || !nw || !rp) return say("Tüm alanları doldurun.", false);
  if (nw !== rp) return say("Yeni şifreler eşleşmiyor.", false);
  if (nw.length < 8 || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(nw) || !/\d/.test(nw))
    return say("Yeni şifre en az 8 karakter olmalı ve harf + rakam içermeli.", false);
  if (nw === cur) return say("Yeni şifre eskisiyle aynı olamaz.", false);

  btn.disabled = true;
  btn.textContent = "GÜNCELLENİYOR...";
  try {
    // 1) Mevcut şifreyi doğrula
    const { error: signErr } = await client.auth.signInWithPassword({
      email: typeof AUTH_EMAIL !== "undefined" ? AUTH_EMAIL : "denizmazlumoglu@gmail.com",
      password: cur
    });
    if (signErr) { say("Mevcut şifre hatalı.", false); return; }

    // 2) Yeni şifreyi kaydet
    const { error: updErr } = await client.auth.updateUser({ password: nw });
    if (updErr) { say("Şifre güncellenemedi: " + updErr.message, false); return; }

    document.getElementById("pwCurrent").value = "";
    document.getElementById("pwNew").value = "";
    document.getElementById("pwRepeat").value = "";
    say("Şifreniz başarıyla güncellendi. Bir sonraki girişte yeni şifrenizi kullanın.", true);
  } catch (e) {
    say("Hata: " + (e && e.message ? e.message : e), false);
  } finally {
    btn.disabled = false;
    btn.textContent = "ŞİFREYİ GÜNCELLE";
  }
}

window.mountPasswordSettings = mountPasswordSettings;
window.changeAppPassword = changeAppPassword;

/* =========================================================
   KURYEYE GÖNDER (WhatsApp) - v8
   İnternet siparişini AHK'daki mesaj formatıyla WhatsApp'a yollar.
   Test modunda Nilay'ın numarasına, canlı modda KURYEMİX grubuna.
   ========================================================= */

const COURIER_CFG_KEY = "knpos_courier_cfg";
const COURIER_SENT_KEY = "knpos_courier_sent";
const COURIER_DEFAULT_MAP =
  "https://yandex.com.tr/navi?whatshere%5Bzoom%5D=18&whatshere%5Bpoint%5D=29.075271,40.969051";

function getCourierCfg() {
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(COURIER_CFG_KEY) || "{}") || {}; } catch (_) { cfg = {}; }
  return {
    mode: "ahk",
    testPhone: cfg.testPhone || "",
    groupLink: cfg.groupLink || "",
    mapLink: cfg.mapLink || COURIER_DEFAULT_MAP,
    chatName: cfg.chatName || "",
    header: cfg.header || "KAPTAN NİLİ YENİ SİPARİŞ"
  };
}

function saveCourierCfg(cfg) {
  localStorage.setItem(COURIER_CFG_KEY, JSON.stringify(cfg));
}

function normalizePhoneForWa(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (d.length === 10) d = "90" + d;
  return d;
}

function getCourierSentMap() {
  try { return JSON.parse(localStorage.getItem(COURIER_SENT_KEY) || "{}") || {}; } catch (_) { return {}; }
}
function markCourierSent(orderId) {
  const m = getCourierSentMap();
  m[String(orderId)] = new Date().toISOString();
  localStorage.setItem(COURIER_SENT_KEY, JSON.stringify(m));
}
function isCourierSent(orderId) {
  return Boolean(getCourierSentMap()[String(orderId)]);
}

function courierOrderCode(order) {
  const d = order && order.created_at ? new Date(order.created_at) : new Date();
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  const p = n => String(n).padStart(2, "0");
  return "KN-" + p(t.getHours()) + p(t.getMinutes()) + p(t.getSeconds());
}

// Adresi harita aramasi icin temizler: tekrar eden il/ilce, gereksiz etiketler,
// telefon/posta kodu, noktalama yiginlari temizlenir.
function cleanAddressForMap(raw) {
  let a = String(raw || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\r\n\t]+/g, ", ")
    .replace(/\b(tel|telefon|gsm|cep|not|kapi ?kodu|kapı ?kodu|zil|kat|daire|blok|apt|apartman|site)\s*[:.]?\s*/gi, " ")
    .replace(/\+?\d[\d\s()-]{8,}\d/g, " ")   // telefon numaralari
    .replace(/\b\d{5}\b/g, " ")              // posta kodu
    .replace(/[|;]+/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // virgullu parcalara ayir, bosluklari ve tekrarlari at
  const seen = new Set();
  const parts = [];
  a.split(",").forEach(p => {
    const t = p.replace(/[^\wçğıöşüÇĞİÖŞÜ0-9\/. -]/g, " ").replace(/\s+/g, " ").trim();
    if (!t || t.length < 2) return;
    const key = t.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(t);
  });

  let out = parts.join(", ");
  if (out && !/t[üu]rkiye/i.test(out)) out += ", Türkiye";
  return out;
}

function courierMapLink() {
  const cfg = getCourierCfg();
  // Kurye önce işletmeye geleceği için müşteri adresini değil,
  // Genel Ayarlar'da kayıtlı sabit işletme konumunu gönder.
  return cfg.mapLink || COURIER_DEFAULT_MAP;
}

// AHK'daki mesajın birebir mantığı: başlık + konum + sipariş bilgisi
function buildCourierMessage(order) {
  const cfg = getCourierCfg();
  const code = courierOrderCode(order);
  const custName = order.customer_name || order.name || "İsimsiz Müşteri";
  const phoneVal = order.phone || order.telefon || "-";
  const addressVal = String(order.address || order.adres || "-").replace(/https?:\/\/\S+/g, "").trim() || "-";
  const noteVal = order.order_notes || order.notes || "";
  const paymentVal = order.payment_channel || order.platform || order.payment_method || order.payment_type || "-";
  const totalVal = order.total_price || order.total_amount || 0;
  const orderNo = order.order_id || order.id || "-";
  const timeStr = order.created_at ? new Date(order.created_at).toLocaleString("tr-TR") : new Date().toLocaleString("tr-TR");

  let lines = [];
  try {
    const prods = parseInternetProducts(order) || [];
    lines = prods.map(p => `- ${getInternetProductName(p) || "Ürün"} (${getInternetProductQty(p)} Adet)`);
  } catch (_) { lines = []; }
  if (!lines.length) lines = ["- Ürün bilgisi yok"];

  const parts = [];
  parts.push(`*** ${cfg.header} ${code} ***`);
  parts.push("");
  parts.push("Konum için tıklayınız:");
  parts.push(courierMapLink());
  parts.push("");
  parts.push(`Sipariş No: #${orderNo}`);
  parts.push(`Saat: ${timeStr}`);
  parts.push(`Müşteri: ${custName}`);
  parts.push(`Telefon: ${phoneVal}`);
  parts.push(`Adres: ${addressVal}`);
  parts.push("");
  parts.push("URUNLER:");
  parts.push(lines.join("\n"));
  parts.push("");
  if (noteVal) { parts.push(`Not: ${noteVal}`); }
  parts.push(`Ödeme: ${paymentVal}`);
  parts.push(`Toplam: ${typeof formatMoney === "function" ? formatMoney(totalVal) : totalVal + " TL"}`);
  return parts.join("\n");
}

async function copyCourierMessage(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e) { return false; }
  }
}

/* ---- AHK BOT KOPRUSU ----
   Mesaji Downloads klasorune knpos_kurye_*.txt olarak indirir.
   KNPOS-Kurye-Bot.ahk bu klasoru izler, dosyayi okur, WhatsApp Desktop'ta
   ilgili sohbeti acar, yapistirir ve Enter'a basar. Tam otomatik. */
function dropCourierFileForAhk(chatName, message, orderId) {
  const payload = "CHAT=" + (chatName || "") + "\n---\n" + message;
  const blob = new Blob(["\ufeff" + payload], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "knpos_kurye_" + (orderId || Date.now()) + "_" + Date.now() + ".txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function showCourierToast(text) {
  try {
    var t = document.createElement("div");
    t.textContent = text;
    t.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:99999;background:#111827;color:#fff;padding:12px 16px;border-radius:10px;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25)";
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 3500);
  } catch (_) {}
}
function closeInternetOrderDetailModal() {
  const m = document.getElementById("internetOrderDetailModal");
  if (m) m.style.display = "none";
}
async function returnToInternetOrders() {
  closeInternetOrderDetailModal();
  if (typeof showPage === "function") showPage("internet");
  else if (typeof loadInternetOrders === "function") await loadInternetOrders();
}
window.showCourierToast = showCourierToast;

async function sendOrderToCourier(order) {
  if (typeof order === "string") {
    try { order = JSON.parse(decodeURIComponent(order)); } catch (_) { order = null; }
  }
  if (!order) { alert("Sipariş bilgisi okunamadı."); return; }

  const cfg = getCourierCfg();
  const message = buildCourierMessage(order);
  const orderId = order.id || order.order_id || Date.now();

  if (cfg.mode === "ahk") {
    if (!cfg.chatName) {
      alert("Otomatik gönderim için hedef sohbet adı gerekli.\nGenel Ayarlar → Kuryeye Gönder → \"WhatsApp Sohbet Adı\" alanını doldurun (örn: Nilay veya KURYEMİX).");
      return;
    }
    try { await copyCourierMessage(message); } catch (_) {}
    dropCourierFileForAhk(cfg.chatName, message, orderId);
    markCourierSent(orderId);
    if (typeof showCourierToast === "function") showCourierToast("Kuryeye gönderiliyor: " + cfg.chatName);
    await returnToInternetOrders();
    return;
  }

  // Güvenlik: Bu sürümde wa.me / WhatsApp Web yönlendirmesi kesinlikle yoktur.
  // Eski localStorage ayarı "test" veya "group" olsa bile yalnızca AHK köprüsü kullanılır.
  if (!cfg.chatName) {
    alert("Otomatik gönderim için WhatsApp sohbet adı gerekli.\nGenel Ayarlar → Kuryeye Gönder alanından Nilay veya KURYEMİX yazıp kaydedin.");
    return;
  }
  try { await copyCourierMessage(message); } catch (_) {}
  dropCourierFileForAhk(cfg.chatName, message, orderId);
  markCourierSent(orderId);
  if (typeof showCourierToast === "function") showCourierToast("Kuryeye gönderiliyor: " + cfg.chatName);
  await returnToInternetOrders();
}
window.sendOrderToCourier = sendOrderToCourier;
window.buildCourierMessage = buildCourierMessage;

function previewCourierMessage(order) {
  if (typeof order === "string") {
    try { order = JSON.parse(decodeURIComponent(order)); } catch (_) { order = null; }
  }
  if (!order) return;
  alert(buildCourierMessage(order));
}
window.previewCourierMessage = previewCourierMessage;

/* ---- Genel Ayarlar: Kuryeye Gönder kartı ---- */
function mountCourierSettings() {
  const page = document.getElementById("pageSettings");
  if (!page || document.getElementById("courierSettingsCard")) return;
  const cfg = getCourierCfg();

  const card = document.createElement("div");
  card.id = "courierSettingsCard";
  card.style.cssText =
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-top:20px;max-width:520px;box-shadow:0 1px 3px rgba(0,0,0,.08)";
  card.innerHTML = `
    <h3 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827">Kuryeye Gönder (WhatsApp)</h3>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280">İnternet siparişleri WhatsApp'a bu ayarlarla gönderilir.</p>

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Gönderim Hedefi</label>
    <select id="courierMode" disabled style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:12px;background:#f3f4f6">
      <option value="ahk">Otomatik Gönder (Masaüstü Bot - AHK)</option>
    </select>

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">WhatsApp Sohbet Adı (Otomatik Bot için)</label>
    <input id="courierChatName" type="text" placeholder="Nilay  /  KURYEMİX"
      style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:4px">
    <div style="font-size:12px;color:#6b7280;margin:0 0 12px">WhatsApp Desktop'taki sohbet adıyla birebir aynı yazın. KNPOS-Kurye-Bot.ahk açık olmalı.</div>

    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">İşletme Konum Linki</label>
    <input id="courierMapLink" type="url"
      style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:16px">
    <div style="font-size:12px;color:#6b7280;margin:-10px 0 16px">Kuryeye her siparişte bu sabit işletme konumu gönderilir.</div>

    <button id="courierSaveBtn"
      style="width:100%;padding:12px;border:0;border-radius:8px;background:#111827;color:#fff;font-weight:700;cursor:pointer">
      AYARLARI KAYDET
    </button>
    <div id="courierMsg" style="margin-top:12px;font-size:13px"></div>
  `;
  page.appendChild(card);

  document.getElementById("courierMode").value = cfg.mode;
  document.getElementById("courierMapLink").value = cfg.mapLink;
  document.getElementById("courierChatName").value = cfg.chatName || "";

  document.getElementById("courierSaveBtn").onclick = function () {
    saveCourierCfg({
      mode: "ahk",
      testPhone: "",
      groupLink: "",
      mapLink: document.getElementById("courierMapLink").value.trim() || COURIER_DEFAULT_MAP,
      chatName: document.getElementById("courierChatName").value.trim(),
      header: cfg.header
    });
    const el = document.getElementById("courierMsg");
    el.style.color = "#16a34a";
    el.textContent = "Kaydedildi.";
    setTimeout(() => { el.textContent = ""; }, 2500);
  };
}
window.mountCourierSettings = mountCourierSettings;

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(mountCourierSettings, 300);
});
