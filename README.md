# SUSU 訂單管理系統

中小商家協作型接單系統

## 技術架構

- **前端**：Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **後端/DB**：Supabase self-hosted（PostgreSQL + Auth + Storage）
- **AI 功能**：Anthropic API Multi-agent
- **部署**：Docker Compose（本地）

## 專案結構

```
susu/
├── docker-compose.yml       # Supabase self-hosted
├── supabase/
│   └── migrations/
│       └── 001_init_schema.sql  # 資料庫 Schema
├── volumes/                 # Supabase 資料儲存
└── web/                     # Next.js 前端
    └── src/
        ├── app/
        │   ├── (auth)/      # 登入頁面
        │   ├── (dashboard)/ # 業主後台
        │   └── (public)/    # 客戶前台
        ├── lib/
        │   └── supabase/    # Supabase client
        └── types/           # TypeScript 型別
```

## 帳號存在
suppabase 連動github
只要本地push 上去，就能更新web
vercel, github 帳號 kurt1014


## 啟動步驟

### 1. 啟動 Supabase

```bash
# 複製 env 設定（第一次）
cp supabase-env-example.txt .env

# 啟動所有服務
docker compose up -d

# 確認服務狀態
docker compose ps
```

**Supabase Studio**：http://localhost:3000  
**API**：http://localhost:8000

### 2. 啟動 Next.js

```bash
cd web

# 複製 env 設定（第一次）
cp env.local.example .env.local

# 安裝依賴
pnpm install

# 開發模式
pnpm dev
```

**前端**：http://localhost:3001

### 3. 執行資料庫 Migration

在 Supabase Studio（http://localhost:3000）的 SQL Editor 中，  
執行 `supabase/migrations/001_init_schema.sql` 的內容。

## 系統功能

### 業主後台（/admin）
- 商品管理
- 包材/供應商管理（含多層折扣）
- 活動管理
- 訂單管理
- 會員管理
- 採購單管理

### 客戶前台（/activity/[id]）
- 查看活動商品
- 填單下單
