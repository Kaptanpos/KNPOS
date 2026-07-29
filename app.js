/* KAPTAN NİLİ BULUT POS - SIFIRDAN TEMİZ KURULUM */

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elemanları
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginUser = document.getElementById("loginUser");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");

// 1. GİRİŞ İŞLEMİ (Şifresiz / Kolay Doğrulama veya Supabase Auth)
async function login() {
  const password = loginPassword.value;

  if (!password) {
    alert("Lütfen şifrenizi giriniz.");
    return;
  }

  // Supabase Auth üzerinden giriş
  const email = "denizmazlumoglu@gmail.com"; // Veya Supabase Auth'ta tanımlı mailiniz

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert("Giriş Başarısız: " + error.message);
      return;
    }

    // Giriş başarılı
    loginScreen.style.display = "none";
    appShell.style.display = "block";
    loadTables();

  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

// 2. MASALARI YÜKLE
async function loadTables() {
  const grid = document.getElementById("tablesGrid");
  if (!grid) return;

  grid.innerHTML = '<div class="loading">Masalar yükleniyor...</div>';

  // Supabase 'tables' veya 'sales' verisini çek
  const { data: tables, error } = await client.from("tables").select("*");

  if (error || !tables || tables.length === 0) {
    // Veritabanında masa tablosu boşsa varsayılan masaları göster
    renderDefaultTables(grid);
    return;
  }

  grid.innerHTML = "";
  tables.forEach(table => {
    const btn = document.createElement("button");
    btn.className = `table-card ${table.status || 'closed'}`;
    btn.innerText = table.name || `Masa ${table.id}`;
    grid.appendChild(btn);
  });
}

function renderDefaultTables(grid) {
  grid.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "table-card closed";
    btn.innerHTML = `<div class="table-number">0${i}</div>`;
    grid.appendChild(btn);
  }
}

// Olay Dinleyicileri
if (loginButton) loginButton.addEventListener("click", login);
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
}
