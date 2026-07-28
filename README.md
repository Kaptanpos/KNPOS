# KNPOS 4 — Temiz Başlangıç

Bu paket, KNPOS v3.0.0 içindeki gerçekten kullanılan dosyalardan oluşturulmuş temiz bir başlangıçtır.

## Ana dosyalar
- `index.html`
- `style.css`
- `app.js`
- `service-worker.js`

Eski sürüm kopyaları (`app-v1...`, `style-v1...`, eski service worker dosyaları ve iç içe ZIP'ler) pakete alınmadı.

## Kurulum
1. Eski GitHub reposunu silmeyin.
2. Yeni bir repo oluşturun: `KNPOS-4`.
3. Bu ZIP'in içindeki dosyaları yeni repoya yükleyin.
4. Yeni repoyu Vercel'e bağlayın.
5. İlk açılışta `Ctrl + Shift + R` yapın.

## Doğrulanan kontroller
- `index.html`, yalnızca `style.css` ve `app.js` dosyalarını çağırır.
- `app.js` JavaScript sözdizimi kontrolünden geçmiştir.
- Service worker artık eski `v2.0.3` dosyasını değil `service-worker.js` dosyasını kaydeder.

Bu paket mevcut işlevleri yeniden tasarlamaz; önce sürüm karmaşasını ortadan kaldıran güvenli başlangıç tabanıdır.
