/* KAPTAN NİLİ BULUT POS - ÇALIŞAN SAF SÜRÜM + KANALLAR VE TEMA İYİLEŞTİRMESİ */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    await client.from("recipes").select("*").limit(1);
  } catch (e) {}
}

// 1. TEMA RENK YÖNETİMİ VE KALICILIK
const THEME_STORAGE_KEY = "knpos_primary_color_v1";

async function loadThemeColor() {
  try {
    const savedColor = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedColor) {
      applyThemeColor(savedColor);
    } else {
      applyThemeColor('#2d5a27');
    }
  } catch (err) {}
}

function changeThemeColor(primaryHex) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, primaryHex);
    applyThemeColor(primaryHex);
  } catch (err) {}
}

function applyThemeColor(primaryHex) {
  document.documentElement.style.setProperty('--primary', primaryHex);
  
  let darkHex = primaryHex;
  if (primaryHex === '#2d5a27') darkHex = '#1e3d1a';
  else if (primaryHex === '#0f766e') darkHex = '#115e59';
  else if (primaryHex === '#78350f') darkHex = '#451a03';
  else if (primaryHex === '#1e3a8a') darkHex = '#172554';
  else if (primaryHex === '#9d174d') darkHex = '#831843';
  else if (primaryHex === '#000000') darkHex = '#1c1917'; // Siyah
  else if (primaryHex === '#ef4444') darkHex = '#dc2626'; // Açık Kırmızı
  else if (primaryHex === '#eab308') darkHex = '#ca8a04'; // Sarı
  else if (primaryHex === '#06b6d4') darkHex = '#0891b2'; // Açık Mavi
  else if (primaryHex === '#ec4899') darkHex = '#be185d'; // Pembe
  else if (primaryHex === '#f97316') darkHex = '#c2410c'; // Turuncu
  else if (primaryHex === '#8b5cf6') darkHex = '#6d28d9'; // Mor

  document.documentElement.style.setProperty('--primary-dark', darkHex);
}

// 2. GİRİŞ İŞLEMİ
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
      alert("Giriş Başarısız: Şifre hatalı.");
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

// 3. SAYFA GEÇİŞLERİ
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
  } else if (pageName === "reports") {
    initReportDates();
    fetchAndRenderReports();
  } else if (pageName === "settings") {
    loadPaymentMethods();
  }
}

function setupNavigation() {
  document.querySelectorAll("header nav button").forEach(btn => {
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
    alert("İçinde açık sipariş olan masayı silemezsiniz!");
    return;
  }

  if (confirm(`'${table.name}' masasını tamamen silmek istediğinize emin misiniz?`)) {
    const updated = tables.filter(t => t.id !== selectedTableId);
    saveTables(updated);
    closeTableModal();
    renderTables();
  }
}

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

async function openTableModal(tableId) {
  if (!currentCashSession) {
    alert("⚠️ Kasa kapalı! Lütfen önce kasayı açınız.");
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
  if (confirm("Masadaki tüm siparişleri silmek istediğinize emin misiniz?")) {
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

async function loadProducts() {
  try {
    const { data, error } = await client.from("products").select("*").eq("active", true).order("name", { ascending: true });
    if (error) throw error;
    saleProducts = data || [];
    renderCategories();
    renderSaleProducts();
  } catch (err) {}
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

async function loadIngredientsForDashboard() {
  try {
    const { data, error } = await client.from("ingredients").select("*").order("name", { ascending: true });
    if (!error && data) {
      allIngredients = data;
      populateProductionDropdown();
    }
  } catch (err) {}
}

async function loadIngredients() {
  try {
    const { data, error } = await client.from("ingredients").select("*").order("name", { ascending: true });
    if (error) throw error;
    allIngredients = data || [];
    renderIngredientsTable(allIngredients);
    populateProductionDropdown();
  } catch (err) {}
}

function populateProductionDropdown() {
  const select = document.getElementById("prodInputIngSelect");
  if (!select) return;
  select.innerHTML = allIngredients.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit || 'gr'})</option>`).join("");
}

// 4. ÖDEME KANALLARI YÖNETİMİ (Ekleme ve Silme Tam Fonksiyonel)
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
  renderPaymentMethodsList();
}

function renderPaymentMethodsList() {
  const container = document.getElementById("paymentMethodsList");
  if (!container) return;

  if (!paymentMethods || paymentMethods.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:10px; font-size:13px;">Kayıtlı ödeme kanalı yok.</div>';
    return;
  }

  container.innerHTML = paymentMethods.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border-color); font-size:13px;">
      <span><strong>${escapeHtml(m.name)}</strong></span>
      <button type="button" style="background:#dc2626; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;" onclick="deletePaymentMethod(${m.id})">Sil</button>
    </div>
  `).join("");
}

async function addPaymentMethod() {
  const input = document.getElementById("newPaymentMethodInput");
  const name = input ? input.value.trim() : "";

  if (!name) {
    alert("Lütfen ödeme kanalı adı giriniz.");
    return;
  }

  try {
    const { error } = await client.from("payment_methods").insert({ name: name, active: true });
    if (error) throw error;
    if (input) input.value = "";
    await loadPaymentMethods();
    alert(`'${name}' ödeme kanalı başarıyla eklendi!`);
  } catch (err) {
    alert("Ödeme kanalı eklenemedi: " + err.message);
  }
}

async function deletePaymentMethod(id) {
  if (!confirm("Bu ödeme kanalını silmek istediğinize emin misiniz?")) return;
  try {
    const { error } = await client.from("payment_methods").delete().eq("id", id);
    if (error) throw error;
    await loadPaymentMethods();
    alert("Ödeme kanalı silindi.");
  } catch (err) {
    alert("Silinemedi: " + err.message);
  }
}

function openPaymentModal() {
  const table = getTables().find(t => t.id === selectedTableId);
  const paymentModal = document.getElementById("paymentModal");
  const paymentTitle = document.getElementById("paymentTotalTitle");
  const grid = document.getElementById("quickPaymentGrid");

  if (!table || !paymentModal || !grid) return;

  if (paymentTitle) {
    paymentTitle.innerHTML = `<strong>${escapeHtml(table.name)}</strong> • Ödenecek Tutar: <strong style="color:var(--primary); font-size:18px;">${formatMoney(table.total)}</strong>`;
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

    try { await deductStockFromRecipe(table.orders); } catch (e) {}

    table.status = "closed";
    table.openedAt = null;
    table.total = 0;
    table.orders = [];
    saveTables(tables);

    document.getElementById("paymentModal").style.display = "none";
    closeTableModal();
    renderTables();
    await renderSales();

    alert(`Satış [ ${channelName} ] başarıyla tamamlandı!`);
  } catch (err) {
    alert("Satış kaydedilemedi: " + err.message);
  }
}

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

    const { data: productsData } = await client.from("products").select("id, name");
    const productMap = {};
    if (productsData) productsData.forEach(p => { productMap[p.id] = p.name; });

    container.innerHTML = items.map(item => {
      const prodName = productMap[item.product_id] || "Ürün";
      const lineTotal = Number(item.line_total || (item.quantity * item.unit_price) || 0);
      return `
        <div class="receipt-detail-row" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <div>
            <strong>${escapeHtml(prodName)}</strong><br>
            <span style="font-size:11px; color:var(--text-muted);">${item.quantity} Adet × ${formatMoney(item.unit_price)}</span>
          </div>
          <div style="font-weight:bold; color:var(--primary); align-self:center;">${formatMoney(lineTotal)}</div>
        </div>
      `;
    }).join("");
  } catch (err) {}
}

