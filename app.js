/* KAPTAN NİLİ BULUT POS - ADİSYO ENTEGRASYONLU FULL TEMİZ SÜRÜM */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

// ADİSYO API ENTEGRASYON BİLGİLERİ (Kendi anahtarlarını buraya yazacaksın kanka)
const ADISYO_MOBILE_APP_KEY = "BURAYA_MOBIL_APP_KEY_GELECEK";
const ADISYO_WEB_APP_KEY = "BURAYA_WEB_APP_KEY_GELECEK";
const ADISYO_API_SECRET_KEY = "BURAYA_API_SECRET_KEY_GELECEK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elemanları
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

let currentCashSession = null;
let selectedTableId = null;
let selectedRecipeProductId = null;
let saleProducts = [];
let allManagementProducts = [];
let allIngredients = [];
let paymentMethods = [];
let selectedCategory = "Tümü";

// Grafik Nesneleri
let paymentChartInstance = null;
let categoryChartInstance = null;
let productChartInstance = null;

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
    const { data: recipesData, error: recipeErr } = await client.from("recipes").select("*").limit(1);
    if (!recipeErr) return "recipes";
  } catch (err) {
    console.error("Tablo hatası:", err.message);
  }
}

// TEMA RENK YÖNETİMİ
async function loadThemeColor() {
  try {
    const { data, error } = await client.from("app_settings").select("value").eq("key", "primary_color").single();
    if (!error && data && data.value) {
      applyThemeColor(data.value);
    }
  } catch (err) {
    console.log("Tema yüklenemedi, varsayılan kullanılıyor.");
  }
}

function applyThemeColor(primaryHex) {
  document.documentElement.style.setProperty('--primary', primaryHex);
  
  let darkHex = primaryHex;
  if (primaryHex === '#2d5a27') darkHex = '#1e3d1a';
  else if (primaryHex === '#0f766e') darkHex = '#115e59';
  else if (primaryHex === '#78350f') darkHex = '#451a03';
  else if (primaryHex === '#1e3a8a') darkHex = '#172554';
  else if (primaryHex === '#9d174d') darkHex = '#831843';

  document.documentElement.style.setProperty('--primary-dark', darkHex);
}

async function changeThemeColor(primaryHex, darkHex) {
  applyThemeColor(primaryHex);
  try {
    await client.from("app_settings").upsert({ key: "primary_color", value: primaryHex });
    alert("Tema rengi başarıyla güncellendi ve kaydedildi!");
  } catch (err) {
    alert("Tema kaydedilemedi: " + err.message);
  }
}

// 1. GİRİŞ İŞLEMİ
async function login() {
  const password = loginPassword ? loginPassword.value : "";

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  try {
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

// 7. MALZEMELER VE ÜRETİM LOG FİLTRELEME MOTORU
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

async function submitProductionEntry() {
  const ingId = document.getElementById("prodInputIngSelect").value;
  const qtyToAdd = parseFloat(document.getElementById("prodInputQty").value);
  const note = document.getElementById("prodInputNote").value.trim() || "Üretim Girişi";

  if (!ingId || isNaN(qtyToAdd) || qtyToAdd <= 0) {
    alert("Lütfen geçerli bir malzeme seçin ve artış miktarı girin.");
    return;
  }

  const ingObj = allIngredients.find(i => String(i.id) === String(ingId));
  if (!ingObj) return;

  const currentStock = Number(ingObj.stock_quantity || 0);
  const newStock = currentStock + qtyToAdd;

  try {
    const { error: updateErr } = await client.from("ingredients").update({ stock_quantity: newStock }).eq("id", ingId);
    if (updateErr) throw updateErr;

    const { error: logErr } = await client.from("stock_movements").insert({
      ingredient_id: ingId,
      quantity_changed: qtyToAdd,
      movement_type: "Uretim Girisi",
      note: note
    });
    if (logErr) throw logErr;

    alert(`✅ Üretim kaydedildi! ${ingObj.name} stoğuna +${qtyToAdd} ${ingObj.unit || 'gr'} eklendi.`);
    
    document.getElementById("prodInputQty").value = "";
    document.getElementById("prodInputNote").value = "";

    await loadIngredientsForDashboard();
    
    if (document.getElementById("pageIngredients").style.display !== "none") {
      await loadIngredients();
      await loadStockMovements();
    }

  } catch (err) {
    alert("Üretim kaydedilemedi: " + err.message);
  }
}

function initLogDates() {
  const startInput = document.getElementById("logStartDate");
  const endInput = document.getElementById("logEndDate");
  
  const todayStr = new Date().toISOString().split("T")[0];
  if (startInput && !startInput.value) startInput.value = todayStr;
  if (endInput && !endInput.value) endInput.value = todayStr;

  setActiveLogDateButton("logFilterTodayBtn");
}

function setActiveLogDateButton(activeBtnId) {
  ['logFilterTodayBtn', 'logFilterWeekBtn', 'logFilterMonthBtn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.remove("active-date-btn");
  });
  const activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) activeBtn.classList.add("active-date-btn");
}

