/* KAPTAN NİLİ BULUT POS - FULL TEMİZ VE SORUNSUZ SÜRÜM v3.7 */

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
async function login() {
  const password = loginPassword ? loginPassword.value : "";

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  try {
    const { error } = await client.auth.signInWithPassword({
      email: "denizmazlumoglu@gmail.com",
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

    container.innerHTML = items.map(item => {
      const prodName = productMap[item.product_id] || "Ürün";
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
    renderManagementProductsTable(window.kaptanManagementList);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#dc2626; padding:20px;">Ürünler yüklenemedi.</td></tr>';
  }
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
        <button type="button" class="btn-recipe" onclick="openRecipeModal(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Reçete</button>
        <button type="button" class="btn-toggle" onclick="toggleProductStatus(${p.id}, ${p.active !== false})">${p.active !== false ? 'Pasif Yap' : 'Aktif Yap'}</button>
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
// İNTERNET SİPARİŞLERİ VE CANLI ZİL SİSTEMİ
// ==========================================

async function loadInternetOrders() {
  const tbody = document.getElementById("internetOrdersTbody");
  if (!tbody) return;

  try {
    // Hiçbir koşula takılmadan doğrudan en son siparişleri çekelim
    const { data: orders, error } = await client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Sistemde kayıtlı internet siparişi bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const timeStr = o.created_at ? new Date(o.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : "Şimdi";
      const orderNo = escapeHtml(o.order_id || o.id);
      const totalFormatted = formatMoney(o.total_price || o.total_amount || 0);
      const paymentChannel = escapeHtml(o.payment_channel || o.platform || "kaptannilicom");
      const orderStatus = o.status || "pending";

      let productsSummary = "Ürün bilgisi yok";
      try {
        let prods = o.products;
        if (typeof prods === 'string') prods = JSON.parse(prods);
        if (Array.isArray(prods) && prods.length > 0) {
          productsSummary = prods.map(p => `${escapeHtml(p.name)} (${p.qty || p.quantity || 1} Adet)`).join(", ");
        }
      } catch (e) {
        productsSummary = "Ürün detayları yüklenemedi";
      }

      let actionButtons = `
        <button type="button" class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick='openInternetOrderDetail(${JSON.stringify(o)})'>🔍 Detay</button>
      `;

      if (orderStatus === "pending" || !o.status) {
        actionButtons += `
          <button type="button" class="btn-danger" style="padding:6px 10px; font-size:12px; margin-left:6px;" onclick="quickCancelInternetOrder('${o.id}', '${orderNo}')">❌ İptal</button>
        `;
      } else if (orderStatus === "completed") {
        actionButtons += ` <span style="font-size:11px; color:#16a34a; font-weight:bold; margin-left:6px;">✓ Kaydedildi</span>`;
      } else if (orderStatus === "cancelled") {
        actionButtons += ` <span style="font-size:11px; color:#dc2626; font-weight:bold; margin-left:6px;">✕ İptal Edildi</span>`;
      }

      return `
        <tr>
          <td><strong>${timeStr}</strong></td>
          <td><strong>#${orderNo}</strong></td>
          <td>${productsSummary}</td>
          <td><strong style="color:var(--primary);">${totalFormatted}</strong></td>
          <td>${paymentChannel}</td>
          <td style="text-align: right; white-space: nowrap;">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; padding:20px;">Hata: ${err.message}</td></tr>`;
  }
}


function initRealtimeOrders() {
  client
    .channel('public:orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      console.log('Yeni internet siparişi geldi!', payload.new);
      playOrderAlert(); 
      loadInternetOrders(); 
      alert("🚨 YENİ İNTERNET SİPARİŞİ GELDİ!");
    })
    .subscribe();
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

  let productsHtml = "";
  try {
    let prods = order.products;
    if (typeof prods === 'string') prods = JSON.parse(prods);
    if (Array.isArray(prods)) {
      productsHtml = prods.map(p => `• ${escapeHtml(p.name)} (${p.qty || p.quantity || 1} Adet)`).join("<br>");
    } else {
      productsHtml = "• TEST ÜRÜNÜ (1 Adet)";
    }
  } catch(e) {
    productsHtml = "• TEST ÜRÜNÜ (1 Adet)";
  }

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

        let prods = order.products;
        if (typeof prods === 'string') {
          try { prods = JSON.parse(prods); } catch(e) { prods = []; }
        }

        if (Array.isArray(prods) && prods.length > 0) {
          const saleItems = prods.map(p => ({
            sale_id: sale.id,
            product_id: Number(p.id || 1),
            quantity: Number(p.qty || p.quantity || 1),
            unit_price: Number(p.price || totalVal),
            line_total: Number(p.qty || p.quantity || 1) * Number(p.price || totalVal)
          }));
          await client.from("sale_items").insert(saleItems);
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

  document.getElementById("cancelInternetOrderBtn").onclick = async function() {
    if (confirm(`Sipariş #${orderIdText} iptal edilsin mi?`)) {
      await client.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      alert("❌ Sipariş iptal edildi.");
      document.getElementById('internetOrderDetailModal').style.display = 'none';
      await loadInternetOrders();
    }
  };

  modal.style.display = "flex";
}

function processInternetOrder(orderId) {
  alert(`Sipariş #${orderId} işleme alındı!`);
}