async function deductStockFromRecipe(orders) {
  try {
    for (const item of orders) {
      const { data: recipeItems } = await client.from("recipes").select("*").eq("product_id", item.productId);
      if (!recipeItems) continue;
      for (const r of recipeItems) {
        const totalDeduct = Number(r.quantity_required || r.quantity || 0) * Number(item.quantity);
        const { data: ingData } = await client.from("ingredients").select("stock_quantity").eq("id", r.ingredient_id).single();
        if (ingData) {
          const newStock = Math.max(0, Number(ingData.stock_quantity ?? 0) - totalDeduct);
          await client.from("ingredients").update({ stock_quantity: newStock }).eq("id", r.ingredient_id);
        }
      }
    }
  } catch (err) {}
}

async function loadManagementProducts() {
  const tbody = document.getElementById("managementProductsTbody");
  if (!tbody) return;

  try {
    const { data, error } = await client.from("products").select("*").order("name", { ascending: true });
    if (error) throw error;
    window.kaptanManagementList = data || [];
    renderManagementProductsTable(window.kaptanManagementList);
  } catch (err) {}
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
    return;
  }
  if (isNaN(priceVal) || priceVal < 0) {
    alert("Lütfen geçerli bir fiyat giriniz.");
    return;
  }

  try {
    if (!editId) {
      await client.from("products").insert({ name: nameVal, category: catVal, price: priceVal, image_url: imageVal, active: true });
      alert(`✅ '${nameVal}' başarıyla eklendi!`);
    } else {
      await client.from("products").update({ name: nameVal, category: catVal, price: priceVal, image_url: imageVal }).eq("id", editId);
      alert(`✅ Ürün güncellendi!`);
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
    await client.from("products").update({ active: !currentStatus }).eq("id", id);
    await loadManagementProducts();
    await loadProducts();
  } catch (err) {}
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
  if (target.id === "addNewTableBtn") { e.preventDefault(); addNewTable(); return; }
  if (target.id === "renameTableBtn") { e.preventDefault(); renameTable(); return; }
  if (target.id === "deleteTableBtn") { e.preventDefault(); deleteTable(); return; }
  if (target.id === "closeReceiptDetailBtn") { e.preventDefault(); document.getElementById("receiptDetailModal").style.display = "none"; return; }
  if (target.id === "saveProductBtn") { e.preventDefault(); handleNewProductSubmit(); return; }
  if (target.id === "resetProductFormBtn") { e.preventDefault(); resetProductForm(); return; }
  if (target.id === "addPaymentMethodBtn") { e.preventDefault(); addPaymentMethod(); return; }
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
    cancelPayBtn.onclick = () => { document.getElementById("paymentModal").style.display = "none"; };
  }

  const openCashBtn = document.getElementById("openCashButton");
  if (openCashBtn) {
    openCashBtn.onclick = async () => {
      const openingInput = document.getElementById("openingAmount");
      const amount = Number(openingInput?.value || 0);
      if (!openingInput || amount < 0) { alert("Geçersiz tutar."); return; }
      try {
        await client.from("cash_sessions").insert({ opening_amount: amount, status: "open", opened_at: new Date().toISOString() });
        openingInput.value = "";
        alert("Kasa açıldı!");
        await loadCashStatus();
      } catch (err) {}
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
        await client.from("cash_sessions").update({ closing_amount: amount, closed_at: new Date().toISOString(), status: "closed" }).eq("id", currentCashSession.id);
        if (closingInput) closingInput.value = "";
        alert("Kasa kapatıldı!");
        currentCashSession = null;
        await loadCashStatus();
      } catch (err) {}
    };
  }
}

// İLK AÇILIŞ
document.addEventListener("DOMContentLoaded", () => {
  loadThemeColor();
  loadPaymentMethods();
});

if (loginButton) loginButton.addEventListener("click", login);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => { e.key === "Enter" && login(); });
}