function setLogDateRange(type) {
  const startInput = document.getElementById("logStartDate");
  const endInput = document.getElementById("logEndDate");
  const now = new Date();
  
  const todayStr = now.toISOString().split("T")[0];
  endInput.value = todayStr;

  if (type === "today") {
    startInput.value = todayStr;
    setActiveLogDateButton("logFilterTodayBtn");
  } else if (type === "week") {
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startInput.value = firstDay.toISOString().split("T")[0];
    setActiveLogDateButton("logFilterWeekBtn");
  } else if (type === "month") {
    const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    startInput.value = firstDayStr;
    setActiveLogDateButton("logFilterMonthBtn");
  }
  loadStockMovements();
}

async function loadStockMovements() {
  const tbody = document.getElementById("stockMovementsTbody");
  if (!tbody) return;

  const startDate = document.getElementById("logStartDate")?.value;
  const endDate = document.getElementById("logEndDate")?.value;

  try {
    let query = client.from("stock_movements").select("*").order("created_at", { ascending: false });

    if (startDate && endDate) {
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;
      query = query.gte("created_at", startIso).lte("created_at", endIso);
    }

    const { data: movements, error: movErr } = await query;
    if (movErr) throw movErr;

    if (!movements || movements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">Bu tarih aralığında üretim hareketi bulunmuyor.</td></tr>';
      return;
    }

    if (!allIngredients || allIngredients.length === 0) {
      const { data: ingData } = await client.from("ingredients").select("*");
      if (ingData) allIngredients = ingData;
    }

    tbody.innerHTML = movements.map(m => {
      const dateObj = new Date(m.created_at);
      const dateStr = dateObj.toLocaleDateString('tr-TR');
      const timeStr = dateObj.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
      
      const foundIng = allIngredients.find(i => String(i.id) === String(m.ingredient_id));
      const ingName = foundIng ? foundIng.name : "Malzeme #" + m.ingredient_id;
      const unit = foundIng ? (foundIng.unit || "gr") : "gr";

      return `
        <tr>
          <td><strong>${dateStr}</strong> <span style="color:var(--text-muted);">${timeStr}</span></td>
          <td>${escapeHtml(ingName)}</td>
          <td><strong style="color:#16a34a;">+${m.quantity_changed} ${unit}</strong></td>
          <td>${escapeHtml(m.note || '-')}</td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc2626;">Hareketler yüklenemedi: ' + escapeHtml(err.message) + '</td></tr>';
  }
}

function renderIngredientsTable(ingredients) {
  const tbody = document.getElementById("ingredientsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (ingredients.length === 0) {
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

function resetProdForm() {}

async function saveIngredientFromForm() {
  const editId = document.getElementById("editIngId").value;
  const name = document.getElementById("ingNameInput").value.trim();
  const unit = document.getElementById("ingUnitSelect").value;
  const stock = parseFloat(document.getElementById("ingStockInput").value);

  if (!name || isNaN(stock) || stock < 0) {
    alert("Lütfen geçerli bir malzeme adı ve stok miktarı giriniz.");
    return;
  }

  const payload = { name: name, unit: unit, stock_quantity: stock };

  try {
    if (editId) {
      const { error } = await client.from("ingredients").update(payload).eq("id", editId);
      if (error) throw error;
      alert("Malzeme ve birim başarıyla güncellendi!");
    } else {
      const { error } = await client.from("ingredients").insert(payload);
      if (error) throw error;
      alert("Yeni malzeme eklendi!");
    }

    resetIngForm();
    await loadIngredients();
    await loadIngredientsForDashboard();

  } catch (err) {
    alert("Malzeme kaydedilemedi: " + err.message);
  }
}

function editIngredient(id) {
  const ing = allIngredients.find(i => i.id === id);
  if (!ing) return;

  const currentStock = ing.stock_quantity ?? 0;

  document.getElementById("editIngId").value = ing.id;
  document.getElementById("ingNameInput").value = ing.name;
  
  const unitSelect = document.getElementById("ingUnitSelect");
  if (unitSelect) {
    unitSelect.value = ing.unit || "gr";
  }

  document.getElementById("ingStockInput").value = currentStock;

  document.getElementById("ingFormTitle").textContent = "Malzeme Düzenle";
  document.getElementById("resetIngFormBtn").style.display = "inline-block";
}

function resetIngForm() {
  document.getElementById("editIngId").value = "";
  document.getElementById("ingNameInput").value = "";
  document.getElementById("ingStockInput").value = "";
  document.getElementById("ingFormTitle").textContent = "Yeni Malzeme Ekle";
  document.getElementById("resetIngFormBtn").style.display = "none";
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
    const { error } = await client.from("ingredients").update({ stock_quantity: newStock }).eq("id", id);
    if (error) throw error;
    await loadIngredients();
    await loadIngredientsForDashboard();
  } catch (err) {
    alert("Stok güncellenemedi: " + err.message);
  }
}

// 8. EXCEL İŞLEMLERİ (UPSERT DESTEKLİ)
function exportIngredientsExcel() {
  if (!allIngredients || allIngredients.length === 0) {
    alert("İndirilecek malzeme bulunamadı.");
    return;
  }
  const data = allIngredients.map(i => ({
    "Malzeme Adı": i.name,
    "Mevcut Stok": i.stock_quantity || 0,
    "Birim": i.unit || "gr"
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Malzemeler");
  XLSX.writeFile(wb, "KaptanNili_Malzemeler.xlsx");
}

async function importIngredientsExcel(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      for (const row of rows) {
        const name = row["Malzeme Adı"] || row["name"];
        const stock = Number(row["Mevcut Stok"] || row["stock_quantity"] || 0);
        const unit = row["Birim"] || row["unit"] || "gr";

        if (name) {
          const existing = allIngredients.find(i => i.name.toLowerCase() === String(name).toLowerCase());
          if (existing) {
            await client.from("ingredients").update({ stock_quantity: stock, unit: unit }).eq("id", existing.id);
          } else {
            await client.from("ingredients").insert({ name: name, stock_quantity: stock, unit: unit });
          }
        }
      }
      alert("Malzemeler Excel'den başarıyla güncellendi ve içeri aktarıldı!");
      await loadIngredients();
      await loadIngredientsForDashboard();
    } catch (err) {
      alert("Excel yükleme hatası: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsArrayBuffer(file);
}

function exportProductsExcel() {
  if (!allManagementProducts || allManagementProducts.length === 0) {
    alert("İndirilecek ürün bulunamadı.");
    return;
  }
  const data = allManagementProducts.map(p => ({
    "Ürün Adı": p.name,
    "Kategori": p.category || "Profiterol",
    "Satış Fiyatı (TL)": p.price || 0,
    "Resim URL": p.image_url || "",
    "Aktif (True/False)": p.active ?? true
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Urunler");
  XLSX.writeFile(wb, "KaptanNili_Urunler.xlsx");
}

async function importProductsExcel(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      for (const row of rows) {
        const name = row["Ürün Adı"] || row["name"];
        const category = row["Kategori"] || row["category"] || "Profiterol";
        const price = Number(row["Satış Fiyatı (TL)"] || row["price"] || 0);
        const image_url = row["Resim URL"] || row["image_url"] || null;
        const active = row["Aktif (True/False)"] ?? true;

        if (name) {
          await client.from("products").insert({ name, category, price, image_url, active });
        }
      }
      alert("Ürünler Excel'den başarıyla içe aktarıldı!");
      await loadManagementProducts();
      await loadProducts();
    } catch (err) {
      alert("Excel yükleme hatası: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsArrayBuffer(file);
}

async function exportRecipeExcel() {
  if (!selectedRecipeProductId) return;
  try {
    const { data: recipes } = await client
      .from("recipes")
      .select("*, ingredients(name), products(name)")
      .eq("product_id", selectedRecipeProductId);

    if (!recipes || recipes.length === 0) {
      alert("Bu ürüne ait reçete bulunamadı.");
      return;
    }

    const prodName = recipes[0].products?.name || "Reçete";
    const excelData = recipes.map(r => ({
      "Ürün Adı": prodName,
      "Malzeme Adı": r.ingredients?.name || "",
      "Gerekli Miktar": r.quantity_required || r.quantity || 0,
      "Birim": r.unit || "gr"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recete");
    XLSX.writeFile(wb, `${prodName}_Recete.xlsx`);
  } catch (err) {
    alert("Reçete indirilemedi: " + err.message);
  }
}

async function importRecipeExcel(e) {
  const file = e.target.files[0];
  if (!file || !selectedRecipeProductId) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      await loadIngredients();

      for (const row of rows) {
        const ingName = row["Malzeme Adı"] || row["malzeme"];
        const qty = Number(row["Gerekli Miktar"] || row["miktar"] || 0);
        const unit = row["Birim"] || row["birim"] || "gr";

        const foundIng = allIngredients.find(i => i.name.toLowerCase() === String(ingName).toLowerCase());
        if (foundIng && qty > 0) {
          await client.from("recipes").insert({
            product_id: selectedRecipeProductId,
            ingredient_id: foundIng.id,
            quantity: qty,
            quantity_required: qty,
            unit: unit
          });
        }
      }
      alert("Reçete maddeleri Excel'den yüklendi!");
      await renderRecipeItemsList();
    } catch (err) {
      alert("Reçete yükleme hatası: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsArrayBuffer(file);
}

// 9. ÖDEME KANALLARI YÖNETİMİ
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

  container.innerHTML = paymentMethods.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
      <span><strong>${escapeHtml(m.name)}</strong></span>
      <button type="button" style="background:#dc2626; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;" onclick="deletePaymentMethod(${m.id})">Sil</button>
    </div>
  `).join("");
}

async function addPaymentMethod() {
  const input = document.getElementById("newPaymentMethodInput");
  const name = input ? input.value.trim() : "";

  if (!name) {
    alert("Lütfen kanal adı giriniz.");
    return;
  }

  try {
    const { error } = await client.from("payment_methods").insert({ name: name, active: true });
    if (error) throw error;
    if (input) input.value = "";
    await loadPaymentMethods();
    alert(`'${name}' kanalı başarıyla eklendi!`);
  } catch (err) {
    alert("Kanal eklenemedi: " + err.message);
  }
}

async function deletePaymentMethod(id) {
  if (!confirm("Bu ödeme kanalını silmek istediğinize emin misiniz?")) return;
  try {
    const { error } = await client.from("payment_methods").delete().eq("id", id);
    if (error) throw error;
    await loadPaymentMethods();
  } catch (err) {
    alert("Silinemedi: " + err.message);
  }
}

// 10. ADİSYON ENTEGRASYON KÖPRÜSÜ (ADİSYO'DAN SİPARİŞ ÇEKME)
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
      throw new Error("Adisyo sunucusundan veri alınamadı. HTTP Kod: " + response.status);
    }

    const result = await response.json();
    const adisyoOrders = result.data || result;

    if (!adisyoOrders || adisyoOrders.length === 0) {
      alert("Adisyo'da bekleyen yeni bir sipariş bulunmuyor kanka.");
      return;
    }

    for (const order of adisyoOrders) {
      const totalAmount = Number(order.totalAmount || order.total || 0);
      const paymentChannel = order.channel || order.paymentType || "Adisyo / Online";

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

        await deductStockFromRecipe(order.items.map(i => ({
          productId: i.productId || 1,
          quantity: Number(i.quantity || 1)
        })));
      }
    }

    alert("🎉 Adisyo'daki siparişler başarıyla Kaptan Nili POS sistemine aktarıldı, kasaya işlendi ve stoklar düşüldü!");
    
    await renderSales();
    await loadIngredients();

  } catch (err) {
    console.error("Adisyo Entegrasyon Hatası:", err);
    alert("Adisyo siparişleri çekilirken bir hata oluştu: " + err.message);
  }
}

