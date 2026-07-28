/*
      KENDİ SUPABASE BİLGİLERİNİ
      AŞAĞIDAKİ İKİ ALANA YAPIŞTIR.
    */

    const SUPABASE_URL =
      "https://stytmmafrrtqaxobihap.supabase.co";

    const SUPABASE_KEY =
      "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

    const client = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const loginScreen =
      document.getElementById("loginScreen");

    const appShell =
      document.getElementById("appShell");

    const loginUser =
      document.getElementById("loginUser");

    const loginPassword =
      document.getElementById("loginPassword");

    const loginButton =
      document.getElementById("loginButton");

    const logoutButton =
      document.getElementById("logoutButton");

    const addTableButton = document.getElementById("addTableButton");
    const tableManagementModal = document.getElementById("tableManagementModal");
    const closeTableManagementButton = document.getElementById("closeTableManagementButton");
    const saveNewTableButton = document.getElementById("saveNewTableButton");
    const newTableNameInput = document.getElementById("newTableNameInput");
    const tableManagementList = document.getElementById("tableManagementList");

    let currentCashSession = null;
    let currentAuthUser = null;
    let currentProfile = null;
    let selectedTableId = null;
    let saleProducts = [];
    let selectedCategory = "Tümü";
    let selectedPayment = null;

    const TABLE_STORAGE_KEY = "knpos_tables_v1";
    const SALES_STORAGE_KEY = "knpos_sales_v1";
    let activeSalesFilter = "today";
    const DEFAULT_TABLES = [
      { id: 1, name: "Masa 1", status: "closed", openedAt: null, total: 0 },
      { id: 2, name: "Masa 2", status: "closed", openedAt: null, total: 0 },
      { id: 3, name: "Masa 3", status: "closed", openedAt: null, total: 0 },
      { id: 4, name: "Masa 4", status: "closed", openedAt: null, total: 0 },
      { id: 5, name: "Masa 5", status: "closed", openedAt: null, total: 0 }
    ];
    let editingProductId = null;
    let currentProductImageUrl = null;

    const saveButton =
      document.getElementById("saveButton");

    const refreshProductsButton =
      document.getElementById("refreshProductsButton");

    const cancelEditButton =
      document.getElementById("cancelEditButton");

    const productImageInput =
      document.getElementById("productImage");

    const photoPreview =
      document.getElementById("photoPreview");

    const openCashButton =
      document.getElementById("openCashButton");

    const closeCashButton =
      document.getElementById("closeCashButton");

    const refreshCashButton =
      document.getElementById("refreshCashButton");

    const tableModal =
      document.getElementById("tableModal");

    const openTableButton =
      document.getElementById("openTableButton");

    const closeTableButton =
      document.getElementById("closeTableButton");

    const printReceiptButton =
      document.getElementById("printReceiptButton");

    const cancelTableButton =
      document.getElementById("cancelTableButton");

    const cancelTableButtonClosed =
      document.getElementById("cancelTableButtonClosed");

    const productSearch = document.getElementById("productSearch");
    const paymentModal = document.getElementById("paymentModal");
    const paymentInputs = Array.from(document.querySelectorAll(".payment-input"));
    const completePaymentButton = document.getElementById("completePaymentButton");

    const topClosePanelButton =
      document.getElementById("topClosePanelButton");

    openTableButton.addEventListener(
      "click",
      openSelectedTable
    );

    closeTableButton.addEventListener(
      "click",
      closeSelectedTable
    );

    printReceiptButton.addEventListener(
      "click",
      printSelectedTableReceipt
    );

    cancelTableButton.addEventListener(
      "click",
      closeTableModal
    );

    topClosePanelButton.addEventListener(
      "click",
      closeTableModal
    );

    cancelTableButtonClosed.addEventListener(
      "click",
      closeTableModal
    );

    productSearch.addEventListener("input",renderSaleProducts);
    paymentInputs.forEach(i=>i.addEventListener("input",updatePaymentSummary));
    document.getElementById("allCashButton").addEventListener("click",()=>fillSinglePayment("payCash"));
    document.getElementById("allCardButton").addEventListener("click",()=>fillSinglePayment("payCard"));
    completePaymentButton.addEventListener("click",completePayment);
    document.getElementById("cancelPaymentButton").addEventListener("click",()=>paymentModal.classList.remove("show"));
    const applyReportDatesButton = document.getElementById("applyReportDates");
    if (applyReportDatesButton) applyReportDatesButton.addEventListener("click", renderReports);

    const reportViewSelect = document.getElementById("reportViewSelect");
    if (reportViewSelect) reportViewSelect.addEventListener("change", () => {
      setActiveReportView(reportViewSelect.value);
    });
    const printCurrentReportButton = document.getElementById("printCurrentReport");
    if (printCurrentReportButton) printCurrentReportButton.addEventListener("click", printCurrentReport);
    const emailCurrentReportButton = document.getElementById("emailCurrentReport");
    if (emailCurrentReportButton) emailCurrentReportButton.addEventListener("click", emailCurrentReport);
    const backFromReportsButton = document.getElementById("backFromReports");
    if (backFromReportsButton) backFromReportsButton.addEventListener("click", () => showPage("tables"));
    if (addTableButton) addTableButton.addEventListener("click", openTableManagement);
    if (closeTableManagementButton) closeTableManagementButton.addEventListener("click", closeTableManagement);
    if (saveNewTableButton) saveNewTableButton.addEventListener("click", addNewTable);
    if (newTableNameInput) newTableNameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") addNewTable();
    });
    if (tableManagementModal) tableManagementModal.addEventListener("click", event => {
      if (event.target === tableManagementModal) closeTableManagement();
    });


    tableModal.addEventListener(
      "click",
      event => {
        if (event.target === tableModal) {
          closeTableModal();
        }
      }
    );

    loginButton.addEventListener(
      "click",
      login
    );

    logoutButton.addEventListener(
      "click",
      logout
    );

    loginPassword.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          login();
        }
      }
    );

    saveButton.addEventListener(
      "click",
      saveProduct
    );

    cancelEditButton.addEventListener(
      "click",
      cancelEdit
    );

    productImageInput.addEventListener(
      "change",
      previewSelectedImage
    );

    refreshProductsButton.addEventListener(
      "click",
      loadProducts
    );

    openCashButton.addEventListener(
      "click",
      openCash
    );

    closeCashButton.addEventListener(
      "click",
      closeCash
    );

    refreshCashButton.addEventListener(
      "click",
      async () => {
        await loadCashStatus();
        await loadCashHistory();
      }
    );


    function translateLoginError(message) {
      const value = String(message || "").toLowerCase();

      if (value.includes("invalid login credentials")) {
        return "Kullanıcı veya şifre hatalı.";
      }

      if (value.includes("email not confirmed")) {
        return "Kullanıcı hesabı henüz onaylanmamış.";
      }

      if (value.includes("failed to fetch")) {
        return "Sunucuya bağlanılamadı. İnternet bağlantısını kontrol edin.";
      }

      return message || "Giriş yapılamadı.";
    }

    async function login() {
      const email = loginUser.value;
      const password = loginPassword.value;

      if (!email) {
        showMessage(
          "loginMessage",
          "Lütfen kullanıcı seçiniz.",
          "error"
        );
        return;
      }

      if (!password) {
        showMessage(
          "loginMessage",
          "Lütfen şifrenizi giriniz.",
          "error"
        );
        return;
      }

      setButtonLoading(
        loginButton,
        true,
        "GİRİŞ YAPILIYOR...",
        "GİRİŞ YAP"
      );

      try {
        const { data, error } =
          await client.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          throw error;
        }

        await activateUser(data.user);

      } catch (error) {
        showMessage(
          "loginMessage",
          translateLoginError(error.message),
          "error"
        );

      } finally {
        setButtonLoading(
          loginButton,
          false,
          "GİRİŞ YAPILIYOR...",
          "GİRİŞ YAP"
        );
      }
    }

    async function logout() {
      const confirmed = confirm(
        "Oturumu kapatmak istediğinize emin misiniz?"
      );

      if (!confirmed) {
        return;
      }

      await client.auth.signOut();
      showLogin();
    }

    async function activateUser(user) {
      if (!user) {
        showLogin();
        return;
      }

      const { data: profile, error } =
        await client
          .from("profiles")
          .select("id, full_name, role, active")
          .eq("id", user.id)
          .single();

      if (error || !profile) {
        await client.auth.signOut();
        showLogin();

        showMessage(
          "loginMessage",
          "Kullanıcının profil kaydı bulunamadı.",
          "error"
        );
        return;
      }

      if (!profile.active) {
        await client.auth.signOut();
        showLogin();

        showMessage(
          "loginMessage",
          "Bu kullanıcı hesabı pasif durumdadır.",
          "error"
        );
        return;
      }

      currentAuthUser = user;
      currentProfile = profile;

      document.getElementById("currentUserName").textContent =
        profile.full_name;

      document.getElementById("currentUserRole").textContent =
        profile.role === "admin"
          ? "👑 Yetkili"
          : "👤 Garson";

      // Yetkiye bağlı tüm menüleri ve Masa Yönetimi düğmesini birlikte güncelle.
      // Önceki sürümde yalnızca Ürünler/Raporlar görünürlüğü değiştiği için
      // Masa Yönetimi düğmesi CSS'teki display:none durumunda kalıyordu.
      updateMenuByRole();

      loginPassword.value = "";
      loginScreen.style.display = "none";
      appShell.style.display = "block";

      const requestedPage = new URLSearchParams(window.location.search).get("page") || window.location.hash.replace("#", "");
      const allowedPages = ["tables", "products", "reports", "internet"];
      showPage(allowedPages.includes(requestedPage) ? requestedPage : "tables");
      await loadCashStatus();
    }

    function showLogin() {
      currentAuthUser = null;
      currentProfile = null;
      appShell.style.display = "none";
      loginScreen.style.display = "flex";
      loginPassword.value = "";
    }

    async function initializeAuth() {
      const {
        data: { session }
      } = await client.auth.getSession();

      if (session?.user) {
        await activateUser(session.user);
      } else {
        showLogin();
      }

      client.auth.onAuthStateChange(
        async (event, sessionData) => {
          if (
            event === "SIGNED_OUT" ||
            !sessionData
          ) {
            showLogin();
          }
        }
      );
    }
      function updateMenuByRole() {
  const isAdmin = currentProfile && currentProfile.role === "admin";
  if (addTableButton) addTableButton.style.display = isAdmin ? "inline-flex" : "none";
  ["navProducts", "navReports"].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.style.display = isAdmin ? "" : "none";
  });
}

    function showPage(pageName) {
      const adminOnlyPages = ["products", "reports"];

      if (adminOnlyPages.includes(pageName) && (!currentProfile || currentProfile.role !== "admin")) {
        alert("Bu bölüm yalnızca yetkili kullanıcıya açıktır.");
        pageName = "tables";
      }

      document.querySelectorAll(".page").forEach(page => page.classList.remove("active-page"));
      document.querySelectorAll(".nav button").forEach(button => button.classList.remove("active-nav"));

      const pageMap = {
        tables: ["pageTables", "navTables"],
        products: ["pageProducts", "navProducts"],
        reports: ["pageReports", "navReports"],
        internet: ["pageInternet", "navInternet"]
      };
      const target = pageMap[pageName] || pageMap.tables;
      const page = document.getElementById(target[0]);
      const navButton = document.getElementById(target[1]);
      if (page) page.classList.add("active-page");
      if (navButton) navButton.classList.add("active-nav");

      if (pageName === "tables") {
        renderTables();
        loadCashStatus();
        loadCashHistory();
        renderSales();
      }
      if (pageName === "products") loadProducts();
      if (pageName === "reports") renderReports();
    }

    function getTables() {
      try {
        const saved =
          JSON.parse(localStorage.getItem(TABLE_STORAGE_KEY));

        if (Array.isArray(saved) && saved.length > 0) {
          return saved.map(table => ({
            ...table,
            orders: Array.isArray(table.orders)
              ? table.orders
              : [],
            payment: table.payment || null,
            active: table.active !== false
          }));
        }
      } catch (_) {
        // Bozuk kayıt varsa varsayılan masalar kullanılır.
      }

      saveTables(DEFAULT_TABLES);
      return JSON.parse(JSON.stringify(DEFAULT_TABLES));
    }

    function saveTables(tables) {
      localStorage.setItem(
        TABLE_STORAGE_KEY,
        JSON.stringify(tables)
      );
    }

    function renderTables() {
      const grid = document.getElementById("tablesGrid");
      if (!grid) return;

      const tables = getTables();
      const isAdmin = currentProfile && currentProfile.role === "admin";
      grid.innerHTML = "";

      tables.filter(table => table.active !== false).forEach(table => {
        const wrapper = document.createElement("div");
        wrapper.className = "table-card-wrap";

        const button = document.createElement("button");
        button.type = "button";
        button.className = `table-card ${table.status}`;
        const tableNumber = String(table.name || "").replace(/[^0-9]/g, "") || escapeHtml(table.name);
        button.setAttribute("aria-label", `${escapeHtml(table.name)} ${table.status === "open" ? "açık" : "kapalı"}`);
        button.innerHTML = `
          <div class="table-number">${String(tableNumber).padStart(2, "0")}</div>
          ${table.status === "open" ? `<div class="table-total">${formatMoney(table.total)}</div>` : ""}
        `;
        button.addEventListener("click", () => openTableModal(table.id));
        wrapper.appendChild(button);

        grid.appendChild(wrapper);
      });
    }

    function openTableManagement() {
      if (!currentProfile || currentProfile.role !== "admin") {
        alert("Masa yönetimi yalnızca yetkili kullanıcıya açıktır.");
        return;
      }
      renderTableManagement();
      tableManagementModal.classList.add("show");
      setTimeout(() => newTableNameInput && newTableNameInput.focus(), 50);
    }

    function closeTableManagement() {
      if (tableManagementModal) tableManagementModal.classList.remove("show");
      if (newTableNameInput) newTableNameInput.value = "";
    }

    function renderTableManagement() {
      if (!tableManagementList) return;
      const tables = getTables();
      tableManagementList.innerHTML = "";
      tables.forEach((table, index) => {
        const row = document.createElement("div");
        row.className = `table-management-row ${table.active === false ? "inactive" : ""}`;
        row.innerHTML = `
          <div class="table-management-order">${index + 1}</div>
          <div class="table-management-name">
            <strong>${escapeHtml(table.name)}</strong>
            <span>${table.active === false ? "Pasif" : "Aktif"} · ${table.status === "open" ? "Açık" : "Kapalı"}</span>
          </div>
          <div class="table-management-actions">
            <button type="button" class="table-mini-button" data-action="rename">ADINI DEĞİŞTİR</button>
            <button type="button" class="table-mini-button" data-action="toggle">${table.active === false ? "AKTİF YAP" : "PASİF YAP"}</button>
            <button type="button" class="table-mini-button danger" data-action="delete">SİL</button>
          </div>`;
        row.querySelector('[data-action="rename"]').addEventListener("click", () => renameTable(table.id));
        row.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleTableActive(table.id));
        row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTable(table.id));
        tableManagementList.appendChild(row);
      });
    }

    function addNewTable() {
      if (!currentProfile || currentProfile.role !== "admin") {
        alert("Yeni masa ekleme işlemi yalnızca yetkili kullanıcıya açıktır.");
        return;
      }
      const tables = getTables();
      const cleanName = (newTableNameInput ? newTableNameInput.value : "").trim();
      if (!cleanName) {
        alert("Masa adı boş bırakılamaz.");
        if (newTableNameInput) newTableNameInput.focus();
        return;
      }
      if (tables.some(table => String(table.name).trim().toLocaleLowerCase("tr-TR") === cleanName.toLocaleLowerCase("tr-TR"))) {
        alert("Bu isimde bir masa zaten var.");
        return;
      }
      const nextId = tables.reduce((max, table) => Math.max(max, Number(table.id) || 0), 0) + 1;
      tables.push({ id: nextId, name: cleanName, active: true, status: "closed", openedAt: null, total: 0, orders: [], payment: null });
      saveTables(tables);
      if (newTableNameInput) newTableNameInput.value = "";
      renderTables();
      renderTableManagement();
      if (newTableNameInput) newTableNameInput.focus();
    }

    function renameTable(tableId) {
      const tables = getTables();
      const table = tables.find(item => item.id === tableId);
      if (!table) return;
      const name = prompt("Masanın yeni adını yazınız:", table.name);
      if (name === null) return;
      const cleanName = name.trim();
      if (!cleanName) {
        alert("Masa adı boş bırakılamaz.");
        return;
      }
      table.name = cleanName;
      saveTables(tables);
      renderTables();
      renderTableManagement();
    }

    function toggleTableActive(tableId) {
      const tables = getTables();
      const table = tables.find(item => item.id === tableId);
      if (!table) return;
      if (table.active !== false && (table.status === "open" || (Array.isArray(table.orders) && table.orders.length > 0))) {
        alert("Açık veya sipariş bulunan masa pasif yapılamaz. Önce masayı kapatınız.");
        return;
      }
      table.active = table.active === false;
      saveTables(tables);
      renderTables();
      renderTableManagement();
    }

    function deleteTable(tableId) {
      const tables = getTables();
      const table = tables.find(item => item.id === tableId);
      if (!table) return;
      if (table.status === "open" || (Array.isArray(table.orders) && table.orders.length > 0)) {
        alert("Açık veya sipariş bulunan masa silinemez. Önce masayı kapatınız.");
        return;
      }
      if (!confirm(`${table.name} silinsin mi?`)) return;
      const remaining = tables.filter(item => item.id !== tableId);
      if (remaining.length === 0) {
        alert("En az bir masa kalmalıdır.");
        return;
      }
      saveTables(remaining);
      renderTables();
      renderTableManagement();
    }

    async function openTableModal(tableId) {
      await loadCashStatus();
      if(!currentCashSession){alert("Satış yapabilmek için önce kasayı açınız.");showPage("tables");return;}
      selectedTableId = tableId;
      selectedPayment = null;

      const table =
        getTables().find(item => item.id === tableId);

      if (!table) {
        return;
      }

      document.getElementById("modalTableName").textContent =
        table.name;

      const closedView =
        document.getElementById("modalClosedView");

      const openView =
        document.getElementById("modalOpenView");

      // One Touch: kapalı masa ara ekran göstermeden otomatik açılır.
      if (table.status === "closed") {
        const tables = getTables();
        const current = tables.find(item => item.id === tableId);
        if (current) {
          current.status = "open";
          current.openedAt = new Date().toISOString();
          current.total = 0;
          current.orders = [];
          current.payment = null;
          saveTables(tables);
          renderTables();
        }
      }

      closedView.style.display = "none";
      openView.style.display = "block";
      productSearch.value = "";
      selectedCategory = "Tümü";
      await loadSaleProducts();
      renderCart();
      tableModal.classList.add("show");
    }

    function closeTableModal() {
      selectedTableId = null;
      tableModal.classList.remove("show");
      renderTables();
      showPage("tables");
    }

    function openSelectedTable() {
      const tables = getTables();

      const table =
        tables.find(item => item.id === selectedTableId);

      if (!table) {
        return;
      }

      table.status = "open";
      table.openedAt = new Date().toISOString();
      table.total = 0;
      table.orders = [];
      table.payment = null;

      saveTables(tables);
      renderTables();
      openTableModal(table.id);
    }

    function closeSelectedTable(){const table=getCurrentTable();if(!table)return;if(!table.orders||table.orders.length===0){alert("Masayı kapatmadan önce en az bir ürün ekleyiniz.");return;}openPaymentModal();}


    function getSales(){try{const s=JSON.parse(localStorage.getItem(SALES_STORAGE_KEY));return Array.isArray(s)?s:[]}catch(_){return[]}}
    function saveSales(s){localStorage.setItem(SALES_STORAGE_KEY,JSON.stringify(s))}
    function getPayments(){return{cash:+payCash.value||0,card:+payCard.value||0,yemeksepeti:+payYemeksepeti.value||0,getir:+payGetir.value||0,trendyol:+payTrendyol.value||0,kaptannili:+payKaptanNili.value||0}}
    function openPaymentModal(){const t=getCurrentTable();if(!t)return;paymentTotalTitle.innerHTML=`<strong>${escapeHtml(t.name)}</strong><br>Toplam: <strong>${formatMoney(t.total)}</strong>`;paymentInputs.forEach(i=>i.value="0");printAfterPayment.checked=false;updatePaymentSummary();paymentModal.classList.add("show")}
    function fillSinglePayment(id){const t=getCurrentTable();paymentInputs.forEach(i=>i.value="0");document.getElementById(id).value=Number(t.total||0).toFixed(2);updatePaymentSummary()}
    function updatePaymentSummary(){const t=getCurrentTable();if(!t)return;const p=getPayments(),c=Object.values(p).reduce((a,b)=>a+b,0),total=+t.total||0,rem=Math.max(total-c,0),chg=Math.max(c-total,0);collectedAmount.textContent=formatMoney(c);remainingAmount.textContent=formatMoney(rem);remainingAmount.className=rem<=.009?"remaining-ok":"remaining-bad";changeAmount.textContent=formatMoney(chg);completePaymentButton.disabled=c+.009<total}
    function paymentLabel(k){return({cash:"Nakit",card:"Kredi Kartı",yemeksepeti:"Yemeksepeti",getir:"Getir",trendyol:"Trendyol",kaptannili:"KaptanNili.com"})[k]||k}
    async function completePayment() {
  const t = getCurrentTable();

  if (!t) return;

  const p = getPayments();

  const c = Object.values(p).reduce(
    (a, b) => a + Number(b || 0),
    0
  );

  if (c + 0.009 < Number(t.total)) {
    alert("Tahsilat toplamı yetersiz.");
    return;
  }

  try {
    const { data: sale, error: saleError } = await client
      .from("sales")
      .insert({
        total_amount: Number(t.total),
        payment_type: Object.entries(p)
          .filter(([, value]) => Number(value) > 0)
          .map(([key]) => paymentLabel(key))
          .join(" + ")
      })
      .select("id")
      .single();

    if (saleError) throw saleError;

    const saleItems = (t.orders || []).map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      line_total:
        Number(item.quantity) * Number(item.price)
    }));

    const { error: itemsError } = await client
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw itemsError;

    const localSale = {
      id: sale.id,
      createdAt: new Date().toISOString(),
      tableName: t.name,
      total: Number(t.total),
      payments: p,
      items: (t.orders || []).map(item => ({ ...item }))
    };

    const sales = getSales();
    sales.unshift(localSale);
    saveSales(sales);

    if (printAfterPayment.checked) {
      printReceiptForSale(localSale);
    }

    const tables = getTables();

    const table = tables.find(
      item => item.id === selectedTableId
    );

    Object.assign(table, {
      status: "closed",
      openedAt: null,
      total: 0,
      orders: [],
      payment: null
    });

    saveTables(tables);

    paymentModal.classList.remove("show");
    closeTableModal();
    renderTables();
    renderSales();
    renderReports();

    alert(
      `Satış başarıyla kaydedildi.\n` +
      `${localSale.tableName}\n` +
      `${formatMoney(localSale.total)}`
    );
  } catch (error) {
    console.error(error);

    alert(
      "Satış kaydedilemedi:\n" +
      (error.message || "Bilinmeyen hata")
    );
  }
}
    function printReceiptForSale(s){const rows=s.items.map(i=>`<div class="receipt-row"><span>${i.quantity} x ${escapeHtml(i.name)}</span><span>${formatMoney(i.quantity*i.price)}</span></div>`).join("");printReceipt.innerHTML=`<div class="receipt-title">KAPTAN NİLİ</div><div style="text-align:center">ADİSYON</div><div class="receipt-line"></div><div class="receipt-row"><span>Satış No</span><strong>${s.id}</strong></div><div class="receipt-row"><span>Masa</span><strong>${escapeHtml(s.tableName)}</strong></div><div class="receipt-row"><span>Tarih</span><span>${formatDate(s.createdAt)}</span></div><div class="receipt-line"></div>${rows}<div class="receipt-line"></div><div class="receipt-row"><strong>TOPLAM</strong><strong>${formatMoney(s.total)}</strong></div><div class="receipt-line"></div><div style="text-align:center;font-size:12px">KNPOS v2.0.0</div>`;window.print()}
    function inRange(v,r){const d=new Date(v),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());if(r==="today")return d>=t;if(r==="yesterday"){const y=new Date(t-86400000);return d>=y&&d<t}if(r==="week"){const day=(n.getDay()+6)%7;return d>=new Date(t-day*86400000)}if(r==="month")return d>=new Date(n.getFullYear(),n.getMonth(),1);return true}
    function payText(p){return Object.entries(p||{}).filter(([,v])=>+v>0).map(([k,v])=>`${paymentLabel(k)}: ${formatMoney(v)}`).join(" • ")}
    async function loadCloudSales() {
  const { data: sales, error: salesError } = await client
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false });

  if (salesError) {
    throw salesError;
  }

  const { data: saleItems, error: itemsError } = await client
    .from("sale_items")
    .select(`
      sale_id,
      product_id,
      quantity,
      unit_price,
      line_total
    `);

  if (itemsError) {
    throw itemsError;
  }

  const { data: products, error: productsError } = await client
    .from("products")
    .select("id, name, category");

  if (productsError) {
    throw productsError;
  }

  const productInfo = {};

  (products || []).forEach(product => {
    productInfo[product.id] = {
      name: product.name,
      category: product.category || "Diğer"
    };
  });

  return (sales || []).map(sale => {
    const items = (saleItems || [])
      .filter(item => item.sale_id === sale.id)
      .map(item => ({
        productId: item.product_id,
        name:
          (productInfo[item.product_id] && productInfo[item.product_id].name) ||
          "Silinmiş ürün",
        category:
          (productInfo[item.product_id] && productInfo[item.product_id].category) ||
          "Diğer",
        quantity: Number(item.quantity || 0),
        price: Number(item.unit_price || 0),
        lineTotal: Number(
          item.line_total ||
          Number(item.quantity || 0) *
          Number(item.unit_price || 0)
        )
      }));

    return {
      id: sale.id,
      createdAt: sale.created_at,
      tableName: "-",
      total: Number(sale.total_amount || 0),
      paymentType: sale.payment_type || "-",
      items
    };
  });
}



