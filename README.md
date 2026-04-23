# baze

İkimize özel tatil planlama uygulaması. Klasörler halinde tatiller, her birinin içinde Google Maps'le entegre yerler, ortak erişim.

## İlk kurulum (sırayla)

### 1) Supabase projesi

1. https://supabase.com → **New Project**
   - Ad: `baze`, region: **Frankfurt (eu-central-1)**, database şifresini güvenli bir yere kaydet
2. Proje hazır olunca sol menüden **SQL Editor** aç
3. `supabase/schema.sql` dosyasının içeriğini kopyalayıp yapıştır, **Run**
4. Aynı editörde `supabase/storage.sql` dosyasını da çalıştır (fotoğraf bucket'ı için)
5. **Settings → API**'den şu iki değeri kopyala:
   - `Project URL`
   - `service_role` secret key (⚠️ gizli — tarayıcıya asla açma)

### 2) Google Cloud projesi

1. https://console.cloud.google.com → **New Project**: `baze-maps`
2. **Billing** ekle (kredi kartı zorunlu — Türkiye hesapları prepayment isteyebilir; iade edilebilir)
3. **APIs & Services → Library**'den şunları **ENABLE** et:
   - Maps JavaScript API
   - Places API (New)
   - Geocoding API
4. **Credentials → Create Credentials → API Key**
   - Key'i kopyala
   - **Restrict** → Application restrictions: HTTP referrers → `http://localhost:3000/*`, `https://YOUR-DOMAIN/*`
   - API restrictions: yukarıdaki 3 API'ye kısıtla
5. **Billing → Budgets & alerts → Create Budget**
   - Miktar: `$5`, threshold'lar: 50%, 90%, 100% → mail bildirimi aktif
6. Opsiyonel ama önerilir: $20 **hard cap** için Cloud Function + Pub/Sub kur (Google'ın [rehberi](https://cloud.google.com/billing/docs/how-to/notify#cap_disable_billing_to_stop_usage))

### 3) Env dosyası

```bash
cp .env.local.example .env.local
```

Doldur:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
SESSION_SECRET=<aşağıdaki komutun çıktısı>
```

`SESSION_SECRET` için:

```bash
openssl rand -base64 32
```

### 4) Çalıştır

```bash
npm run dev
```

http://localhost:3000 → açılışta `/puzzle`'a yönlenirsin.

## İlk giriş

**Varsayılan desen:** X şekli → sırayla nokta `0 → 4 → 8 → 6 → 2`.

```
0 · 1 · 2
·       ·
3 · 4 · 5
·       ·
6 · 7 · 8
```

Doğru çizersen `/who` ekranına gidersin, avatarını seç → ana sayfaya düşersin.

### Deseni değiştirmek

Supabase SQL Editor'da:

```sql
update app_config
set value = '[1, 3, 4, 5, 7]'::jsonb  -- senin deseninin nokta sırası
where key = 'puzzle_pattern';
```

### İsimleri / avatarları değiştirmek

```sql
update members set name = 'Batın' where sort_order = 0;
update members set name = 'Zeynep' where sort_order = 1;
```

Fotoğraflar için `public/avatars/` klasörüne `batin.jpg` ve `zeynep.jpg` koy (kare, en az 400×400).

## Mimari

- **Next.js 16** (App Router) + **Turbopack**
- **Supabase** (Postgres) — tüm erişim server-side, `service_role` key ile
- **Google Maps JS API** — harita görüntüleme + Places autocomplete
- **Session auth:** puzzle doğru → `baze_puzzle_ok` kısa ömürlü cookie → avatar seç → `baze_session` JWT cookie (30 gün, HttpOnly)
- **Proxy:** `proxy.ts` — oturumsuz istekleri `/puzzle`'a yönlendirir

## Özellikler

- Tatil klasörleri (isim, tarih aralığı, açıklama)
- Lokasyonlar: isim, adres, koordinat, kategori emojisi, not, ❤️, "gidilecek/gittik" durumu
- Kimin eklediği kaydedilir
- Lokasyon ekleme 3 yol:
  - **Ara** — Google Places autocomplete ile
  - **Link** — Google Maps paylaşım linkini yapıştır (redirect takip ederek koordinat çıkarır, API ücretsiz)
  - **Elle** — enlem/boylam manuel
- Her lokasyon için **Yol tarifi** (Google Maps uygulamasında açılır) ve **Haritalar'da aç**
- PWA — telefonda "ana ekrana ekle" ile uygulama gibi kullanılır

## Yol haritası

- [ ] KML toplu import (Google Takeout'tan)
- [ ] Android PWA share target (Google Maps'ten "Paylaş → baze")
- [ ] Lokasyon fotoğrafları (Supabase Storage)
- [ ] Kategori filtresi harita + listede
- [ ] Gün planlayıcı (tarih aralığı içinde drag-drop)
- [ ] Setup ekranı (puzzle deseni UI'dan değiştirme)

## Deploy (hazır olunca)

Vercel:
1. `vercel` CLI veya GitHub push → otomatik deploy
2. Vercel dashboard'da aynı env var'ları ekle
3. Google Cloud → API key → HTTP referrer'a `https://your-app.vercel.app/*` ekle