// 11. TEK TIKLA SADE ÖDEME MODALI
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

    const saleItems = table.orders.map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      line_total: Number(item.quantity) * Number(item.price)
    }));

    await client.from("sale_items").insert(saleItems);

    await deductStockFromRecipe(table.orders);

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

    alert(`Satış [ ${channelName} ] kanalı üzerinden başarıyla tamamlandı ve stoklar düşüldü!`);

  } catch (err) {
    alert("Satış kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
  }
}

// 12. ANLIK SATIŞLAR TABLOSU
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
      return `
        <div class="daily-sales-row" onclick="openReceiptDetailModal(${s.id}, '${timeStr}', '${escapeHtml(s.payment_type || "Nakit")}', ${s.total_amount})">
          <div><strong>${timeStr}</strong></div>
          <div><strong style="color:var(--primary);">${escapeHtml(s.payment_type || "Nakit")}</strong></div>
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
    const { data: items, error } = await client
      .from("sale_items")
      .select("*, products(name)")
      .eq("sale_id", saleId);

    if (error) throw error;

    if (!items || items.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Bu adisyona ait detay bulunamadı.</div>';
      return;
    }

    container.innerHTML = items.map(item => {
      const prodName = item.products?.name || "Ürün";
      const lineTotal = Number(item.line_total || (item.quantity * item.unit_price) || 0);
      return `
        <div class="receipt-detail-row">
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

