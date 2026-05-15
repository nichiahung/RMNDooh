# RMNDooh - DOOH Advertiser Marketplace MVP

RMNDooh (Digital Out-Of-Home) 是一個面向廣告主的自助式投放平台 MVP (Minimum Viable Product)。
廣告主可以在此平台上用地圖或清單的方式探索數位戶外點位、建立 Media Plan、上傳廣告素材，並送出 Campaign。

**Live Demo**: [https://nichiahung.github.io/RMNDooh/](https://nichiahung.github.io/RMNDooh/)

## 🚀 快速開始 (Getting Started)

先決條件：請確保已安裝 [Node.js](https://nodejs.org/) (建議 v20+)。

1. 安裝依賴套件：
   ```bash
   npm install
   ```

2. 啟動本地開發伺服器：
   ```bash
   npm run dev
   ```

3. 打開瀏覽器訪問：[http://localhost:3000](http://localhost:3000)

## 📁 專案架構指南 (Documentation)

本專案將詳細的商業邏輯與技術規格分離，請參閱以下文件以了解更多：

- 🧭 **[USER_GUIDE.md](./USER_GUIDE.md)**：網站使用指南，涵蓋 Campaign Planner、Admin、Reports 與 Web Player 操作方式。
- 👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**：**強烈建議首先閱讀**。這是一份包含高階架構圖與 ER Model 關聯的 5 分鐘速成指南。
- 👉 **[AGENTS.md](./AGENTS.md)**：未來的 AI Agent 開發守則與術語表。
- 📖 **`docs/` 資料夾**：包含深度的技術規格，例如：
  - `DOOH_Advertiser_Marketplace_MVP_PRD_v0.1.md`: 產品需求文件
  - `docs/backend/step14-schema-design.md`: 完整的資料庫 Schema 設計 (Supabase / PostgreSQL)
  - `docs/backend/step15-api-design-v2.md`: 後端 API 設計與 Programmatic DOOH (RTB) 邏輯

## 🛠 技術棧 (Tech Stack)

### 目前 (MVP 階段)
* **Frontend**: Next.js 14+ (App Router), React, TypeScript
* **Styling**: Tailwind CSS
* **Map**: `react-leaflet` (OpenStreetMap)
* **State & Data**: Zustand (本地狀態), Mock Data JSON
* **Localization**: Custom Context-based i18n (`src/i18n`)
* **Deployment**: GitHub Pages (Static Export)

### 未來規劃 (Production 階段)
* **Backend & Auth**: Supabase (PostgreSQL, Edge Functions, Storage)
* **Real-time Bidding (RTB)**: OpenRTB Integration for Programmatic DOOH
* **Map Services**: Mapbox or Google Maps
* **Monitoring**: Proof-of-Play (PoP) Logging & Reporting

## 🤝 貢獻指南

如果你是 AI Agent，請在進行任何程式碼修改前，**務必**仔細閱讀 `AGENTS.md` 的強制路由規則。
