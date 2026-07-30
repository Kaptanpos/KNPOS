/* KAPTAN NİLİ BULUT POS - MASA EKLE, İSİM DEĞİŞTİR VE SİL ENTEGRELİ SÜRÜM */

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
let allManagementProducts = [];
let selectedCategory = "Tümü";

const TABLE_STORAGE_KEY = "knpos_tables_v1";
const DEFAULT_TABLES = [
  { id: 1, name: "Masa 01", status: "closed", orders: [], total: 0 },
  { id: 2, name: "Masa 02", status: "closed", orders: [], total: 0 },
  { id: 3, name: "Masa 03", status: "closed", orders: [], total: 0 },
  { id: 4, name: "Masa 04", status: "closed", orders: [], total: 0 },
  { id: 5, name: "Masa 05", status: "closed", orders: [], total: 0 }
];

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

// 2. SAYFA GEÇİŞLERİ
function showPage(pageName) {
  const pages = {
    tables: document.getElementById("pageTables"),
    ingredients: document.getElementById("pageIngredients"),
    internet: document.getElementById("pageInternet"),
    products: document.getElementById("pageProducts"),
    reports: document.getElementById("pageReports")
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
  });

  if (pageName === "tables") {
    renderTables();
    loadCashStatus();
    renderSales();
  } else if (pageName === "products") {
    loadManagementProducts();
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
    };
  });
}

// 3. MASA YÖNETİMİ (EKLE, İSİM DEĞİŞTİR, SİL)
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
  const newTable = {
    id: Date.now(),
    name: `Masa ${String(nextNum).padStart(2, "0")}`,
    status: "closed",
    orders: [],
    total: 0
  };

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

// 4. KASA DURUMU VE KONTROLÜ
async function loadCashStatus() {
  const cashStatus = document.getElementById("cashStatus");
  const openPanel = document.getElementById("openCashPanel");
  const closePanel = document.getElementById("closeCashPanel");

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
  
  if (tableModal) {
    tableModal.style.display = "flex";
  }
}

function closeTableModal() {
  const tableModal = document.getElementById("tableModal");
  if (tableModal) {
    tableModal.style.display = "none";
  }
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
      <div style="font-size:13px; color:#0f766e; font-weight:800; margin-top:2px;">${formatMoney(product.price)}</div>
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
        <div style="font-size:11px; color:#64748b;">${formatMoney(item.price)} × ${item.quantity} = ${formatMoney(item.price * item.quantity)}</div>
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

// 7. ÜRÜN YÖNETİMİ
async function loadManagementProducts() {
  try {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

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
      <td>
        <span class="${p.active ? 'badge-active' : 'badge-passive'}">
          ${p.active ? 'Aktif' : 'Pasif'}
        </span>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn-edit" onclick="editProduct(${p.id})">Düzenle</button>
        <button type="button" class="btn-toggle" onclick="toggleProductActive(${p.id}, ${p.active})">
          ${p.active ? 'Pasif Yap' : 'Aktif Yap'}
        </button>
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

  const payload = {
    name: name,
    category: category,
    price: price,
    image_url: imageUrl || null
  };

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
    const { error } = await client
      .from("products")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) throw error;
    await loadManagementProducts();
    await loadProducts();
  } catch (err) {
    alert("Durum değiştirilemedi: " + err.message);
  }
}

// 8. ÖDEME MODALI VE KAPATMA
function openPaymentModal() {
  const table = getTables().find(t => t.id === selectedTableId);
  const paymentModal = document.getElementById("paymentModal");
  const paymentTitle = document.getElementById("paymentTotalTitle");

  if (!table || !paymentModal) return;

  if (paymentTitle) {
    paymentTitle.innerHTML = `<strong>${escapeHtml(table.name)}</strong><br>Toplam Tutar: <strong>${formatMoney(table.total)}</strong>`;
  }

  document.getElementById("payCash").value = "0";
  document.getElementById("payCard").value = "0";

  updatePaymentSummary();
  paymentModal.style.display = "flex";
}

function updatePaymentSummary() {
  const table = getTables().find(t => t.id === selectedTableId);
  if (!table) return;

  const payCash = Number(document.getElementById("payCash")?.value || 0);
  const payCard = Number(document.getElementById("payCard")?.value || 0);
  const totalCollected = payCash + payCard;
  const tableTotal = Number(table.total || 0);

  const collectedElem = document.getElementById("collectedAmount");
  const remainingElem = document.getElementById("remainingAmount");

  if (collectedElem) collectedElem.textContent = formatMoney(totalCollected);
  if (remainingElem) {
    const remaining = Math.max(tableTotal - totalCollected, 0);
    remainingElem.textContent = formatMoney(remaining);
  }
}

// 9. ANLIK SATIŞLAR TABLOSU
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
    list.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Satışlar çekilemedi.</div>';
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
});

// TIKLAMA VE ETKİLEŞİM DİNLENMELERİ
function bindEvents() {
  setupNavigation();

  // Ürün Yönetimi
  const saveProdBtn = document.getElementById("saveProductBtn");
  if (saveProdBtn) saveProdBtn.onclick = saveProductFromForm;

  const resetProdBtn = document.getElementById("resetProductFormBtn");
  if (resetProdBtn) resetProdBtn.onclick = resetProductForm;

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

  // ÖDEME HESAPLAMA BUTONLARI
  const payCashInput = document.getElementById("payCash");
  const payCardInput = document.getElementById("payCard");
  if (payCashInput) payCashInput.oninput = updatePaymentSummary;
  if (payCardInput) payCardInput.oninput = updatePaymentSummary;

  const allCashBtn = document.getElementById("allCashButton");
  if (allCashBtn) {
    allCashBtn.onclick = () => {
      const table = getTables().find(t => t.id === selectedTableId);
      if (table && payCashInput) {
        payCashInput.value = Number(table.total || 0).toFixed(2);
        if (payCardInput) payCardInput.value = "0";
        updatePaymentSummary();
      }
    };
  }

  const allCardBtn = document.getElementById("allCardButton");
  if (allCardBtn) {
    allCardBtn.onclick = () => {
      const table = getTables().find(t => t.id === selectedTableId);
      if (table && payCardInput) {
        payCardInput.value = Number(table.total || 0).toFixed(2);
        if (payCashInput) payCashInput.value = "0";
        updatePaymentSummary();
      }
    };
  }

  // SATIŞI TAMAMLA
  const completeBtn = document.getElementById("completePaymentButton");
  if (completeBtn) {
    completeBtn.onclick = async () => {
      const tables = getTables();
      const table = tables.find(t => t.id === selectedTableId);
      if (!table) return;

      try {
        const { data: sale, error: saleErr } = await client
          .from("sales")
          .insert({ total_amount: Number(table.total), payment_type: "Nakit / Kart" })
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

        alert("Satış başarıyla kaydedildi!");

      } catch (err) {
        alert("Satış kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
      }
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
    if (e.key === "Enter") login();
  });
}