// 13. RAPOR SEKMELERİ
function switchReportTab(tabId) {
  const contents = document.querySelectorAll(".report-tab-content");
  contents.forEach(c => c.style.display = "none");

  const tabBtns = document.querySelectorAll(".report-tab-btn");
  tabBtns.forEach(b => b.classList.remove("active-tab"));

  const targetContent = document.getElementById(tabId);
  if (targetContent) targetContent.style.display = "block";

  if (event && event.target) {
    event.target.classList.add("active-tab");
  }
}

function initReportDates() {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  
  const todayStr = new Date().toISOString().split("T")[0];
  if (startInput && !startInput.value) startInput.value = todayStr;
  if (endInput && !endInput.value) endInput.value = todayStr;

  setActiveDateButton("reportFilterTodayBtn");
}

function setActiveDateButton(activeBtnId) {
  const dateBtns = document.querySelectorAll(".btn-date-filter");
  dateBtns.forEach(b => b.classList.remove("active-date-btn"));
  const btn = document.getElementById(activeBtnId);
  if (btn) btn.classList.add("active-date-btn");
}

function setReportDateRange(type) {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  const now = new Date();
  
  const todayStr = now.toISOString().split("T")[0];
  endInput.value = todayStr;

  if (type === "today") {
    startInput.value = todayStr;
    setActiveDateButton("reportFilterTodayBtn");
  } else if (type === "week") {
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startInput.value = firstDay.toISOString().split("T")[0];
    setActiveDateButton("reportFilterWeekBtn");
  } else if (type === "month") {
    const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    startInput.value = firstDayStr;
    setActiveDateButton("reportFilterMonthBtn");
  }
  fetchAndRenderReports();
}

