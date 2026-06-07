# Cloudflare Workers + Hyperdrive + Supabase Postgres

Panduan ini dibuat berdasarkan pengalaman langsung setup project ini. Baca sebelum menyentuh konfigurasi database atau deploy.

---

## Stack

```
Hono + chanfana (OpenAPI)
  ↓
Drizzle ORM (node-postgres adapter)
  ↓
node-postgres / pg (driver)
  ↓
Cloudflare Hyperdrive (connection pooling)
  ↓
Supabase PostgreSQL (session pooler, port 5432)
```

---

## Aturan yang WAJIB diikuti

### 1. Driver: gunakan `pg` (node-postgres), BUKAN `postgres.js`

`postgres.js` tidak kompatibel dengan Cloudflare Workers runtime karena bergantung pada Node.js native TCP yang tidak tersedia penuh. Selalu gunakan `pg`.

```bash
# Versi minimum yang dibutuhkan Hyperdrive
pnpm add pg@>=8.16.3
pnpm add -D @types/pg
```

### 2. Drizzle adapter: gunakan `drizzle-orm/node-postgres`

```ts
// ✅ BENAR
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

// ❌ SALAH - tidak kompatibel dengan Workers
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
```

### 3. Gunakan `Client`, bukan `Pool`

Hyperdrive yang mengelola connection pool di sisi Cloudflare. Di dalam Worker, cukup buat `Client` baru per request.

```ts
app.use("*", async (c, next) => {
  const client = new Client({
    connectionString: c.env.HYPERDRIVE.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error("DB connect failed:", err);
    return c.json({ success: false, errors: [{ code: 7001, message: "Database connection failed" }] }, 500);
  }

  c.set("db", drizzle(client, { schema }));

  try {
    await next();
  } finally {
    client.end().catch((e) => console.error("DB end error:", e));
  }
});
```

### 4. Hyperdrive HARUS pakai port 5432 (session mode), BUKAN 6543

Port 6543 adalah PgBouncer transaction mode Supabase yang **tidak support prepared statements**. Drizzle + `pg` menggunakan parameterized queries yang akan gagal di port 6543 dengan error `"Failed query"`.

| Port | Mode | Prepared Statements | Digunakan |
|------|------|---------------------|-----------|
| 5432 | Session pooler | ✅ Support | ✅ Gunakan ini |
| 6543 | Transaction pooler (PgBouncer) | ❌ Tidak support | ❌ Jangan |

Konfigurasi Hyperdrive yang benar:
```
Host: aws-1-ap-northeast-2.pooler.supabase.com
Port: 5432  ← WAJIB session mode
Database: postgres
```

Untuk mengubah port Hyperdrive yang sudah terlanjur salah, update via Cloudflare dashboard atau MCP — tidak perlu deploy ulang Worker.

### 4b. Matikan Hyperdrive query caching untuk CRUD API

Hyperdrive punya fitur caching `SELECT` queries by default. Ini menyebabkan delay antara CUD dan GET — data sudah berubah di DB tapi GET masih return hasil cache lama.

**Untuk REST API yang sifatnya CRUD aktif, caching harus dimatikan:**

```json
"caching": {
  "disabled": true
}
```

Update via Cloudflare dashboard atau MCP — berlaku langsung tanpa deploy ulang.

Caching boleh dinyalakan hanya jika:
- Data jarang berubah (read-heavy, mostly static)
- Aplikasi toleran dengan data yang sedikit stale (misal laporan, katalog produk)
- Dan set `max_age` serendah mungkin (1-5 detik)

### 5. `compatibility_date` harus up to date

Gunakan tanggal hari ini atau tanggal terbaru. Versi lama bisa menyebabkan incompatibility dengan `pg` terbaru.

```jsonc
// wrangler.jsonc
{
  "compatibility_date": "2026-06-07", // update ke tanggal hari ini saat setup
  "compatibility_flags": ["nodejs_compat"]
}
```

### 6. `nodejs_compat` flag wajib ada

Tanpa flag ini, `pg` tidak bisa jalan di Workers.

```jsonc
"compatibility_flags": ["nodejs_compat"]
```

---

## Cara debug error production

### Error 1101: Worker threw exception (loading terus / timeout)

Request masuk tapi tidak ada log di `wrangler tail` → koneksi hang di `client.connect()`.

Penyebab umum:
- `pg` versi di bawah 8.16.3
- `postgres.js` dipakai sebagai driver
- `compatibility_date` terlalu lama

### Error 1101: "Failed query" (query dikirim tapi gagal)

Koneksi berhasil, tapi query gagal di Postgres.

Penyebab: Hyperdrive connect ke port 6543 (transaction mode) yang tidak support prepared statements.

Fix: Update Hyperdrive config ke port 5432.

### Cara lihat error detail

```bash
npx wrangler tail
```

Jalankan di terminal terpisah, lalu trigger request. Log error akan muncul real-time.

---

## Setup baru dari nol

Checklist saat setup project baru dengan stack ini:

- [ ] Install `pg@>=8.16.3` dan `@types/pg`
- [ ] Install `drizzle-orm`, `drizzle-kit`, `drizzle-zod`
- [ ] Gunakan adapter `drizzle-orm/node-postgres`
- [ ] Buat Hyperdrive di Cloudflare dashboard dengan port **5432**
- [ ] Set `caching.disabled: true` di Hyperdrive jika API bersifat CRUD aktif
- [ ] Set `compatibility_date` ke tanggal hari ini
- [ ] Pastikan `nodejs_compat` ada di `compatibility_flags`
- [ ] Jalankan `pnpm approve-builds` jika ada peringatan build scripts
- [ ] `wrangler.jsonc` tidak boleh ada `d1_databases` jika sudah pakai Hyperdrive

---

## File-file kunci di project ini

| File | Fungsi |
|------|--------|
| `src/index.ts` | Entry point, inisialisasi DB client per request |
| `src/db/schema.ts` | Drizzle table schema — single source of truth |
| `src/types.ts` | Type `AppEnv`, `AppContext`, `Db` |
| `wrangler.jsonc` | Konfigurasi Worker + Hyperdrive binding |
| `drizzle.config.ts` | Config drizzle-kit untuk migration |

---

## Scripts

```bash
pnpm dev          # Start dev server (Hyperdrive pakai localConnectionString)
pnpm deploy       # Deploy ke Cloudflare production
pnpm db:push      # Push schema langsung ke Supabase (butuh DATABASE_URL di .env)
pnpm db:generate  # Generate file migration SQL
pnpm db:studio    # Buka Drizzle Studio GUI
pnpm cf-typegen   # Regenerate worker-configuration.d.ts dari wrangler.jsonc
```

`worker-configuration.d.ts` adalah file **auto-generated**. Jangan edit manual. Jalankan `pnpm cf-typegen` setiap kali ada perubahan binding di `wrangler.jsonc`.
