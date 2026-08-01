/* ==========================================================
   KAPTAN NİLİ - BULUT POS FULL & KESİN ÇÖZÜM APP.JS
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Kaptan Nili POS Yükleniyor... 🚀");

    // 1. Supabase İstemci Kontrolü ve Başlatma
    if (typeof supabase === 'undefined' && typeof createClient === 'undefined') {
        console.error("Supabase kütüphanesi yüklenemedi!");
    }

    // Projendeki global client değişkenini burada tanımlıyoruz
    window.client = window.client || supabase.createClient(
        "https://stytmmafrrtqaxobihap.supabase.co",
        "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu"
    );

    // Giriş Butonu Dinleyicisi
    const loginBtn = document.getElementById("loginBtn");
    const passwordInput = document.getElementById("passwordInput");
    const loginScreen = document.getElementById("loginScreen");
    const appShell = document.getElementById("appShell");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => handleLogin());
    }

    if (passwordInput) {
        passwordInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleLogin();
        });
    }

    async function handleLogin() {
        const pass = passwordInput ? passwordInput.value.trim() : "";
        
        // Basit şifre koruması veya doğrulama
        if (pass === "" || pass.length < 3) {
            alert("Lütfen geçerli bir şifre gir kanka!");
            return;
        }

        try {
            console.log("Giriş yapılıyor...");
            
            // Paneli görünür yap
            if (loginScreen) loginScreen.style.display = "none";
            if (appShell) appShell.style.display = "block";

            // Verileri tazele
            if (typeof window.kaptanCanliSatislarıTazele === 'function') {
                window.kaptanCanliSatislarıTazele();
            }
            if (typeof renderSales === 'function') {
                renderSales();
            }

            console.log("✅ Giriş başarılı ve panel açıldı!");
        } catch (err) {
            console.error("Giriş hatası:", err);
            alert("Giriş sırasında hata oluştu: " + err.message);
        }
    }
});

// HTML içindeki kaçış fonksiyonu (güvenlik için)
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Standart satışları render etme fonksiyonu (yedek)
window.renderSales = async function() {
    if (typeof client === 'undefined') return;
    try {
        const { data, error } = await client
            .from("sales")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) throw error;
        console.log("Satışlar güncellendi:", data);
    } catch (err) {
        console.error("Satışlar çekilemedi:", err.message);
    }
};


/* ==========================================================
   KAPTAN NİLİ - CANLI SUPABASE DİNLEME & CİRO MODÜLÜ v10.0
   ========================================================== */

(function() {
    'use strict';
    console.log("Kaptan Nili Canlı Dinleme Modülü Aktif! 🚀");

    // Supabase'den güncel satışları çekip ekrandaki tabloyu ve ciro penceresini güncelleyen fonksiyon
    window.kaptanCanliSatislarıTazele = async function() {
        if (typeof client === 'undefined') return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: sales, error } = await client
                .from("sales")
                .select("*")
                .gte("created_at", today)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const list = document.getElementById("salesList");
            const totalElem = document.getElementById("salesDailyTotal");
            if (!list) return;

            if (!sales || sales.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Bugün henüz satış yapılmadı.</div>';
                if (totalElem) totalElem.textContent = "0,00 TL";
                return;
            }

            let sum = 0;
            list.innerHTML = sales.map(s => {
                sum += Number(s.total_amount || 0);
                const timeStr = new Date(s.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
                return `
                    <div class="daily-sales-row" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; font-size: 13px;">
                        <div><strong>${timeStr}</strong></div>
                        <div><strong style="color:var(--primary);">${escapeHtml(s.payment_type || "Nakit")}</strong></div>
                        <div style="text-align:right;"><strong>${Number(s.total_amount).toLocaleString("tr-TR", {minimumFractionDigits: 2})} TL</strong></div>
                    </div>
                `;
            }).join("");

            if (totalElem) {
                totalElem.textContent = sum.toLocaleString("tr-TR", {minimumFractionDigits: 2}) + " TL";
            }

        } catch (err) {
            console.error("Canlı satışlar güncellenirken hata:", err.message);
        }
    };

    // Her 3 saniyede bir Supabase'i yokla ve ekranı güncelle
    setInterval(() => {
        const appShell = document.getElementById("appShell");
        if (appShell && appShell.style.display !== "none") {
            window.kaptanCanliSatislarıTazele();
        }
    }, 3000);

    // İlk açılışta bir kez çalıştır
    setTimeout(window.kaptanCanliSatislarıTazele, 1000);

})();
