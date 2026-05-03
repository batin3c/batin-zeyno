# Akış — Public Feed

> **SUPERSEDED 2026-05-03** — see [`baze-v2-redesign.md`](./baze-v2-redesign.md) for the active plan.
> The akış spec below is rolled into the larger v2 redesign (trip planner removed, follow system added, community recommendations on city pages).

Status: SUPERSEDED. Created 2026-05-03.

## Konsept (kullanıcı kararları)

- **Vizyon A — public global feed**: tüm kullanıcılar (cross-group) birbirinin paylaşımını görür. Auth gerek (anonim yok).
- **Akış adı**: "akış"
- **Auto-feed yok**: her aktivite otomatik akışta görünmez. Kullanıcı **bilinçli olarak** "akışta paylaş" eylemini yapar.
- **Para işleri akışta yok**: posts sadece şehir/yer/tatil referans edebilir. Expense / settlement asla akışta görünmez.
- **Reaction**: ❤️ tek tip, toggleable.
- **Yorum**: düz metin (max 500 karakter), tek seviye (yoruma yorum yok).
- **Bildirim**: senin postuna kalp atılınca / yorum yazılınca push gelir.

---

## Schema (migration 0017_posts.sql)

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references members(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade, -- içerik nereden
  caption text check (length(caption) <= 500),
  ref_type text not null check (ref_type in ('city','location','trip')),
  city_id uuid references visited_cities(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  -- snapshot zamanın etkisinden korur: kaynak değişse de post kendi başına ayakta
  snapshot jsonb not null, -- { title, subtitle?, country_code?, photo_urls: string[] }
  created_at timestamptz not null default now(),
  -- exactly one of city_id/location_id/trip_id set
  check (
    (case when city_id   is not null then 1 else 0 end) +
    (case when location_id is not null then 1 else 0 end) +
    (case when trip_id   is not null then 1 else 0 end) = 1
  )
);
create index idx_posts_recent on posts(created_at desc);
create index idx_posts_author on posts(author_id, created_at desc);

create table post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index idx_reactions_post on post_reactions(post_id);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 500),
  created_at timestamptz not null default now()
);
create index idx_comments_post on post_comments(post_id, created_at);
```

**Snapshot rasyoneli**: kaynak (foto, şehir vs.) silinince post otomatik silinir (CASCADE), ama feed render hızlı olsun diye snapshot içinde title/photo_urls saklanır — runtime'da JOIN gerekmez.

---

## Server actions — `app/actions/posts.ts` (yeni dosya)

| Action | Görev |
|---|---|
| `createPost({ refType, refId, caption, photoUrls })` | requireCurrentMember + kaynak active group'a mı ait kontrolü + snapshot kur + insert |
| `deletePost(postId)` | Sadece author silebilir |
| `toggleReaction(postId)` | Var/yok geç |
| `addComment(postId, body)` | Insert + push notif (post author + diğer yorumcular) |
| `deleteComment(commentId)` | Sadece comment author veya post author |
| `loadFeed({ cursor, limit })` | Tüm postları cursor pagination ile çek (created_at < cursor) |
| `loadComments(postId)` | Post detayı için tüm yorumları çek |

### Push tetikleri
- `comment.add` → post author'a + post'a yorum yapmış diğer üyelere
- `reaction.add` → sadece post author'a (rate-limit: aynı post için 5 dk içinde dupe yok — push tag'leri zaten dedupe ediyor)

---

## UI

### `/akis` route
- **Bottom-nav 3. tab** (profil yerine): briefcase / globe / **heart-icon**
- Server-fetch ilk 20 post, infinite scroll cursor-based
- Her post kartı:
  - **Header**: author avatar (renk + harf) + ad + zaman ("3 saat önce")
  - **Hero**: foto carousel (swipe) — full-width
  - **Footer**: bayrak + entity title (ülke/yer adı) + caption (varsa) + ❤️ count + 💬 count
  - ❤️ tıklanır → toggle reaction (optimistic UI)
  - 💬 tıklanır → comments accordion açılır (inline, modal değil)
- Empty state: "henüz kimse paylaşmadı. ilk sen ol — bir şehri açıp 'akışta paylaş'a bas"

### Paylaşım akışı (3 yer)

1. **CitySheet** → fotoğraflar bölümünün altında **"akışta paylaş"** butonu → modal: foto seçici (multi-select existing photos) + caption input + submit
2. **LocationCard** (trip detayında) → satır eylemi (yol/haritalar/gidilecek yanına ek): **"akışta paylaş"** → aynı modal
3. **TripDetail** → header'da paylaş ikonu → modal: cover + caption (foto seçimi yok, trip cover'ı + ad gider)

Ortak component: `<SharePostDialog refType refId existingPhotos />`.

### Comments inline (akış kartında 💬 toggle)
- Liste: author avatar (küçük) + body + zaman + (yetkin varsa) sil butonu
- Altta input + "gönder" butonu
- Auto-load on first open, refresh on focus
- Author'un kendi postunda her yorumu silme yetkisi var (modere)

### Top-right avatar (sağ üst köşe)
- `components/header-avatar.tsx`: 32×32 circle, member.color bg, name[0]
- Her sayfada `AppHeader` içinde (auth + onboarding pages hariç)
- Tıkla → `/profil`
- **Bottom-nav'dan profil tab'ı kalkar** — yerine "akış"

---

## Bildirim refactor

```ts
// lib/push-helpers.ts veya actions/push.ts'e ek
notifyPostInteraction({
  postId,
  kind: 'reaction' | 'comment',
  body,           // "deniz kalp attı" / "ali yorum yazdı: …"
  recipientIds,   // post author + (optional) prev commenters
});
```

`notifyOthers` group-scoped kalacak (mevcut işler için). Akış için yeni helper, sadece spesifik kişilere.

---

## Privacy & moderation

- **Şu anlık**: tüm postlar dünyaya açık. User explicitly post yapmadıkça hiçbir şey paylaşılmaz.
- **Postu sil**: author istediği an siler (cascading: yorumlar + reactionlar gider)
- **Block / report**: v2'ye ertele. Şu an kapsam dışı (kullanıcı kitlesi tanıdık + küçük).
- **Yorum modere**: post sahibi başkasının yorumunu silebilir.
- **Public profile sayfaları**: v2'ye ertele. Author tap'i şimdilik no-op (veya bir tooltip).
- **Foto Supabase bucket public**: zaten böyleydi, akış bunu daha görünür yapar ama yeni bir leak yaratmaz. İleride signed URL'lere geçilebilir.

---

## Bottom-nav + AppHeader değişiklikleri

**Şu an:**
| sol | orta | sağ |
|---|---|---|
| tatiller | globe | profil |

**Yeni:**
| sol | orta | sağ |
|---|---|---|
| tatiller | globe | **akış** |

**AppHeader sağ-üst köşesi:** renkli avatar (her sayfada, auth + onboarding hariç) → tıkla `/profil`.

---

## Implementation sırası

| Stage | Süre | İçerik |
|---|---|---|
| 1 | 30 dk | Migration 0017 (posts + reactions + comments) + types.ts |
| 2 | 1 saat | `app/actions/posts.ts` (7 action) + push helpers |
| 3 | 45 dk | `<SharePostDialog>` component (foto picker + caption + submit) |
| 4 | 30 dk | "akışta paylaş" butonları city-sheet, location-list, trip-header'da |
| 5 | 1.5 saat | `/akis` page + `<FeedCard>` + `<CommentsAccordion>` + infinite scroll |
| 6 | 30 dk | Bottom-nav refactor (profil → akış) + header-avatar component + profil tab kaldırma |
| 7 | 30 dk | Push hook'ları (reaction/comment) |
| 8 | 30 dk | Type-check, build, deploy, smoke test |
| **Toplam** | **~5-6 saat** | |

---

## Kararlar (default'lar — onaysız ilerlerse böyle)

| # | Karar | Default |
|---|---|---|
| 1 | Caption max char | **500** |
| 2 | Bir postta max foto | **10** |
| 3 | Caption sonradan düzenlenebilir mi | **Hayır** (basitlik) |
| 4 | Akış sıralaması | **Pure chronological** (FOMO oluşturma) |
| 5 | Akıştaki entity tıklanınca | Kendi grubundaysa o kaynağa git; başkasının grubundaysa **no-op + tooltip** "ali'nin tatilinde" |
| 6 | Author tap | **No-op** (public profile sayfaları v2) |
| 7 | Block/report | **Yok** (v2) |
| 8 | Akış'a anonim erişim | **Yok** (login gerek) |
| 9 | İlk yükleme post sayısı | **20** |
| 10 | Comment max char | **500** |

---

## Açık riskler / not

1. **Foto bucket public**: bir post = foto URL'leri public. Bu zaten böyleydi (group invite linkini bilen biri görebilirdi). Akış bunu daha kolay erişilir kılar. v2 fix: signed URL'ler + private bucket.
2. **Spam akışı**: bir kullanıcı saatte 100 post atarsa akış kirlenir. Şu an rate-limit yok. v2: per-user "son 1 saatte max 10 post" check.
3. **Yorum spam'ı**: aynı şekilde rate-limit yok. v2.
4. **GDPR**: silinen post + yorum + reaction CASCADE ile temizlenir (user account deletion zaten çalışıyor).
5. **Push notif yangını**: popüler post (50 yorum) → her comment için push fanout patlar. Throttle: aynı (post, recipient) çiftine 5 dk içinde tek push.