async function fetchAndRenderReports() {
  const startDate = document.getElementById("reportStartDate").value;
  const endDate = document.getElementById("reportEndDate").value;

  if (!startDate || !endDate) {
    alert("Lütfen geçerli bir tarih aralığı seçiniz.");
    return;
  }

  const startIso = `${startDate}T00:00:00.000Z`;
  const endIso = `${endDate}T23:59:59.999Z`;

  try {
    const { data: sales, error: salesErr } = await client
      .from("sales")
      .select("*")
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (salesErr) throw salesErr;

    const saleIds = (sales || []).map(s => s.id);
    let saleItems = [];

    if (saleIds.length > 0) {
      const { data: itemsData, error: itemsErr } = await client
        .from("sale_items")
        .select("*, products(name, category)")
        .in("sale_id", saleIds);

      if (!itemsErr) saleItems = itemsData || [];
    }

    renderReportMetrics(sales, saleItems);
    renderPaymentReportTable(sales);
    renderProductReportTable(saleItems);
    renderReportCharts(sales, saleItems);

  } catch (err) {
    alert("Rapor verileri çekilemedi: " + err.message);
  }
}

function renderReportMetrics(sales, saleItems) {
  const totalRevElem = document.getElementById("metricTotalRevenue");
  const totalSalesElem = document.getElementById("metricTotalSalesCount");
  const totalItemsElem = document.getElementById("metricTotalItemsSold");

  const totalRev = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalSalesCount = (sales || []).length;
  const totalItemsQty = (saleItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  if (totalRevElem) totalRevElem.textContent = formatMoney(totalRev);
  if (totalSalesElem) totalSalesElem.textContent = totalSalesCount.toString();
  if (totalItemsElem) totalItemsElem.textContent = `${totalItemsQty} Adet`;
}

function renderPaymentReportTable(sales) {
  const tbody = document.getElementById("paymentReportTbody");
  if (!tbody) return;

  const paymentMap = {};
  (sales || []).forEach(s => {
    const channel = s.payment_type || "Nakit";
    if (!paymentMap[channel]) {
      paymentMap[channel] = { count: 0, total: 0 };
    }
    paymentMap[channel].count += 1;
    paymentMap[channel].total += Number(s.total_amount || 0);
  });

  const channels = Object.keys(paymentMap);
  if (channels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:15px;">Bu aralıkta satış bulunamadı.</td></tr>';
    return;
  }

  tbody.innerHTML = channels.map(ch => `
    <tr>
      <td><strong style="color:var(--primary);">${escapeHtml(ch)}</strong></td>
      <td><strong>${paymentMap[ch].count}</strong> işlem</td>
      <td style="text-align:right;"><strong>${formatMoney(paymentMap[ch].total)}</strong></td>
    </tr>
  `).join("");
}

function renderProductReportTable(saleItems) {
  const tbody = document.getElementById("productReportTbody");
  if (!tbody) return;

  const productMap = {};
  (saleItems || []).forEach(item => {
    const pName = item.products?.name || "Bilinmeyen Ürün";
    const pCat = item.products?.category || "Diğer";
    const qty = Number(item.quantity || 0);
    const total = Number(item.line_total || (qty * item.unit_price) || 0);

    if (!productMap[pName]) {
      productMap[pName] = { category: pCat, qty: 0, total: 0 };
    }
    productMap[pName].qty += qty;
    productMap[pName].total += total;
  });

  const productNames = Object.keys(productMap);
  if (productNames.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">Satılan ürün bulunamadı.</td></tr>';
    return;
  }

  productNames.sort((a, b) => productMap[b].total - productMap[a].total);

  tbody.innerHTML = productNames.map(pName => `
    <tr>
      <td><strong>${escapeHtml(pName)}</strong></td>
      <td>${escapeHtml(productMap[pName].category)}</td>
      <td><strong style="color:#0284c7;">${productMap[pName].qty}</strong> adet</td>
      <td style="text-align:right;"><strong>${formatMoney(productMap[pName].total)}</strong></td>
    </tr>
  `).join("");
}

function renderReportCharts(sales, saleItems) {
  Chart.register(ChartDataLabels);

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2d5a27';

  const commonOptions = (isVertical = true) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: isVertical ? 'end' : 'end',
        align: isVertical ? 'top' : 'right',
        formatter: (value) => value.toLocaleString("tr-TR") + " TL",
        font: { weight: 'bold', size: 11 },
        color: '#334155'
      }
    },
    scales: isVertical ? {
      y: {
        beginAtZero: true,
        ticks: { callback: (val) => val.toLocaleString("tr-TR") + " TL" }
      }
    } : {
      x: {
        beginAtZero: true,
        ticks: { callback: (val) => val.toLocaleString("tr-TR") + " TL" }
      }
    }
  });

  const paymentMap = {};
  (sales || []).forEach(s => {
    const ch = s.payment_type || "Nakit";
    paymentMap[ch] = (paymentMap[ch] || 0) + Number(s.total_amount || 0);
  });

  const payLabels = Object.keys(paymentMap);
  const payValues = Object.values(paymentMap);

  const ctxPay = document.getElementById("paymentChart")?.getContext("2d");
  if (ctxPay) {
    if (paymentChartInstance) paymentChartInstance.destroy();
    paymentChartInstance = new Chart(ctxPay, {
      type: "bar",
      data: {
        labels: payLabels,
        datasets: [{
          data: payValues,
          backgroundColor: [primaryColor, "#0284c7", "#d97706", "#ea580c", "#7c3aed", "#16a34a", "#dc2626"],
          borderRadius: 8
        }]
      },
      options: commonOptions(true)
    });
  }

  const categoryMap = {};
  (saleItems || []).forEach(item => {
    const cat = item.products?.category || "Diğer";
    const total = Number(item.line_total || (item.quantity * item.unit_price) || 0);
    categoryMap[cat] = (categoryMap[cat] || 0) + total;
  });

  const catLabels = Object.keys(categoryMap);
  const catValues = Object.values(categoryMap);

  const ctxCat = document.getElementById("categoryChart")?.getContext("2d");
  if (ctxCat) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctxCat, {
      type: "bar",
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: primaryColor,
          borderRadius: 8
        }]
      },
      options: commonOptions(true)
    });
  }

  const productMap = {};
  (saleItems || []).forEach(item => {
    const pName = item.products?.name || "Bilinmeyen Ürün";
    const total = Number(item.line_total || (item.quantity * item.unit_price) || 0);
    productMap[pName] = (productMap[pName] || 0) + total;
  });

  const sortedProdNames = Object.keys(productMap).sort((a,b) => productMap[b] - productMap[a]).slice(0, 10);
  const prodValues = sortedProdNames.map(pName => productMap[pName]);
  
  const vibrantColors = [
    primaryColor, "#0284c7", "#d97706", "#ea580c", "#7c3aed", 
    "#16a34a", "#dc2626", "#db2777", "#4f46e5", "#0891b2"
  ];
  const barColors = sortedProdNames.map((_, idx) => vibrantColors[idx % vibrantColors.length]);

  const ctxProd = document.getElementById("productChart")?.getContext("2d");
  if (ctxProd) {
    if (productChartInstance) productChartInstance.destroy();
    productChartInstance = new Chart(ctxProd, {
      type: "bar",
      data: {
        labels: sortedProdNames,
        datasets: [{
          data: prodValues,
          backgroundColor: barColors,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        ...commonOptions(false)
      }
    });
  }
}

// 14. ÜRÜNLER & REÇETE İŞLEMLERİ
async function loadManagementProducts() {
  try {
    const { data, error } = await client.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    allManagementProducts = data || [];
    renderManagementProductsTable(allManagementProducts);
  } catch (err) {
    alert("Ürünler yüklenirken hata oluştu: " + err.message);
  }
}

function renderManagementProductsTable(products) {
  const tbody = document.getElementById("managementProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Kayıtlı ürün bulunamadı.</td></tr>';
    return;
  }

  products.forEach(p => {
    const tr = document.createElement("tr");
    
    const imgHtml = p.image_url 
      ? `<img src="${escapeHtml(p.image_url)}" style="width:36px; height:36px; object-fit:contain; border-radius:6px;" onerror="this.src='https://via.placeholder.com/36?text=?'">`
      : `<span style="font-size:20px;">${getProductEmoji(p.category)}</span>`;

    tr.innerHTML = `
      <td>${imgHtml}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category || 'Diğer')}</td>
      <td><strong>${formatMoney(p.price)}</strong></td>
      <td><span class="${p.active ? 'badge-active' : 'badge-passive'}">${p.active ? 'Aktif' : 'Pasif'}</span></td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editProduct(${p.id})">Düzenle</button>
        <button type="button" class="btn-recipe" onclick="openRecipeModal(${p.id})">🧪 Reçete</button>
        <button type="button" class="btn-toggle" onclick="toggleProductActive(${p.id}, ${p.active})">${p.active ? 'Pasif Yap' : 'Aktif Yap'}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveProductFromForm() {
  const editId = document.getElementById("editProductId").value;
  const name = document.getElementById("prodNameInput").value.trim();
  const category = document.getElementById("prodCategorySelect").value;
  const price = parseFloat(document.getElementById("prodPriceInput").value);
  const imageUrl = document.getElementById("prodImageInput").value.trim();

  if (!name || isNaN(price) || price < 0) {
    alert("Lütfen geçerli bir ürün adı ve fiyatı giriniz.");
    return;
  }

  const payload = { name: name, category: category, price: price, image_url: imageUrl || null };

  try {
    if (editId) {
      const { error } = await client.from("products").update(payload).eq("id", editId);
      if (error) throw error;
      alert("Ürün başarıyla güncellendi!");
    } else {
      payload.active = true;
      const { error } = await client.from("products").insert(payload);
      if (error) throw error;
      alert("Yeni ürün eklendi!");
    }

    resetProductForm();
    await loadManagementProducts();
    await loadProducts();

  } catch (err) {
    alert("Ürün kaydedilemedi: " + err.message);
  }
}

function editProduct(id) {
  const product = allManagementProducts.find(p => p.id === id);
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

async function toggleProductActive(id, currentActive) {
  try {
    const { error } = await client.from("products").update({ active: !currentActive }).eq("id", id);
    if (error) throw error;
    await loadManagementProducts();
    await loadProducts();
  } catch (err) {
    alert("Durum değiştirilemedi: " + err.message);
  }
}

// REÇETE DÜZENLEME MODAL FONKSİYONLARI
async function openRecipeModal(productId) {
  selectedRecipeProductId = productId;
  const product = allManagementProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("recipeModalTitle").textContent = `🧪 ${product.name} Reçetesi`;

  await loadIngredients();
  const select = document.getElementById("recipeIngSelect");
  if (select) {
    select.innerHTML = allIngredients.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.unit || 'gr')})</option>`).join("");
  }

  await renderRecipeItemsList();
  document.getElementById("recipeModal").style.display = "flex";
}

async function renderRecipeItemsList() {
  const container = document.getElementById("recipeItemsList");
  if (!container || !selectedRecipeProductId) return;

  try {
    const { data: recipes, error } = await client
      .from("recipes")
      .select("*, ingredients(name, unit)")
      .eq("product_id", selectedRecipeProductId);

    if (error) throw error;

    if (!recipes || recipes.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:15px; font-size:13px;">Bu ürüne henüz reçete bileşeni eklenmedi.</div>';
      return;
    }

    container.innerHTML = recipes.map(r => `
      <div class="recipe-item-row">
        <div>
          <strong>${escapeHtml(r.ingredients?.name || 'Malzeme')}</strong>: 
          <span style="color:var(--primary); font-weight:bold;">${r.quantity_required || r.quantity || 0} ${escapeHtml(r.unit || r.ingredients?.unit || 'gr')}</span>
        </div>
        <button type="button" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold;" onclick="deleteRecipeItem(${r.id})">Sil</button>
      </div>
    `).join("");

  } catch (err) {
    container.innerHTML = '<div style="color:#dc2626;">Reçete yüklenemedi.</div>';
  }
}

async function addRecipeItem() {
  const ingId = document.getElementById("recipeIngSelect").value;
  const qty = parseFloat(document.getElementById("recipeQtyInput").value);

  if (!ingId || isNaN(qty) || qty <= 0) {
    alert("Lütfen geçerli bir miktar giriniz.");
    return;
  }

  const ingObj = allIngredients.find(i => String(i.id) === String(ingId));
  const unitVal = ingObj ? (ingObj.unit || "gr") : "gr";

  try {
    const { error } = await client.from("recipes").insert({
      product_id: selectedRecipeProductId,
      ingredient_id: ingId,
      quantity: qty,
      quantity_required: qty,
      unit: unitVal
    });

    if (error) throw error;

    document.getElementById("recipeQtyInput").value = "";
    await renderRecipeItemsList();

  } catch (err) {
    alert("Reçete malzemesi eklenemedi: " + err.message);
  }
}

async function deleteRecipeItem(recipeId) {
  try {
    const { error } = await client.from("recipes").delete().eq("id", recipeId);
    if (error) throw error;
    await renderRecipeItemsList();
  } catch (err) {
    alert("Silinemedi: " + err.message);
  }
}

async function deductStockFromRecipe(orders) {
  try {
    for (const item of orders) {
      const { data: recipeItems, error } = await client
        .from("recipes")
        .select("ingredient_id, quantity_required, quantity")
        .eq("product_id", item.productId);

      if (error || !recipeItems) continue;

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
          await client
            .from("ingredients")
            .update({ stock_quantity: newStock })
            .eq("id", r.ingredient_id);
        }
      }
    }
  } catch (err) {
    console.error("Stok düşüş hatası:", err.message);
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

  if (target.id === "closeRecipeModalBtn") {
    e.preventDefault();
    document.getElementById("recipeModal").style.display = "none";
    return;
  }

  if (target.id === "closeReceiptDetailBtn") {
    e.preventDefault();
    document.getElementById("receiptDetailModal").style.display = "none";
    return;
  }

  if (target.id === "addRecipeItemBtn") {
    e.preventDefault();
    addRecipeItem();
    return;
  }

  if (target.id === "addPaymentMethodBtn") {
    e.preventDefault();
    addPaymentMethod();
    return;
  }

  if (target.id === "submitProductionBtn") {
    e.preventDefault();
    submitProductionEntry();
    return;
  }

  if (target.id === "runLogFilterBtn") {
    e.preventDefault();
    setActiveLogDateButton(null);
    loadStockMovements();
    return;
  }

  if (target.id === "runReportBtn") {
    e.preventDefault();
    document.querySelectorAll(".btn-date-filter").forEach(b => b.classList.remove("active-date-btn"));
    fetchAndRenderReports();
    return;
  }
});

