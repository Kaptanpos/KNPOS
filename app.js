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
  { id: 1, name: "Masa 01", status: "closed", orders: [], total: 0 }
];

// GÜVENLİ HTML ESCAPE
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// PARA FORMATI
function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
}

// İNTERNET SİPARİŞLERİNİ LİSTELEME VE FİLTRELEME (Rapor mantığıyla kusursuz uyumlu)
async function loadInternetOrders() {
  const tbody = document.getElementById("internetOrdersTbody");
  if (!tbody) return;

  try {
    let query = client.from("orders").select("*").order("created_at", { ascending: false });

    const startInput = document.getElementById("netStartDate");
    const endInput = document.getElementById("netEndDate");

    if (startInput && startInput.value && endInput && endInput.value) {
      query = query.gte("created_at", startInput.value + "T00:00:00").lte("created_at", endInput.value + "T23:59:59");
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Seçilen tarih aralığında internet siparişi bulunamadı.</td></tr>';
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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626; padding:20px;">Siparişler yüklenirken hata oluştu.</td></tr>`;
  }
}

// HIZLI İPTAL
async function quickCancelInternetOrder(orderUuid, orderNo) {
  if (!confirm(`Sipariş #${orderNo} iptal edilsin mi?`)) return;
  try {
    const { error } = await client.from("orders").update({ status: "cancelled" }).eq("id", orderUuid);
    if (error) throw error;
    loadInternetOrders();
  } catch (err) {
    alert("İptal edilemedi: " + err.message);
  }
}

// DETAY MODALI
function openInternetOrderDetail(orderObj) {
  alert("Sipariş Detayı: #" + (orderObj.order_id || orderObj.id) + "\nTutar: " + formatMoney(orderObj.total_price || orderObj.total_amount));
}