function getSalesChartBuckets(sales, range) {
  const now = new Date();

  if (range === "today" || range === "yesterday") {
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      label: `${String(index * 2).padStart(2, "0")}:00`,
      value: 0
    }));

    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const bucketIndex = Math.min(11, Math.floor(date.getHours() / 2));
      buckets[bucketIndex].value += Number(sale.total || 0);
    });

    return buckets;
  }

  if (range === "week") {
    const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    const monday = new Date(now);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);

    const buckets = dayNames.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return { label, value: 0, key: date.toDateString() };
    });

    sales.forEach(sale => {
      const key = new Date(sale.createdAt).toDateString();
      const bucket = buckets.find(item => item.key === key);
      if (bucket) bucket.value += Number(sale.total || 0);
    });

    return buckets;
  }

  if (range === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const groupSize = Math.max(1, Math.ceil(daysInMonth / 10));
    const buckets = [];

    for (let startDay = 1; startDay <= daysInMonth; startDay += groupSize) {
      const endDay = Math.min(daysInMonth, startDay + groupSize - 1);
      buckets.push({
        label: startDay === endDay ? String(startDay) : `${startDay}-${endDay}`,
        value: 0,
        startDay,
        endDay
      });
    }

    sales.forEach(sale => {
      const dayOfMonth = new Date(sale.createdAt).getDate();
      const bucket = buckets.find(item => dayOfMonth >= item.startDay && dayOfMonth <= item.endDay);
      if (bucket) bucket.value += Number(sale.total || 0);
    });

    return buckets;
  }

  const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" });
  const monthMap = new Map();

  [...sales]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach(sale => {
      const date = new Date(sale.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { label: monthFormatter.format(date), value: 0 });
      }
      monthMap.get(key).value += Number(sale.total || 0);
    });

  return Array.from(monthMap.values()).slice(-12);
}

