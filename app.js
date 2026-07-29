/* KAPTAN NİLİ BULUT POS - KOMPLE FULL VE TEK PARÇA ÇALIŞAN SÜRÜM */

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

    // Tüm Tıklama ve Sayfa Dinleyicilerini Bağla
    bindEvents();
    
    // Verileri Yükle
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

// 2. SAYFA GEÇİŞLERİ (ÜRÜNLER, MALZEMELER, RAPORLAR, İNTERNET)
function showPage(pageName) {
  const pages = {
    tables: document.getElementById("pageTables") || document.querySelector(".page-tables"),
    ingredients: document.getElementById("pageIngredients") || document.querySelector(".page-ingredients"),
    internet: document.getElementById("pageInternet") || document.querySelector(".page-internet"),
    products: document.getElementById("pageProducts") || document.querySelector(".page-products"),
    reports: document.getElementById("pageReports") || document.querySelector(".page-reports")
  };

  Object.keys(pages).forEach(key => {
    if (pages[key]) pages[key].style.display = "none";
  });

  const activePage = pages[pageName] || pages.tables;
  if (activePage) activePage.style.display = "block";

  if (pageName === "tables") {
    renderTables();
    loadCashStatus();
    renderSales();
  } else if (pageName === "products") {
    loadProducts();
  }
}

function setupNavigation() {
  const allButtons = document.querySelectorAll("button, a");

  allButtons.forEach(btn => {
    const txt = (btn.textContent || "").trim().toUpperCase();

    if (txt.includes("ANA MENÜ")) {
      btn.onclick = (e) => { e.preventDefault(); showPage("tables"); };
    } else if (txt.includes("MALZEMELER")) {
      btn.onclick = (e) => { e.preventDefault(); showPage("ingredients"); };
    } else if (txt.includes("İNTERNET")) {
      btn.onclick = (e) => { e.preventDefault(); showPage("internet"); };
    } else if (txt.includes("ÜRÜNLER")) {
      btn.onclick = (e) => { e.preventDefault(); showPage("products"); };
    } else if (txt.includes("RAPORLAR")) {
      btn.onclick = (e) => { e.preventDefault(); showPage("reports"); };
    }
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
  const grid = document.getElementById("tablesGrid") || document.querySelector(".tables-grid");
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

// 4. KASA DURUMU VE İŞLEMLERİ
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

// 5. MASA SİPARİŞ PENCERESİ (MODAL)
async function openTableModal(tableId) {
  selectedTableId = tableId;
  const tables = getTables();
  const table = tables.find(t => t.id === tableId);
  if (!table) return;

  const tableModal = document.getElementById("tableModal");
  const modalName = document.getElementById("modalTableName");
  const closedView = document.getElementById("modalClosedView");
  const openView = document.getElementById("modalOpenView");

  if (modalName) modalName.textContent = table.name;

  if (table.status === "closed") {
    table.status = "open";
    table.openedAt = new Date().toISOString();
    table.total = 0;
    table.orders = [];
    saveTables(tables);
    renderTables();
  }

  if (closedView) closedView.style.display = "none";
  if (openView) openView.style.display = "block";

  await loadProducts();
  renderCart();
  
  if (tableModal) {
    tableModal.classList.add("show");
    tableModal.style.display = "flex";
  }
}

function closeTableModal() {
  const tableModal = document.getElementById("tableModal");
  if (tableModal) {
    tableModal.classList.remove("show");
    tableModal.style.display = "none";
  }
  renderTables();
}

// 6. ÜRÜNLER & KATEGORİLER
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
    grid.innerHTML = '<div class="loading">Bu kategoride ürün bulunamadı.</div>';
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
    cartList.innerHTML = '<div class="cart-empty">Henüz ürün eklenmedi.</div>';
    if (cartTotal) cartTotal.textContent = formatMoney(0);
    return;
  }

  table.orders.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div>
        <div class="cart-name">${escapeHtml(item.name)}</div>
        <div class="cart-sub">${formatMoney(item.price)} × ${item.quantity} = ${formatMoney(item.price * item.quantity)}</div>
      </div>
      <div class="cart-controls">
        <button class="qty-button qty-minus" type="button">−</button>
        <span class="qty-count">${item.quantity}</span>
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

// 7. ÖDEME ALMA VE MASAYI KAPATMA
function openPaymentModal() {
  const table = getTables().find(t => t.id === selectedTableId);
  const paymentModal = document.getElementById("paymentModal");
  const paymentTitle = document.getElementById("paymentTotalTitle");

  if (!table || !paymentModal) return;

  if (paymentTitle) {
    paymentTitle.innerHTML = `<strong>${escapeHtml(table.name)}</strong><br>Toplam: <strong>${formatMoney(table.total)}</strong>`;
  }

  const paymentInputs = document.querySelectorAll(".payment-input");
  paymentInputs.forEach(i => i.value = "0");

  updatePaymentSummary();
  paymentModal.classList.add("show");
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
  const completeBtn = document.getElementById("completePaymentButton");

  if (collectedElem) collectedElem.textContent = formatMoney(totalCollected);
  if (remainingElem) {
    const remaining = Math.max(tableTotal - totalCollected, 0);
    remainingElem.textContent = formatMoney(remaining);
  }

  if (completeBtn) {
    completeBtn.disabled = totalCollected + 0.01 < tableTotal;
  }
}

// 8. ANLIK SATIŞLAR TABLOSU
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

// OLAĞAN VE DİNAMİK BUTON BİND'LERİ
function bindEvents() {
  setupNavigation();

  // "KAYDET VE ANA MENÜ" VE "ANA MENÜYE DÖN" BUTONLARI
  const allButtons = document.querySelectorAll("button, a");
  allButtons.forEach(btn => {
    const txt = (btn.textContent || "").trim().toUpperCase();
    if (txt.includes("ANA MENÜYE DÖN") || txt.includes("KAYDET VE ANA MENÜ")) {
      btn.onclick = (e) => {
        e.preventDefault();
        closeTableModal();
      };
    }
  });

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

  const allCashBtn = document.getElementById("allCashButton");
  if (allCashBtn) {
    allCashBtn.onclick = () => {
      const table = getTables().find(t => t.id === selectedTableId);
      if (table) {
        const payCash = document.getElementById("payCash");
        if (payCash) payCash.value = Number(table.total || 0).toFixed(2);
        updatePaymentSummary();
      }
    };
  }

  const allCardBtn = document.getElementById("allCardButton");
  if (allCardBtn) {
    allCardBtn.onclick = () => {
      const table = getTables().find(t => t.id === selectedTableId);
      if (table) {
        const payCard = document.getElementById("payCard");
        if (payCard) payCard.value = Number(table.total || 0).toFixed(2);
        updatePaymentSummary();
      }
    };
  }

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

        alert("Satış başarıyla kaydedildi ve stoklar düşüldü!");

      } catch (err) {
        alert("Satış kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
      }
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

  const cancelTableBtn = document.getElementById("cancelTableButton");
  if (cancelTableBtn) cancelTableBtn.onclick = closeTableModal;

  const topCloseBtn = document.getElementById("topClosePanelButton");
  if (topCloseBtn) topCloseBtn.onclick = closeTableModal;
}

// İLK AÇILIŞ DİNLEYİCİLERİ
if (loginButton) loginButton.addEventListener("click", login);
if (logoutButton) logoutButton.addEventListener("click", logout);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}
