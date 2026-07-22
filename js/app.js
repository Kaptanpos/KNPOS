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
    document.querySelectorAll(".report-filter-button").forEach(b=>b.addEventListener("click",()=>{activeSalesFilter=b.dataset.range;document.querySelectorAll(".report-filter-button").forEach(x=>x.classList.toggle("active-filter",x===b));renderSales();}));


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

      const isAdmin =
        profile.role === "admin";

      document.getElementById("navProducts").style.display =
        isAdmin ? "" : "none";

      document.getElementById("navSales").style.display =
        isAdmin ? "" : "none";

      document.getElementById("navReports").style.display =
        isAdmin ? "" : "none";

      document.getElementById("homeProductsButton").style.display =
        isAdmin ? "" : "none";

      loginPassword.value = "";
      loginScreen.style.display = "none";
      appShell.style.display = "block";

      showPage("tables");
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

    function showPage(pageName) {
      const adminOnlyPages = [
        "products",
        "sales",
        "reports"
      ];

      if (
        adminOnlyPages.includes(pageName) &&
        (!currentProfile || currentProfile.role !== "admin")
      ) {
        alert("Bu bölüm yalnızca yetkili kullanıcıya açıktır.");
        pageName = "tables";
      }

      document
        .querySelectorAll(".page")
        .forEach(page => {
          page.classList.remove("active-page");
        });

      document
        .querySelectorAll(".nav button")
        .forEach(button => {
          button.classList.remove("active-nav");
        });

      if (pageName === "tables") {
        document
          .getElementById("pageTables")
          .classList.add("active-page");

        document
          .getElementById("navTables")
          .classList.add("active-nav");

        renderTables();
      }

      if (pageName === "home") {
        document
          .getElementById("pageHome")
          .classList.add("active-page");

        document
          .getElementById("navHome")
          .classList.add("active-nav");
      }

      if (pageName === "products") {
        document
          .getElementById("pageProducts")
          .classList.add("active-page");

        document
          .getElementById("navProducts")
          .classList.add("active-nav");

        loadProducts();
      }

      if(pageName==="cash"){document.getElementById("pageCash").classList.add("active-page");document.getElementById("navCash").classList.add("active-nav");loadCashStatus();loadCashHistory();}
      if(pageName==="sales"){document.getElementById("pageSales").classList.add("active-page");document.getElementById("navSales").classList.add("active-nav");renderSales();}
      if(pageName==="reports"){document.getElementById("pageReports").classList.add("active-page");document.getElementById("navReports").classList.add("active-nav");renderReports();}
    }


    function getTables() {
      try {
        const saved =
          JSON.parse(localStorage.getItem(TABLE_STORAGE_KEY));

        if (
          Array.isArray(saved) &&
          saved.length === 5
        ) {
          return saved.map(table => ({
            ...table,
            orders: Array.isArray(table.orders)
              ? table.orders
              : [],
            payment: table.payment || null
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
      const grid =
        document.getElementById("tablesGrid");

      const tables = getTables();

      grid.innerHTML = "";

      tables.forEach(table => {
        const button =
          document.createElement("button");

        button.type = "button";
        button.className =
          `table-card ${table.status}`;

        button.innerHTML = `
          <div class="table-name">
            ${escapeHtml(table.name)}
          </div>

          <div class="table-state">
            ${
              table.status === "open"
                ? "AÇIK"
                : "KAPALI"
            }
          </div>

          <div class="table-time">
            ${
              table.openedAt
                ? "Açılış: " + formatDate(table.openedAt)
                : "Henüz açılmadı"
            }
          </div>

          <div class="table-total">
            Toplam: ${formatMoney(table.total)}
          </div>
        `;

        button.addEventListener(
          "click",
          () => openTableModal(table.id)
        );

        grid.appendChild(button);
      });
    }

    async function openTableModal(tableId) {
      await loadCashStatus();
      if(!currentCashSession){alert("Satış yapabilmek için önce kasayı açınız.");showPage("cash");return;}
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

      if (table.status === "closed") {
        closedView.style.display = "block";
        openView.style.display = "none";

        document.getElementById("modalTableInfo").innerHTML = `
          <strong>Durum:</strong> Kapalı
          <br>
          <strong>Toplam:</strong> ${formatMoney(0)}
        `;
      } else {
        closedView.style.display = "none";
        openView.style.display = "block";

        productSearch.value = "";
        selectedCategory = "Tümü";

        await loadSaleProducts();
        renderCart();


      }

      tableModal.classList.add("show");
    }

    function closeTableModal() {
      selectedTableId = null;
      tableModal.classList.remove("show");
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
    function printReceiptForSale(s){const rows=s.items.map(i=>`<div class="receipt-row"><span>${i.quantity} x ${escapeHtml(i.name)}</span><span>${formatMoney(i.quantity*i.price)}</span></div>`).join("");printReceipt.innerHTML=`<div class="receipt-title">KAPTAN NİLİ</div><div style="text-align:center">ADİSYON</div><div class="receipt-line"></div><div class="receipt-row"><span>Satış No</span><strong>${s.id}</strong></div><div class="receipt-row"><span>Masa</span><strong>${escapeHtml(s.tableName)}</strong></div><div class="receipt-row"><span>Tarih</span><span>${formatDate(s.createdAt)}</span></div><div class="receipt-line"></div>${rows}<div class="receipt-line"></div><div class="receipt-row"><strong>TOPLAM</strong><strong>${formatMoney(s.total)}</strong></div><div class="receipt-line"></div><div style="text-align:center;font-size:12px">KNPOS v1.5.0</div>`;window.print()}
    function inRange(v,r){const d=new Date(v),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());if(r==="today")return d>=t;if(r==="yesterday"){const y=new Date(t-86400000);return d>=y&&d<t}if(r==="week"){const day=(n.getDay()+6)%7;return d>=new Date(t-day*86400000)}if(r==="month")return d>=new Date(n.getFullYear(),n.getMonth(),1);return true}
    function payText(p){return Object.entries(p||{}).filter(([,v])=>+v>0).map(([k,v])=>`${paymentLabel(k)}: ${formatMoney(v)}`).join(" • ")}
    function renderSales(){const list=document.getElementById("salesList"),s=getSales().filter(x=>inRange(x.createdAt,activeSalesFilter));if(!s.length){list.className="loading";list.textContent="Bu dönemde satış bulunamadı.";return}list.className="";list.innerHTML=s.map(x=>`<div class="sales-row"><div>${formatDate(x.createdAt)}</div><div><strong>${x.id}</strong></div><div>${escapeHtml(x.tableName)}</div><div>${formatMoney(x.total)}</div><div>${escapeHtml(payText(x.payments))}</div></div>`).join("")}
    function renderReports(){const s=getSales().filter(x=>inRange(x.createdAt,"today")),turn=s.reduce((a,b)=>a+(+b.total||0),0);document.getElementById("reportTurnover").textContent=formatMoney(turn);document.getElementById("reportCount").textContent=s.length;document.getElementById("reportAverage").textContent=formatMoney(s.length?turn/s.length:0);const pt={};s.forEach(x=>Object.entries(x.payments||{}).forEach(([k,v])=>pt[k]=(pt[k]||0)+(+v||0)));paymentReport.innerHTML=Object.entries(pt).filter(([,v])=>v>0).map(([k,v])=>`<div class="sales-row" style="grid-template-columns:1fr 1fr"><div>${paymentLabel(k)}</div><div><strong>${formatMoney(v)}</strong></div></div>`).join("")||'<div class="loading">Henüz ödeme kaydı yok.</div>';const pr={};s.forEach(x=>(x.items||[]).forEach(i=>{pr[i.name]=pr[i.name]||{q:0,a:0};pr[i.name].q+=+i.quantity||0;pr[i.name].a+=(+i.quantity||0)*(+i.price||0)}));productReport.innerHTML=Object.entries(pr).sort((a,b)=>b[1].q-a[1].q).map(([n,v])=>`<div class="sales-row" style="grid-template-columns:2fr 1fr 1fr"><div>${escapeHtml(n)}</div><div>${v.q} adet</div><div><strong>${formatMoney(v.a)}</strong></div></div>`).join("")||'<div class="loading">Henüz ürün satışı yok.</div>'}

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
          KNPOS v1.5.0
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
