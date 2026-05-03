# baze v2 — anı deposu + sosyal öneri platformu

Status: APPROVED + executing. Created 2026-05-03. Supersedes `akis-public-feed.md`.

## Vizyon
**baze planner değil, anı deposu + sosyal öneri platformu olur.**

Üç ayak:
1. **Globe** — kişisel/grup haritası ("ben buralara gittim")
2. **Albüm** — şehir bazlı anı + foto deposu
3. **Akış** — sosyal feed (Twitter benzeri: keşfet + takip)

**Trip = sadece etiket** (ad + tarih). Expense, packing, itinerary, drag-reorder hepsi gider.

**Şehir sayfası** iki bölümlü: **bizimkiler** (grup) + **topluluk** (diğer baze kullanıcıları).

---

## Locked decisions (uygulamadan önce kilitlendi)

| # | Konu | Karar |
|---|---|---|
| 1 | Expense data | Backup → JSON, sonra drop |
| 2 | Follow sistemi | v1'de, full |
| 3 | Public profile (`/u/[id]`) | v1'de, full |
| 4 | `is_public` default | **false** — opt-in. Mevcut data sızmaz |
| 5 | Topluluk "kaydet" | Yer'i kendi grubuma **klonla** (yeni row, aynı place_id, kendi group_id) |
| 6 | Caption max | 500 |
| 7 | Comment max | 500 |
| 8 | Akış sıralaması | Pure chronological |
| 9 | Anonim erişim | Yok (login gerek) |
| 10 | İlk feed yüklemesi | 20 post |
| 11 | Reaction | ❤️ tek tip toggleable |
| 12 | Yorum | Düz metin, tek seviye |

---

## Bottom-nav + nav refactor

**Eski:** tatiller / globe / profil
**Yeni:** **globe / albüm / akış**

- **Tatil tab** kalkar → albüm üstünde **chip filtresi** olur ("tümü / Roma 2024 / İtalya 2025")
- **Profil** sağ-üstte avatar (her sayfada, auth/onboarding hariç) → tıkla `/profil`

---

## Schema

### Migration 0017_social.sql

```sql
-- 1. posts
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references members(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  caption text check (length(caption) <= 500),
  ref_type text not null check (ref_type in ('city','location','trip')),
  city_id uuid references visited_cities(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  snapshot jsonb not null, -- { title, subtitle?, country_code?, photo_urls: string[] }
  created_at timestamptz not null default now(),
  check (
    (case when city_id is not null then 1 else 0 end) +
    (case when location_id is not null then 1 else 0 end) +
    (case when trip_id is not null then 1 else 0 end) = 1
  )
);
create index idx_posts_recent on posts(created_at desc);
create index idx_posts_author on posts(author_id, created_at desc);

-- 2. reactions (heart only, toggleable)
create table post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index idx_reactions_post on post_reactions(post_id);

-- 3. comments (flat, max 500)
create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 500),
  created_at timestamptz not null default now()
);
create index idx_comments_post on post_comments(post_id, created_at);

-- 4. follows (member follows member)
create table follows (
  follower_id uuid not null references members(id) on delete cascade,
  followed_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_followed on follows(followed_id);

-- 5. is_public flags (opt-in to community)
alter table locations add column is_public boolean not null default false;
alter table visited_cities add column is_public boolean not null default false;

-- 6. member bio (public profile)
alter table members add column bio text check (length(bio) <= 200);
```

### Migration 0018_drop_planner.sql

```sql
-- BACKUP YAPILDI: docs/archive/expenses-backup-2026-05-03.json
drop table if exists settlements cascade;
drop table if exists expense_splits cascade;
drop table if exists expenses cascade;

-- locations.trip_id artık opsiyonel (yer trip'siz de eklenebilir)
alter table locations alter column trip_id drop not null;

-- trips düzleşir (drag-reorder gider)
alter table trips drop column if exists order_index;
```

---

## Server actions

