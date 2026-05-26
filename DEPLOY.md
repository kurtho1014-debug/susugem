# SUSU 部署指南

## 架構

```
GitHub（程式碼）
    ↓ 自動部署
Vercel（Next.js 前端）  ←→  Supabase Cloud（資料庫 + Auth + Storage）
```

---

## 一、建立 Supabase Cloud 專案

1. 前往 https://supabase.com，登入後點 **New project**
2. 填入專案名稱（例：susu）、設定資料庫密碼（記下來）、選擇離台灣最近的 Region（**Singapore** 或 **Tokyo**）
3. 等待約 1 分鐘專案建立完成

### 執行 Migration（建立資料表）

進入 Supabase Dashboard → **SQL Editor**，依序把以下檔案內容貼上執行：

```
supabase/migrations/001_init_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_grants.sql
supabase/migrations/004_schema_fixes.sql
supabase/migrations/005_storage.sql
supabase/migrations/006_products_cost_price.sql
supabase/migrations/007_anon_materials_read.sql
supabase/migrations/008_activity_delivery_methods.sql
supabase/migrations/009_orders_email.sql
supabase/migrations/010_activity_steps.sql
```

### 設定 Storage Bucket

Dashboard → **Storage** → 確認 `product-images`、`activity-images`、`material-images` bucket 已建立
（migration 005 會自動建，若沒有就手動建，權限設 Public）

### 取得 API 金鑰

Dashboard → **Settings** → **API**，複製：
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 不可公開）

---

## 二、推上 GitHub

```bash
# 在 susu/ 根目錄
git init
git add .
git commit -m "initial commit"

# 到 github.com 建立新 repo（建議設為 Private）
git remote add origin https://github.com/你的帳號/susu.git
git push -u origin main
```

---

## 三、部署到 Vercel

1. 前往 https://vercel.com，用 GitHub 帳號登入
2. 點 **Add New Project** → 選剛剛的 repo
3. **Root Directory** 改為 `web`（重要！）
4. Framework 會自動偵測為 Next.js
5. 展開 **Environment Variables**，填入三個變數：

| 變數名稱 | 值 |
|---------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |

6. 點 **Deploy**，等約 1 分鐘

完成後 Vercel 會給你一個網址，例如 `https://susu.vercel.app`

---

## 四、之後更新

只需要：

```bash
git add .
git commit -m "更新內容"
git push
```

Vercel 自動偵測到 push，自動重新部署，約 30 秒完成。

---

## 本機開發（維持原本的 Docker）

本機開發流程不變：

```bash
# 啟動 Supabase
docker compose up -d

# 啟動 Next.js
cd web
pnpm dev
```

`.env.local` 本機用 `http://localhost:8000`，Vercel 上用 Supabase Cloud 的 URL。
兩個環境互不干擾。
