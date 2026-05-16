# Mock Auth & Role-Based Flow — 設計規格

**日期**: 2026-05-16  
**狀態**: 已核准，待實作

---

## 問題

`WorkspacePage` 目前用 dropdown 模擬角色切換，缺乏真正的「登入門禁」。使用者希望透過帳號登入來決定看到哪些功能，讓 demo 情境更真實。

## 目標

- 加入 mock 登入頁面（純前端驗證，不涉及後端 Auth）
- 登入帳號決定角色，角色決定可見功能
- Session 存入 `localStorage`，刷新後保持登入狀態
- 未登入時任何頁面都 redirect 到 `/login`

---

## 測試帳號

| Email | 密碼 | 角色 | 可見功能 |
|-------|------|------|---------|
| `advertiser@demo.com` | `demo1234` | `advertiser` | 自助購買流程 |
| `sales@demo.com` | `demo1234` | `sales` | 專案提案流程 |
| `admin@demo.com` | `demo1234` | `admin` | 兩者 + 管理後台 |

---

## 架構

### 新增：`src/context/AuthContext.tsx`

提供全局 Auth 狀態：

```ts
type Role = 'advertiser' | 'sales' | 'admin';

interface AuthUser {
  email: string;
  role: Role;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => boolean; // returns false if invalid
  logout: () => void;
}
```

- 初始化時從 `localStorage.getItem('dooh_mock_user')` 讀取（JSON parse）
- `login()` 對照硬編碼帳號表，成功寫入 `localStorage`，失敗回傳 `false`
- `logout()` 清除 `localStorage`，重設 state

### 新增：`src/app/login/page.tsx`

- Email + 密碼輸入欄位
- 「登入」按鈕，呼叫 `login()`
- 登入失敗：顯示行內錯誤訊息「帳號或密碼錯誤」
- 登入成功：`router.push('/workspace')`
- 已登入時訪問此頁：`router.replace('/workspace')`

### 新增：`src/components/AuthGuard.tsx`

- Client component，包裹需要保護的頁面
- `currentUser === null` → `router.replace('/login')`
- 否則 render children

### 修改：`src/app/layout.tsx`

- 加入 `<AuthProvider>` 包裹整個 app

### 修改：各保護頁面的 `page.tsx`

用 `<AuthGuard>` 包裹：`/`、`/workspace`、`/campaign-planner`、`/assets`、`/proposal-builder`、`/proposal-review`、`/admin`

### 修改：`src/components/workspace/WorkspacePage.tsx`

- 移除 `role` state 和 dropdown 模擬器
- 改從 `useAuth()` 取得 `currentUser.role`
- `showSelfService` / `showProposals` 邏輯不變

### 修改：`src/components/AppNav.tsx`

- 右上角：顯示 `currentUser.email` + 登出按鈕
- 登出按鈕呼叫 `logout()` 後 `router.push('/login')`
- 移除現有「建立提案」/「新增活動」快捷按鈕（改由 Workspace 提供入口，避免角色不符時按鈕出現）

---

## 路由保護邏輯

| 狀況 | 行為 |
|------|------|
| 未登入，訪問任何保護頁面 | redirect `/login` |
| 已登入，訪問 `/login` | redirect `/workspace` |
| 已登入，訪問 `/admin`，role ≠ `admin` | redirect `/workspace` |
| 登出 | 清除 localStorage，redirect `/login` |

---

## 不在本次範圍內

- 真實 Supabase Auth / JWT
- 密碼加密（純 demo，明文對照）
- 帳號管理 UI（新增/刪除帳號）
- 記住我 / token 刷新