### Yeni: `app/actions/posts.ts`
- `createPost({ refType, refId, caption, photoUrls })`
- `deletePost(postId)` — author only
- `toggleReaction(postId)`
- `addComment(postId, body)`
- `deleteComment(commentId)` — comment author or post author
- `loadFeed({ cursor, limit, mode: 'discover' | 'following' })`
- `loadComments(postId)`

### Yeni: `app/actions/follows.ts`
- `toggleFollow(memberId)`
- `loadFollowing(memberId?)`
- `loadFollowers(memberId?)`

### Yeni: `app/actions/community.ts`
- `loadCommunityLocations(cityName, countryCode, { cursor, limit })` — public locations from other groups
- `loadCommunityCityPhotos(cityName, countryCode)` — public city photos from other groups
- `saveLocationToOurGroup(sourceLocationId)` — clones to active group

### Düzenlenecek: `app/actions/trips.ts`
- Sil: `reorderTrips`, `removeTripCover` (sadeleşir veya kalır basitçe)
- Kalır: `createTrip`, `updateTrip` (sadece name + dates), `deleteTrip`

### Sil tamamen
- `app/actions/expenses.ts`

---

## UI değişiklikleri

### Silinecek dosyalar
- `components/expenses/add-expense-dialog.tsx`
- `components/expenses/balance-card.tsx`
- `components/expenses/expenses-tab.tsx`
- `components/expenses/settle-up-dialog.tsx`
- `lib/expenses.ts`
- `lib/currency.ts` (sadece expense'te kullanılıyorsa)

### Yeni dosyalar
- `app/akis/page.tsx`
- `app/u/[memberId]/page.tsx`
- `components/feed-card.tsx`
- `components/comments-accordion.tsx`
- `components/share-post-dialog.tsx`
- `components/follow-button.tsx`
- `components/header-avatar.tsx`
- `components/album-trip-chips.tsx`
- `components/community-locations.tsx`

### Düzenlenecek
- `components/bottom-nav.tsx` — tabs: globe / albüm / akış
- `components/app-header.tsx` — sağ-üst avatar slot
- `components/trip-detail-client.tsx` — ExpensesTab kaldır, sadece foto + yer listesi
- `components/trip-list.tsx` — drag-reorder kaldır
- `components/city-sheet.tsx` — community tab + is_public toggle + akışta paylaş butonu
- `components/location-list.tsx` — akışta paylaş action
- `components/album-grid.tsx` — üstte trip chip filtresi
- `lib/types.ts` — Expense/Settlement/ExpenseSplitMode kaldır; Post/PostReaction/PostComment/Follow ekle

---

## Implementation rounds (~10-12 saat)

| Round | Süre | İçerik |
|---|---|---|
| **A** | 2 saat | Backup expenses, migration 0018, expense kodu sil, trip detail sadeleştir, locations.trip_id nullable, drag-reorder kaldır |
| **B** | 30 dk | Bottom-nav refactor, header-avatar component, profil tab kaldır |
| **C** | 45 dk | Albüm üstüne trip chip filtresi |
| **D** | 1 saat | Migration 0017, types.ts, posts/follows/community actions |
| **E** | 2 saat | /akis page, FeedCard, CommentsAccordion, infinite scroll, 2 tab |
| **F** | 1 saat | SharePostDialog + city/location/trip'te paylaş butonları |
| **G** | 1.5 saat | /u/[memberId] page, follow button, members.bio, profile tabs |
| **H** | 2 saat | CitySheet community tab, loadCommunityLocations, "kaydet" action, is_public toggle |
| **I** | 30 dk | Push hooks, build, deploy, smoke test |

---

## Risks (v1'de yok ama kabul edildi)

1. **Foto bucket public** — zaten böyleydi, akış görünürlüğü artırır. v2 fix: signed URLs + private bucket
2. **Spam akış** — rate limit yok. v2: per-user "son 1 saatte max 10 post"
3. **Yorum spam** — rate limit yok. v2
4. **Push fanout** — popüler post → 50 yorum → fanout. Throttle: aynı (post, recipient) çiftine 5 dk içinde tek push
5. **Block/report** — yok. v2
