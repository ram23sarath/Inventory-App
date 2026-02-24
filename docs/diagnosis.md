# Diagnosis: Infinite Loading in Inventory App

## Executive Summary

The Inventory App's infinite loading spinner is caused by **an unhandled promise rejection in the auth bootstrap flow** (`useAuth.tsx`). When `supabase.auth.getSession()` fails — due to network errors, stale service worker cache, or CORS issues — the `.then()` callback never fires, and `isLoading` remains `true` indefinitely. The app renders an eternal `<Spinner />` with no error message or recovery path.

A secondary contributing factor is the **PWA service worker caching all Supabase API calls** (including auth endpoints), which can serve stale or opaque responses that cause unexpected client behavior.

## Supporting Evidence

### Code Path Analysis

```
App.tsx:8  → if (isLoading) return <Spinner />   ← stuck here forever
  ↑
useAuth.tsx:29 → isLoading: true                  ← initial state
  ↑
useAuth.tsx:47 → getSession().then(...)            ← NO .catch() ← ROOT CAUSE
  ↑
useAuth.tsx:51 → supabase.from('admins')...        ← can also throw (no try/catch)
```

### Service Worker Config

```typescript
// vite.config.ts:54 - caches ALL supabase URLs including auth
urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
cacheableResponse: { statuses: [0, 200] } // status 0 = opaque = dangerous
```

## Confirmed Hypotheses

| # | Hypothesis | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | `getSession()` rejection unhandled | **Confirmed** | No `.catch()` on line 47; `isLoading` only set false in `.then()` |
| 2 | Admin check throws unhandled | **Confirmed** | No try/catch around `supabase.from('admins')` on lines 51-56 |
| 3 | SW caches auth responses | **Contributing** | `urlPattern` matches all `supabase.co` URLs |
| 4 | HTTP caching headers | Rejected | No custom headers set in app code |
| 5 | Short token/cookie expiry | Rejected | Uses localStorage, not cookies; auto-refresh enabled |
| 6 | localStorage key collision | Rejected | Offline cache uses separate keys |
| 7 | CORS/network errors | Contributing | Would trigger the unhandled rejection |

## Prioritized Action List

1. **NOW**: Add `.catch()` + timeout to `getSession()` in `useAuth.tsx` ← fixes infinite loading
2. **NOW**: Add error display screen in `App.tsx` ← gives users a recovery path
3. **NOW**: Exclude auth endpoints from SW cache in `vite.config.ts` ← prevents stale auth
4. **LATER**: Fix pre-existing `AddItemForm.test.tsx` failure (missing `subSection` param)
5. **LATER**: Consider Supabase PKCE flow if app becomes multi-user