function renderColumnChart(element, data, options = {}) {
  if (!element) return;

  const cleanData = data.filter(item => Number.isFinite(Number(item.value)));
  if (!cleanData.length || cleanData.every(item => Number(item.value) === 0)) {
    element.innerHTML = '<div class="loading">Bu dönem için grafik verisi yok.</div>';
    return;
  }

  const maxValue = Math.max(...cleanData.map(item => Number(item.value)), 1);
  const topValue = Math.ceil(maxValue / 100) * 100 || maxValue;
  const formatValue = options.formatValue || (value => formatMoney(value));

  element.innerHTML = `
    <div class="column-chart" role="img" aria-label="${escapeHtml(options.ariaLabel || "Satış grafiği")}">
      <div class="chart-y-axis">
        <span>${formatValue(topValue)}</span>
        <span>${formatValue(topValue / 2)}</span>
        <span>${formatValue(0)}</span>
      </div>
      <div class="chart-plot">
        <div class="chart-grid-line chart-grid-top"></div>
        <div class="chart-grid-line chart-grid-middle"></div>
        <div class="chart-grid-line chart-grid-bottom"></div>
        <div class="chart-columns">
          ${cleanData.map(item => {
            const height = Math.max(3, (Number(item.value) / topValue) * 100);
            return `
              <div class="chart-column-item" title="${escapeHtml(item.label)}: ${escapeHtml(formatValue(item.value))}">
                <div class="chart-value-label">${Number(item.value) > 0 ? formatValue(item.value) : ""}</div>
                <div class="chart-column-wrap">
                  <div class="chart-column" style="height:${height}%"></div>
                </div>
                <div class="chart-x-label">${escapeHtml(item.label)}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderHorizontalChart(element, data, options = {}) {
  if (!element) return;
  const cleanData = data.filter(item => Number(item.value) > 0);
  if (!cleanData.length) {
    element.innerHTML = '<div class="loading">Bu dönem için grafik verisi yok.</div>';
    return;
  }

  const maxValue = Math.max(...cleanData.map(item => Number(item.value)), 1);
  const formatValue = options.formatValue || (value => formatMoney(value));

  element.innerHTML = `
    <div class="horizontal-chart" role="img" aria-label="${escapeHtml(options.ariaLabel || "Karşılaştırma grafiği")}">
      ${cleanData.map((item, index) => {
        const width = Math.max(4, (Number(item.value) / maxValue) * 100);
        return `
          <div class="horizontal-chart-row">
            <div class="horizontal-chart-label">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(formatValue(item.value))}</strong>
            </div>
            <div class="horizontal-chart-track">
              <div class="horizontal-chart-bar" style="width:${width}%">
                <span>${index + 1}</span>
              </div>
            </div>
            ${item.note ? `<div class="horizontal-chart-note">${escapeHtml(item.note)}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPieChart(element, data, options = {}) {
  if (!element) return;

  const cleanData = data
    .map(item => ({ ...item, value: Number(item.value || 0) }))
    .filter(item => item.value > 0);

  if (!cleanData.length) {
    element.innerHTML = '<div class="loading">Bu dönem için grafik verisi yok.</div>';
    return;
  }

  const total = cleanData.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    "#0f766e", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed",
    "#0891b2", "#65a30d", "#db2777", "#475569", "#ea580c",
    "#4f46e5", "#16a34a"
  ];

  let cursor = 0;
  const segments = cleanData.map((item, index) => {
    const start = cursor;
    const percent = (item.value / total) * 100;
    cursor += percent;
    return `${colors[index % colors.length]} ${start.toFixed(3)}% ${cursor.toFixed(3)}%`;
  }).join(", ");

  const formatValue = options.formatValue || (value => formatMoney(value));
  const centerText = options.centerText || formatValue(total);

  element.innerHTML = `
    <div class="pie-report" role="img" aria-label="${escapeHtml(options.ariaLabel || "Pasta grafik")}">
      <div class="pie-chart-wrap">
        <div class="pie-chart" style="background:conic-gradient(${segments})">
          <div class="pie-chart-center">
            <span>Toplam</span>
            <strong>${escapeHtml(centerText)}</strong>
          </div>
        </div>
      </div>
      <div class="pie-legend">
        ${cleanData.map((item, index) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return `
            <div class="pie-legend-row">
              <span class="pie-legend-color" style="background:${colors[index % colors.length]}"></span>
              <span class="pie-legend-name">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(formatValue(item.value))}</strong>
              <span class="pie-legend-percent">%${percent.toFixed(1)}</span>
              ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function toLocalDateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTimeOnly(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDayOnly(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function getSelectedReportRange() {
  const today = new Date();
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");

  if (startInput && !startInput.value) startInput.value = toLocalDateInputValue(today);
  if (endInput && !endInput.value) endInput.value = toLocalDateInputValue(today);

  const start = new Date(`${startInput.value}T00:00:00`);
  const end = new Date(`${endInput.value}T23:59:59.999`);

  return { start, end };
}

function isSaleInDateRange(sale, start, end) {
  const value = new Date(sale.createdAt);
  return value >= start && value <= end;
}

function renderSimpleReportTable(element, headers, rows, emptyText) {
  if (!element) return;
  if (!rows.length) {
    element.innerHTML = `<div class="loading">${escapeHtml(emptyText)}</div>`;
    return;
  }

  element.innerHTML = `
    <div class="report-data-table" style="--report-columns:${headers.length}">
      <div class="report-data-row report-data-header">
        ${headers.map(header => `<div>${escapeHtml(header)}</div>`).join("")}
      </div>
      ${rows.map(row => `
        <div class="report-data-row">
          ${row.map(cell => `<div>${cell}</div>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

async function renderSales() {
  const list = document.getElementById("salesList");
  const totalElement = document.getElementById("salesDailyTotal");
  const dateElement = document.getElementById("dailySalesDate");

  list.className = "loading";
  list.textContent = "Satışlar yükleniyor...";

  try {
    const allSales = await loadCloudSales();
    const todaySales = allSales
      .filter(sale => inRange(sale.createdAt, "today"))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const total = todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    if (dateElement) dateElement.textContent = formatDayOnly(new Date());
    if (totalElement) totalElement.textContent = formatMoney(total);

    if (!todaySales.length) {
      list.className = "loading";
      list.textContent = "Bugün henüz satış yok.";
      return;
    }

    list.className = "";
    list.innerHTML = todaySales.map(sale => `
      <div class="daily-sales-row">
        <div><strong>${formatTimeOnly(sale.createdAt)}</strong></div>
        <div>${escapeHtml(sale.paymentType || "-")}</div>
        <div><strong>${formatMoney(sale.total)}</strong></div>
      </div>
    `).join("");
  } catch (error) {
    console.error(error);
    list.className = "loading";
    list.textContent = "Günlük satışlar alınamadı: " + (error.message || "Bilinmeyen hata");
    if (totalElement) totalElement.textContent = "0,00 TL";
  }
}


let activeReportView = "date";
let currentReportMailText = {};

function setActiveReportView(view) {
  activeReportView = view || "date";
  document.querySelectorAll(".report-section[data-report-view]").forEach(section => {
    section.classList.toggle("active-report-section", section.dataset.reportView === activeReportView);
  });
}

function getCurrentReportTitle() {
  const titles = {
    date: "Tarihe Göre Satışlar",
    payment: "Ödeme Türüne Göre Satışlar",
    category: "Ürün Kategorisine Göre Satışlar",
    product: "Ürünlere Göre Satışlar"
  };
  return titles[activeReportView] || "Satış Raporu";
}

function printCurrentReport() {
  setActiveReportView(activeReportView);
  document.body.classList.add("printing-report");
  document.body.dataset.printReportView = activeReportView;
  window.print();
  setTimeout(() => {
    document.body.classList.remove("printing-report");
    delete document.body.dataset.printReportView;
  }, 300);
}

function emailCurrentReport() {
  const title = getCurrentReportTitle();
  const range = getSelectedReportRange();
  const startText = new Intl.DateTimeFormat("tr-TR").format(range.start);
  const endText = new Intl.DateTimeFormat("tr-TR").format(range.end);
  const body = [
    "Kaptan Nili Bulut POS",
    title,
    `Tarih aralığı: ${startText} - ${endText}`,
    "",
    currentReportMailText[activeReportView] || "Bu raporda veri bulunamadı."
  ].join("\n");
  const subject = `KNPOS - ${title} (${startText} - ${endText})`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function renderReports() {
  const turnoverElement = document.getElementById("reportTurnover");
  const countElement = document.getElementById("reportCount");
  const averageElement = document.getElementById("reportAverage");
  const dateChart = document.getElementById("dateSalesChart");
  const paymentChart = document.getElementById("paymentReport");
  const categoryChart = document.getElementById("categoryReport");
  const productChart = document.getElementById("productReport");

  [dateChart, paymentChart, categoryChart, productChart].forEach(element => {
    if (element) element.innerHTML = '<div class="loading">Grafik yükleniyor...</div>';
  });

  try {
    const { start, end } = getSelectedReportRange();
    if (start > end) {
      alert("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }

    const allSales = await loadCloudSales();
    const filteredSales = allSales.filter(sale => isSaleInDateRange(sale, start, end));
    const turnover = filteredSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);

    turnoverElement.textContent = formatMoney(turnover);
    countElement.textContent = filteredSales.length;
    averageElement.textContent = formatMoney(filteredSales.length ? turnover / filteredSales.length : 0);

    const dateTotals = {};
    filteredSales.forEach(sale => {
      const key = toLocalDateInputValue(new Date(sale.createdAt));
      if (!dateTotals[key]) dateTotals[key] = { amount: 0, count: 0 };
      dateTotals[key].amount += Number(sale.total || 0);
      dateTotals[key].count += 1;
    });
    const dateEntries = Object.entries(dateTotals).sort((a, b) => a[0].localeCompare(b[0]));
    renderPieChart(dateChart, dateEntries.map(([date, values]) => ({
      label: new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`)),
      value: values.amount,
      note: `${values.count} satış`
    })), { ariaLabel: "Tarihe göre satış pasta grafiği" });
    renderSimpleReportTable(
      document.getElementById("dateSalesTable"),
      ["Tarih", "Satış Sayısı", "Tutar"],
      dateEntries.map(([date, values]) => [
        escapeHtml(formatDayOnly(`${date}T12:00:00`)),
        escapeHtml(String(values.count)),
        `<strong>${formatMoney(values.amount)}</strong>`
      ]),
      "Seçilen tarihlerde satış bulunamadı."
    );

    const paymentTotals = {};
    filteredSales.forEach(sale => {
      const name = sale.paymentType || "Bilinmiyor";
      if (!paymentTotals[name]) paymentTotals[name] = { amount: 0, count: 0 };
      paymentTotals[name].amount += Number(sale.total || 0);
      paymentTotals[name].count += 1;
    });
    const paymentEntries = Object.entries(paymentTotals).sort((a, b) => b[1].amount - a[1].amount);
    renderPieChart(paymentChart, paymentEntries.map(([label, values]) => ({
      label,
      value: values.amount,
      note: `${values.count} satış`
    })), { ariaLabel: "Ödeme türüne göre satış pasta grafiği" });
    renderSimpleReportTable(
      document.getElementById("paymentReportTable"),
      ["Ödeme Türü", "Satış Sayısı", "Tutar"],
      paymentEntries.map(([name, values]) => [
        escapeHtml(name),
        escapeHtml(String(values.count)),
        `<strong>${formatMoney(values.amount)}</strong>`
      ]),
      "Ödeme kaydı bulunamadı."
    );

    const categoryTotals = {};
    const productTotals = {};
    filteredSales.forEach(sale => {
      (Array.isArray(sale.items) ? sale.items : []).forEach(item => {
        const category = item.category || "Diğer";
        const product = item.name || "Silinmiş ürün";
        if (!categoryTotals[category]) categoryTotals[category] = { quantity: 0, amount: 0 };
        if (!productTotals[product]) productTotals[product] = { quantity: 0, amount: 0 };
        categoryTotals[category].quantity += Number(item.quantity || 0);
        categoryTotals[category].amount += Number(item.lineTotal || 0);
        productTotals[product].quantity += Number(item.quantity || 0);
        productTotals[product].amount += Number(item.lineTotal || 0);
      });
    });

    const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1].amount - a[1].amount);
    renderPieChart(categoryChart, categoryEntries.map(([label, values]) => ({
      label,
      value: values.amount,
      note: `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)} adet`
    })), { ariaLabel: "Ürün kategorisine göre satış pasta grafiği" });
    renderSimpleReportTable(
      document.getElementById("categoryReportTable"),
      ["Kategori", "Adet", "Tutar"],
      categoryEntries.map(([name, values]) => [
        escapeHtml(name),
        escapeHtml(new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)),
        `<strong>${formatMoney(values.amount)}</strong>`
      ]),
      "Kategori satışı bulunamadı."
    );

    const productEntries = Object.entries(productTotals).sort((a, b) => b[1].amount - a[1].amount);
    renderPieChart(productChart, productEntries.map(([label, values]) => ({
      label,
      value: values.amount,
      note: `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)} adet`
    })), { ariaLabel: "Ürünlere göre satış pasta grafiği" });
    renderSimpleReportTable(
      document.getElementById("productReportTable"),
      ["Ürün", "Adet", "Tutar"],
      productEntries.map(([name, values]) => [
        escapeHtml(name),
        escapeHtml(new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)),
        `<strong>${formatMoney(values.amount)}</strong>`
      ]),
      "Ürün satışı bulunamadı."
    );


    currentReportMailText = {
      date: dateEntries.length ? dateEntries.map(([date, values]) => `${formatDayOnly(`${date}T12:00:00`)} | ${values.count} satış | ${formatMoney(values.amount)}`).join("\n") : "Satış bulunamadı.",
      payment: paymentEntries.length ? paymentEntries.map(([name, values]) => `${name} | ${values.count} satış | ${formatMoney(values.amount)}`).join("\n") : "Ödeme kaydı bulunamadı.",
      category: categoryEntries.length ? categoryEntries.map(([name, values]) => `${name} | ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)} adet | ${formatMoney(values.amount)}`).join("\n") : "Kategori satışı bulunamadı.",
      product: productEntries.length ? productEntries.map(([name, values]) => `${name} | ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(values.quantity)} adet | ${formatMoney(values.amount)}`).join("\n") : "Ürün satışı bulunamadı."
    };
    setActiveReportView(document.getElementById("reportViewSelect")?.value || activeReportView);
  } catch (error) {
    console.error(error);
    turnoverElement.textContent = "0,00 TL";
    countElement.textContent = "0";
    averageElement.textContent = "0,00 TL";
    [dateChart, paymentChart, categoryChart, productChart].forEach(element => {
      if (element) element.innerHTML = `<div class="loading">Rapor alınamadı: ${escapeHtml(error.message || "Bilinmeyen hata")}</div>`;
    });
  }
}

    function printSelectedTableReceipt() {
      const table =
        getTables().find(
          item => item.id === selectedTableId
        );

      if (!table || table.status !== "open") {
        alert("Adisyon yazdırmak için masa açık olmalıdır.");
        return;
      }

      const receipt =
        document.getElementById("printReceipt");

      const orderRows = (table.orders || [])
        .map(item => `
          <div class="receipt-row">
            <span>${item.quantity} x ${escapeHtml(item.name)}</span>
            <span>${formatMoney(item.quantity * item.price)}</span>
          </div>
        `)
        .join("");

      receipt.innerHTML = `
        <div class="receipt-title">
          KAPTAN NİLİ
        </div>

        <div style="text-align:center;">
          ADİSYON
        </div>

        <div class="receipt-line"></div>

        <div class="receipt-row">
          <span>Masa</span>
          <strong>${escapeHtml(table.name)}</strong>
        </div>

        <div class="receipt-row">
          <span>Açılış</span>
          <span>${formatDate(table.openedAt)}</span>
        </div>

        <div class="receipt-line"></div>

        ${orderRows || "<div>Henüz ürün eklenmedi.</div>"}

        <div class="receipt-line"></div>

        <div class="receipt-row" style="font-size:18px;">
          <strong>TOPLAM</strong>
          <strong>${formatMoney(table.total)}</strong>
        </div>

        ${
          selectedPayment
            ? `<div class="receipt-row">
                 <span>Ödeme</span>
                 <strong>${escapeHtml(selectedPayment)}</strong>
               </div>`
            : ""
        }

        <div class="receipt-line"></div>

        <div style="text-align:center;font-size:12px;">
          KNPOS v2.0.0
        </div>
      `;

      window.print();
    }

    async function loadSaleProducts() {
      const grid =
        document.getElementById("saleProductsGrid");

      grid.innerHTML =
        '<div class="loading">Ürünler yükleniyor...</div>';

      try {
        const result = await runWithTimeout(
          client
            .from("products")
            .select("*")
            .eq("active", true)
            .order("name", { ascending: true }),
          15000
        );

        const { data, error } = result;

        if (error) {
          throw error;
        }

        saleProducts = data || [];
        renderCategories();
        renderSaleProducts();

      } catch (error) {
        grid.innerHTML =
          '<div class="loading">Ürünler alınamadı: ' +
          escapeHtml(error.message || "Bilinmeyen hata") +
          '</div>';
      }
    }

    function renderCategories() {
      const strip =
        document.getElementById("categoryStrip");

      const categories = [
        "Tümü",
        ...new Set(
          saleProducts
            .map(product => product.category || "Diğer")
        )
      ];

      strip.innerHTML = "";

      categories.forEach(category => {
        const button =
          document.createElement("button");

        button.type = "button";
        button.className =
          "category-button" +
          (category === selectedCategory
            ? " active-category"
            : "");

        button.textContent = category;

        button.addEventListener(
          "click",
          () => {
            selectedCategory = category;
            renderCategories();
            renderSaleProducts();
          }
        );

        strip.appendChild(button);
      });
    }

    function getCurrentTable() {
      return getTables().find(
        item => item.id === selectedTableId
      );
    }

    function getProductEmoji(category) {
      const value = String(category || "").toLowerCase();

      if (value.includes("dondurma")) return "🍦";
      if (value.includes("içecek")) return "🥤";
      if (value.includes("kurabiye")) return "🍪";
      if (value.includes("brownie")) return "🍫";
      if (value.includes("ekler")) return "🧁";
      if (value.includes("profiterol")) return "🍰";
      return "🍽️";
    }

    function renderSaleProducts() {
      const grid =
        document.getElementById("saleProductsGrid");

      const table = getCurrentTable();
      const search =
        productSearch.value.trim().toLocaleLowerCase("tr-TR");

      const filtered = saleProducts.filter(product => {
        const categoryMatch =
          selectedCategory === "Tümü" ||
          (product.category || "Diğer") === selectedCategory;

        const searchMatch =
          !search ||
          String(product.name || "")
            .toLocaleLowerCase("tr-TR")
            .includes(search);

        return categoryMatch && searchMatch;
      });

      grid.innerHTML = "";

      if (filtered.length === 0) {
        grid.innerHTML =
          '<div class="loading">Uygun ürün bulunamadı.</div>';
        return;
      }

      filtered.forEach(product => {
        const orderItem =
          (table?.orders || []).find(
            item => item.productId === product.id
          );

        const quantity =
          orderItem ? orderItem.quantity : 0;

        const button =
          document.createElement("button");

        button.type = "button";
        button.className = "sale-product-card";

        const imageHtml =
          product.image_url
            ? `<img src="${escapeHtml(product.image_url)}"
                    alt="${escapeHtml(product.name)}"
                    onerror="this.parentElement.textContent='${getProductEmoji(product.category)}'">`
            : getProductEmoji(product.category);

        button.innerHTML = `
          <div class="quantity-badge ${
            quantity > 0 ? "show" : ""
          }">
            x${quantity}
          </div>

          <div class="product-image-box">
            ${imageHtml}
          </div>

          <div class="sale-product-name">
            ${escapeHtml(product.name)}
          </div>

          <div class="sale-product-price">
            ${formatMoney(product.price)}
          </div>
        `;

        button.addEventListener(
          "click",
          () => changeProductQuantity(product, 1)
        );

        grid.appendChild(button);
      });
    }

    function changeProductQuantity(product, delta) {
      const tables = getTables();
      const table =
        tables.find(item => item.id === selectedTableId);

      if (!table || table.status !== "open") {
        return;
      }

      table.orders = Array.isArray(table.orders)
        ? table.orders
        : [];

      let item = table.orders.find(
        order => order.productId === product.id
      );

      if (!item && delta > 0) {
        item = {
          productId: product.id,
          name: product.name,
          price: Number(product.price || 0),
          quantity: 0
        };

        table.orders.push(item);
      }

      if (!item) {
        return;
      }

      item.quantity += delta;

      if (item.quantity <= 0) {
        table.orders = table.orders.filter(
          order => order.productId !== product.id
        );
      }

      table.total = table.orders.reduce(
        (sum, order) =>
          sum + Number(order.price) * Number(order.quantity),
        0
      );

      saveTables(tables);
      renderCart();
      renderSaleProducts();
      renderTables();
    }

    function renderCart() {
      const table = getCurrentTable();
      const list =
        document.getElementById("cartList");

      if (!table || !table.orders || table.orders.length === 0) {
        list.innerHTML =
          '<div class="cart-empty">Henüz ürün eklenmedi.</div>';

        document.getElementById("cartTotal").textContent =
          formatMoney(0);

        return;
      }

      list.innerHTML = "";

      table.orders.forEach(item => {
        const row =
          document.createElement("div");

        row.className = "cart-row";

        row.innerHTML = `
          <div>
            <div class="cart-name">
              ${escapeHtml(item.name)}
            </div>

            <div class="cart-sub">
              ${formatMoney(item.price)} × ${item.quantity}
              = ${formatMoney(item.price * item.quantity)}
            </div>
          </div>

          <div class="cart-controls">
            <button
              class="qty-button qty-minus"
              type="button"
            >−</button>

            <span class="qty-count">${item.quantity}</span>

            <button
              class="qty-button qty-plus"
              type="button"
            >+</button>
          </div>
        `;

        const product = saleProducts.find(
          p => p.id === item.productId
        ) || {
          id: item.productId,
          name: item.name,
          price: item.price,
          category: ""
        };

        row.querySelector(".qty-minus").addEventListener(
          "click",
          () => changeProductQuantity(product, -1)
        );

        row.querySelector(".qty-plus").addEventListener(
          "click",
          () => changeProductQuantity(product, 1)
        );

        list.appendChild(row);
      });

      document.getElementById("cartTotal").textContent =
        formatMoney(table.total);
    }

    function showMessage(elementId, text, type) {
      const message =
        document.getElementById(elementId);

      message.textContent = text;
      message.className = "message " + type;

      setTimeout(() => {
        message.textContent = "";
        message.className = "message";
      }, 5000);
    }

    function runWithTimeout(promise, milliseconds) {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "İşlem zaman aşımına uğradı. İnternet bağlantısını kontrol edin."
            )
          );
        }, milliseconds);
      });

      return Promise.race([
        promise,
        timeout
      ]);
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function formatMoney(value) {
      return Number(value || 0)
        .toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) + " TL";
    }

    function formatDate(value) {
      if (!value) {
        return "-";
      }

      return new Date(value)
        .toLocaleString("tr-TR");
    }

    function setButtonLoading(
      button,
      isLoading,
      loadingText,
      normalText
    ) {
      button.disabled = isLoading;

      button.textContent = isLoading
        ? loadingText
        : normalText;
    }

    async function loadProducts() {
      const productList =
        document.getElementById("productList");

      productList.className = "loading";
      productList.textContent =
        "Ürünler yükleniyor...";

      setButtonLoading(
        refreshProductsButton,
        true,
        "YÜKLENİYOR...",
        "LİSTEYİ YENİLE"
      );

      try {
        const result = await runWithTimeout(
          client
            .from("products")
            .select("*")
            .order("id", {
              ascending: false
            }),
          15000
        );

        const { data, error } = result;

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          productList.className = "loading";
          productList.textContent =
            "Henüz ürün kaydı yok.";

          return;
        }

        productList.className = "";
        productList.innerHTML = "";

        data.forEach(product => {
          const row =
            document.createElement("div");

          row.className = "product";

          row.innerHTML = `
            <div>
              <strong>
                ${escapeHtml(product.code)}
              </strong>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
              ${
                product.image_url
                  ? `<img
                      src="${escapeHtml(product.image_url)}"
                      alt="${escapeHtml(product.name)}"
                      style="width:52px;height:42px;object-fit:cover;border-radius:8px;"
                      onerror="this.style.display='none'"
                    >`
                  : ""
              }

              <span>${escapeHtml(product.name)}</span>
            </div>

            <div>
              ${escapeHtml(product.category || "-")}
            </div>

            <div>
              ${formatMoney(product.price)}
            </div>

            <div class="${
              product.active
                ? "active"
                : "passive"
            }">
              ${
                product.active
                  ? "Aktif"
                  : "Pasif"
              }
            </div>

            <div class="product-actions">
              <button
                class="action-button edit-button"
                type="button"
                onclick="editProduct(${product.id})"
              >
                ✏️ Düzenle
              </button>

              <button
                class="action-button ${
                  product.active
                    ? "passive-button"
                    : "activate-button"
                }"
                type="button"
                onclick="toggleProductStatus(
                  ${product.id},
                  ${product.active}
                )"
              >
                ${
                  product.active
                    ? "⛔ Pasife Al"
                    : "✔️ Aktif Yap"
                }
              </button>
            </div>
          `;

          productList.appendChild(row);
        });

      } catch (error) {
        productList.className = "loading";
        productList.textContent =
          "Ürünler alınamadı: " +
          (error.message || "Bilinmeyen hata");

      } finally {
        setButtonLoading(
          refreshProductsButton,
          false,
          "YÜKLENİYOR...",
          "LİSTEYİ YENİLE"
        );
      }
    }


    function previewSelectedImage() {
      const file = productImageInput.files?.[0];

      if (!file) {
        showPhotoPreview(currentProductImageUrl);
        return;
      }

      const reader = new FileReader();

      reader.onload = event => {
        photoPreview.innerHTML = `
          <img
            src="${event.target.result}"
            alt="Seçilen ürün fotoğrafı"
          >
        `;
      };

      reader.readAsDataURL(file);
    }

    function showPhotoPreview(imageUrl) {
      if (imageUrl) {
        photoPreview.innerHTML = `
          <img
            src="${escapeHtml(imageUrl)}"
            alt="Ürün fotoğrafı"
            onerror="this.parentElement.textContent='Fotoğraf yüklenemedi'"
          >
        `;
      } else {
        photoPreview.textContent =
          "Fotoğraf seçilmedi";
      }
    }

    async function uploadProductImage(file) {
      if (!file) {
        return currentProductImageUrl;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Fotoğraf JPG, PNG veya WEBP formatında olmalıdır."
        );
      }

      const extension =
        (file.name.split(".").pop() || "jpg")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      const fileName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}.${extension}`;

      const { error: uploadError } =
        await client.storage
          .from("product-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        client.storage
          .from("product-images")
          .getPublicUrl(fileName);

      return data.publicUrl;
    }

    async function saveProduct() {
      if (!currentProfile || currentProfile.role !== "admin") {
        showMessage(
          "productMessage",
          "Bu işlem için yetkili kullanıcı girişi gereklidir.",
          "error"
        );
        return;
      }
      const nameInput =
        document.getElementById("name");

      const categoryInput =
        document.getElementById("category");

      const priceInput =
        document.getElementById("price");

      const activeInput =
        document.getElementById("active");

      const name =
        nameInput.value.trim();

      const category =
        categoryInput.value;

      const priceValue =
        priceInput.value;

      const active =
        activeInput.checked;

      const selectedImageFile =
        productImageInput.files?.[0] || null;

      if (!name) {
        showMessage(
          "productMessage",
          "Ürün adı zorunludur.",
          "error"
        );

        nameInput.focus();
        return;
      }

      if (!category) {
        showMessage(
          "productMessage",
          "Lütfen bir kategori seçiniz.",
          "error"
        );

        categoryInput.focus();
        return;
      }

      if (priceValue === "") {
        showMessage(
          "productMessage",
          "Satış fiyatını giriniz.",
          "error"
        );

        priceInput.focus();
        return;
      }

      const price = Number(priceValue);

      if (
        Number.isNaN(price) ||
        price < 0
      ) {
        showMessage(
          "productMessage",
          "Geçerli bir satış fiyatı giriniz.",
          "error"
        );

        priceInput.focus();
        return;
      }

      const normalSaveText =
        editingProductId === null
          ? "ÜRÜNÜ KAYDET"
          : "ÜRÜNÜ GÜNCELLE";

      setButtonLoading(
        saveButton,
        true,
        editingProductId === null
          ? "KAYDEDİLİYOR..."
          : "GÜNCELLENİYOR...",
        normalSaveText
      );

      try {
        const imageUrl =
          await uploadProductImage(selectedImageFile);

        let query;

        if (editingProductId === null) {
          query = client
            .from("products")
            .insert({
              name,
              category,
              price,
              active,
              image_url: imageUrl
            });
        } else {
          query = client
            .from("products")
            .update({
              name,
              category,
              price,
              active,
              image_url: imageUrl
            })
            .eq("id", editingProductId);
        }

        const result = await runWithTimeout(
          query,
          15000
        );

        const { error } = result;

        if (error) {
          throw error;
        }

        showMessage(
          "productMessage",
          editingProductId === null
            ? "Ürün başarıyla kaydedildi."
            : "Ürün başarıyla güncellendi.",
          "success"
        );

        resetProductForm();

        await loadProducts();

        nameInput.focus();

      } catch (error) {
        showMessage(
          "productMessage",
          "Kayıt yapılamadı: " +
          (error.message || "Bilinmeyen hata"),
          "error"
        );

      } finally {
        setButtonLoading(
          saveButton,
          false,
          editingProductId === null
            ? "KAYDEDİLİYOR..."
            : "GÜNCELLENİYOR...",
          editingProductId === null
            ? "ÜRÜNÜ KAYDET"
            : "ÜRÜNÜ GÜNCELLE"
        );
      }
    }


    async function editProduct(productId) {
      try {
        const result = await runWithTimeout(
          client
            .from("products")
            .select("*")
            .eq("id", productId)
            .single(),
          15000
        );

        const { data, error } = result;

        if (error) {
          throw error;
        }

        editingProductId = data.id;

        document.getElementById("name").value =
          data.name || "";

        document.getElementById("category").value =
          data.category || "";

        document.getElementById("price").value =
          data.price ?? "";

        document.getElementById("active").checked =
          Boolean(data.active);

        currentProductImageUrl =
          data.image_url || null;

        productImageInput.value = "";
        showPhotoPreview(currentProductImageUrl);

        document.getElementById("productFormTitle").textContent =
          "Ürünü Düzenle";

        document.getElementById("editingBanner").style.display =
          "block";

        saveButton.textContent =
          "ÜRÜNÜ GÜNCELLE";

        cancelEditButton.style.display =
          "block";

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

        document.getElementById("name").focus();

      } catch (error) {
        showMessage(
          "productMessage",
          "Ürün bilgileri alınamadı: " +
          (error.message || "Bilinmeyen hata"),
          "error"
        );
      }
    }

    function cancelEdit() {
      resetProductForm();

      showMessage(
        "productMessage",
        "Düzenleme iptal edildi.",
        "info"
      );
    }

    function resetProductForm() {
      editingProductId = null;

      document.getElementById("name").value = "";
      document.getElementById("category").value = "";
      document.getElementById("price").value = "";
      document.getElementById("active").checked = true;

      currentProductImageUrl = null;
      productImageInput.value = "";
      showPhotoPreview(null);

      document.getElementById("productFormTitle").textContent =
        "Yeni Ürün Ekle";

      document.getElementById("editingBanner").style.display =
        "none";

      saveButton.textContent =
        "ÜRÜNÜ KAYDET";

      cancelEditButton.style.display =
        "none";
    }

    async function toggleProductStatus(
      productId,
      currentStatus
    ) {
      const nextStatus = !currentStatus;

      const actionText =
        nextStatus
          ? "aktif yapmak"
          : "pasife almak";

      const confirmed = confirm(
        `Bu ürünü ${actionText} istediğinize emin misiniz?`
      );

      if (!confirmed) {
        return;
      }

      try {
        const result = await runWithTimeout(
          client
            .from("products")
            .update({
              active: nextStatus
            })
            .eq("id", productId),
          15000
        );

        const { error } = result;

        if (error) {
          throw error;
        }

        if (editingProductId === productId) {
          resetProductForm();
        }

        showMessage(
          "productMessage",
          nextStatus
            ? "Ürün tekrar aktif yapıldı."
            : "Ürün pasife alındı.",
          "success"
        );

        await loadProducts();

      } catch (error) {
        showMessage(
          "productMessage",
          "Ürün durumu değiştirilemedi: " +
          (error.message || "Bilinmeyen hata"),
          "error"
        );
      }
    }

    async function loadCashStatus() {
      const cashStatus =
        document.getElementById("cashStatus");

      const openPanel =
        document.getElementById("openCashPanel");

      const closePanel =
        document.getElementById("closeCashPanel");

      cashStatus.className = "loading";
      cashStatus.textContent =
        "Kasa durumu kontrol ediliyor...";

      try {
        const result = await runWithTimeout(
          client
            .from("cash_sessions")
            .select("*")
            .eq("status", "open")
            .order("id", {
              ascending: false
            })
            .limit(1),
          15000
        );

        const { data, error } = result;

        if (error) {
          throw error;
        }

        currentCashSession =
          data && data.length > 0
            ? data[0]
            : null;

        if (currentCashSession) {
          cashStatus.className =
            "cash-status cash-open";

          cashStatus.innerHTML = `
            <div class="cash-status-title">
              KASA AÇIK
            </div>

            <div class="cash-detail">
              Açılış zamanı:
              <strong>
                ${formatDate(currentCashSession.opened_at)}
              </strong>
            </div>

            <div class="cash-detail">
              Açılış nakdi:
              <strong>
                ${formatMoney(currentCashSession.opening_amount)}
              </strong>
            </div>
          `;

          openPanel.style.display = "none";closePanel.style.display = "block";cashWarning.style.display="none";

        } else {
          cashStatus.className =
            "cash-status cash-closed";

          cashStatus.innerHTML = `
            <div class="cash-status-title">
              KASA KAPALI
            </div>

            <div class="cash-detail">
              Satış yapmadan önce kasayı açınız.
            </div>
          `;

          openPanel.style.display = "block";closePanel.style.display = "none";cashWarning.style.display="block";
        }

      } catch (error) {
        cashStatus.className = "loading";
        cashStatus.textContent =
          "Kasa durumu alınamadı: " +
          (error.message || "Bilinmeyen hata");
      }
    }

    async function openCash() {
      const openingInput =
        document.getElementById("openingAmount");

      const value =
        openingInput.value;

      if (value === "") {
        showMessage(
          "cashMessage",
          "Açılış nakit tutarını giriniz.",
          "error"
        );

        openingInput.focus();
        return;
      }

      const openingAmount =
        Number(value);

      if (
        Number.isNaN(openingAmount) ||
        openingAmount < 0
      ) {
        showMessage(
          "cashMessage",
          "Geçerli bir açılış tutarı giriniz.",
          "error"
        );

        openingInput.focus();
        return;
      }

      setButtonLoading(
        openCashButton,
        true,
        "KASA AÇILIYOR...",
        "KASAYI AÇ"
      );

      try {
        await loadCashStatus();

        if (currentCashSession) {
          throw new Error(
            "Zaten açık bir kasa bulunuyor."
          );
        }

        const result = await runWithTimeout(
          client
            .from("cash_sessions")
            .insert({
              opening_amount: openingAmount,
              status: "open"
            }),
          15000
        );

        const { error } = result;

        if (error) {
          throw error;
        }

        openingInput.value = "";

        showMessage(
          "cashMessage",
          "Kasa başarıyla açıldı.",
          "success"
        );

        await loadCashStatus();
        await loadCashHistory();

      } catch (error) {
        showMessage(
          "cashMessage",
          "Kasa açılamadı: " +
          (error.message || "Bilinmeyen hata"),
          "error"
        );

      } finally {
        setButtonLoading(
          openCashButton,
          false,
          "KASA AÇILIYOR...",
          "KASAYI AÇ"
        );
      }
    }

    async function closeCash() {
      const closingInput =
        document.getElementById("closingAmount");

      const value =
        closingInput.value;

      if (!currentCashSession) {
        showMessage(
          "cashMessage",
          "Açık kasa bulunamadı.",
          "error"
        );

        await loadCashStatus();
        return;
      }

      if (value === "") {
        showMessage(
          "cashMessage",
          "Kasada sayılan nakit tutarını giriniz.",
          "error"
        );

        closingInput.focus();
        return;
      }

      const closingAmount =
        Number(value);

      if (
        Number.isNaN(closingAmount) ||
        closingAmount < 0
      ) {
        showMessage(
          "cashMessage",
          "Geçerli bir kapanış tutarı giriniz.",
          "error"
        );

        closingInput.focus();
        return;
      }

      const confirmed = confirm(
        "Kasayı kapatmak istediğinize emin misiniz?"
      );

      if (!confirmed) {
        return;
      }

      setButtonLoading(
        closeCashButton,
        true,
        "KASA KAPATILIYOR...",
        "KASAYI KAPAT"
      );

      try {
        const result = await runWithTimeout(
          client
            .from("cash_sessions")
            .update({
              closing_amount: closingAmount,
              closed_at: new Date().toISOString(),
              status: "closed"
            })
            .eq("id", currentCashSession.id),
          15000
        );

        const { error } = result;

        if (error) {
          throw error;
        }

        closingInput.value = "";

        showMessage(
          "cashMessage",
          "Kasa başarıyla kapatıldı.",
          "success"
        );

        currentCashSession = null;

        await loadCashStatus();
        await loadCashHistory();

      } catch (error) {
        showMessage(
          "cashMessage",
          "Kasa kapatılamadı: " +
          (error.message || "Bilinmeyen hata"),
          "error"
        );

      } finally {
        setButtonLoading(
          closeCashButton,
          false,
          "KASA KAPATILIYOR...",
          "KASAYI KAPAT"
        );
      }
    }

    async function loadCashHistory() {
      const cashHistory =
        document.getElementById("cashHistory");

      cashHistory.className = "loading";
      cashHistory.textContent =
        "Kasa hareketleri yükleniyor...";

      try {
        const result = await runWithTimeout(
          client
            .from("cash_sessions")
            .select("*")
            .order("id", {
              ascending: false
            })
            .limit(20),
          15000
        );

        const { data, error } = result;

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          cashHistory.className = "loading";
          cashHistory.textContent =
            "Henüz kasa işlemi yok.";

          return;
        }

        cashHistory.className = "";
        cashHistory.innerHTML = "";

        data.forEach(session => {
          const row =
            document.createElement("div");

          row.className =
            "cash-history-row";

          row.innerHTML = `
            <div>
              ${formatDate(session.opened_at)}
            </div>

            <div>
              ${formatMoney(session.opening_amount)}
            </div>

            <div>
              ${formatDate(session.closed_at)}
            </div>

            <div>
              ${
                session.closing_amount === null
                  ? "-"
                  : formatMoney(session.closing_amount)
              }
            </div>

            <div class="${
              session.status === "open"
                ? "active"
                : "passive"
            }">
              ${
                session.status === "open"
                  ? "Açık"
                  : "Kapalı"
              }
            </div>
          `;

          cashHistory.appendChild(row);
        });

      } catch (error) {
        cashHistory.className = "loading";
        cashHistory.textContent =
          "Kasa hareketleri alınamadı: " +
          (error.message || "Bilinmeyen hata");
      }
    }

    initializeAuth();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