// TIKLAMA VE ETKİLEŞİM DİNLENMELERİ
function bindEvents() {
  setupNavigation();

  // Malzemeler
  const saveIngBtn = document.getElementById("saveIngBtn");
  if (saveIngBtn) saveIngBtn.onclick = saveIngredientFromForm;

  const resetIngBtn = document.getElementById("resetIngFormBtn");
  if (resetIngBtn) resetIngBtn.onclick = resetIngForm;

  const searchIngInput = document.getElementById("searchIngInput");
  if (searchIngInput) {
    searchIngInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allIngredients.filter(i => i.name.toLowerCase().includes(q));
      renderIngredientsTable(filtered);
    };
  }

  // Ürünler
  const saveProdBtn = document.getElementById("saveProductBtn");
  if (saveProdBtn) saveProdBtn.onclick = saveProductFromForm;

  const resetProdBtn = document.getElementById("resetProductFormBtn");
  if (resetProdBtn) resetProdBtn.onclick = resetProdForm;

  const searchProdInput = document.getElementById("searchProductInput");
  if (searchProdInput) {
    searchProdInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allManagementProducts.filter(p => 
        p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
      );
      renderManagementProductsTable(filtered);
    };
  }

  // MASAYI KAPAT / ÖDEME AL
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

  // KASA AÇMA & KAPATMA
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
if (loginButton) loginButton.addEventListener("click", login);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    e.key === "Enter" && login();
  });
}
