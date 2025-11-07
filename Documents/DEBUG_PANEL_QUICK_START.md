# Debug Panel - Quick Start Guide

## 🚀 What is it?

A floating development tool that helps you quickly identify and fix issues during development. **Only visible in development mode.**

---

## 📍 Location

The debug panel appears in the **bottom-right corner** automatically when you run the app in development mode.

```bash
npm run dev
# Debug panel will appear automatically at http://localhost:5000
```

---

## 🎯 Key Features at a Glance

| Feature | What it Shows | Why it's Useful |
|---------|---------------|-----------------|
| **App Info** | Route, user role, version | Know where you are and who you're testing as |
| **WebSocket Status** | Connection status (🟢 connected / 🟡 polling) | See if real-time updates are working |
| **API Errors** | Failed requests with status codes | Catch API issues immediately |
| **Render Tracking** | Component render counts | Find performance bottlenecks |
| **Cache Info** | Number of cached queries | Understand cache state |
| **Actions** | Clear caches, hard reload | Quick fixes for common issues |

---

## 🎮 Controls

### Panel Controls
- **Drag**: Click yellow header and drag to move
- **Minimize**: Click ▢ icon to collapse
- **Close**: Click ✕ icon to hide completely
- **Reopen**: Click "Debug" button (bottom-right) to show again

### Quick Actions
- **Clear Caches**: Removes all cached data (React Query, localStorage, service worker)
- **Hard Reload**: Forces browser refresh without cache

---

## 🔍 Common Use Cases

### 1. Debugging API Errors
**Problem**: API requests are failing silently

**Solution**:
1. Open debug panel
2. Look at "API Errors" section
3. See exactly which endpoint failed and why
4. Fix the issue
5. Click "Clear" to remove error history

### 2. Finding Excessive Re-renders
**Problem**: Page feels sluggish

**Solution**:
1. Add `useDebugRender('ComponentName')` to suspected components
2. Open debug panel
3. Toggle "Render Tracking" visibility (eye icon)
4. See which components are rendering most
5. Optimize high-count components

### 3. WebSocket Not Working
**Problem**: Real-time updates aren't showing

**Solution**:
1. Open debug panel
2. Check "Connection" section
3. 🟢 Green = WebSocket connected (good)
4. 🟡 Yellow = Polling mode (fallback)
5. If yellow, check server logs for WebSocket errors

### 4. Stale Cache Issues
**Problem**: Old data is showing after updates

**Solution**:
1. Open debug panel
2. Click "Clear Caches" button
3. Confirm the alert
4. Page reloads with fresh data

### 5. Testing Different User Roles
**Problem**: Need to see what coordinators see vs ministers

**Solution**:
1. Open debug panel to see current role
2. Go to Settings → Dev Mode tab
3. Switch roles
4. Debug panel confirms new role immediately

---

## 💻 Using Debug Utilities in Code

### Track Component Renders

```typescript
import { useDebugRender } from '@/lib/debug';

export function MyComponent() {
  useDebugRender('MyComponent'); // This line tracks renders

  return <div>My content</div>;
}
```

Now "MyComponent" appears in the debug panel's Render Tracking section!

### Debug Logging (Only in Dev)

```typescript
import { debugLog } from '@/lib/debug';

function handleSubmit() {
  debugLog('Form submitted', { userId: 123, action: 'create' });
  // Only logs in development, silent in production
}
```

### Measure Render Performance

```typescript
import { measureRender } from '@/lib/debug';
import { useEffect } from 'react';

export function ExpensiveComponent() {
  const endMeasure = measureRender('ExpensiveComponent');

  useEffect(() => {
    endMeasure(); // Logs: "ExpensiveComponent rendered in 45.23ms"
  });

  return <div>Content</div>;
}
```

---

## 🎨 Visual Indicators

### WebSocket Status
- 🟢 **Green pulsing dot** = Connected (real-time updates working)
- 🟡 **Yellow solid dot** = Polling (checking every 5 minutes)

### API Errors
- ✅ **Green alert** = No errors (all good!)
- 🔴 **Red alerts** = Errors detected (needs attention)

### Render Tracking
- **Higher number** = More renders (investigate if very high)
- **Top 10 shown** = Most-rendered components listed first

---

## 🚫 Troubleshooting

### Debug panel not showing?

**Check:**
1. Running in development mode? (`npm run dev`)
2. Accessing via localhost? (`http://localhost:5000`)
3. Panel closed? Look for "Debug" button in bottom-right

**Fix:**
```bash
# Make sure NODE_ENV is not set to production
echo $NODE_ENV  # Should be empty or "development"

# Restart dev server
npm run dev
```

### API errors not appearing?

The panel only tracks `fetch()` requests. If you're using axios or another HTTP client, errors won't show.

### Render tracking empty?

You need to add `useDebugRender('ComponentName')` to components you want to track. It doesn't track automatically.

---

## 📊 Example Workflow

**Scenario**: Dashboard is slow and showing old data

**Steps**:

1. **Open debug panel**
   - See current route: `/dashboard`
   - See user role: `coordenador`

2. **Check API errors**
   - ❌ Spot: `500 Internal Server Error` from `/api/dashboard/stats`
   - Fix backend endpoint

3. **Add render tracking**
   ```typescript
   // In dashboard.tsx
   useDebugRender('Dashboard');
   useDebugRender('DashboardStatsCards');
   ```

4. **Check render counts**
   - Dashboard: 2 renders ✅ (normal)
   - DashboardStatsCards: 47 renders ❌ (too many!)

5. **Fix excessive renders**
   - Add `React.memo()` to DashboardStatsCards
   - Add dependency arrays to useEffect hooks

6. **Clear cache and test**
   - Click "Clear Caches"
   - Verify: DashboardStatsCards now renders 2 times ✅

7. **Close debug panel**
   - Click ✕ to hide
   - Page now fast and showing fresh data ✅

---

## 🎓 Pro Tips

1. **Keep it open on a second monitor** during development
2. **Check it after every major change** to catch issues early
3. **Clear caches when weird bugs appear** - often fixes state issues
4. **Track only important components** - don't track every button and div
5. **Use debugLog instead of console.log** - cleaner dev experience

---

## 📦 What Gets Cleared?

When you click "Clear Caches", the following are removed:

✅ **React Query cache** (all API data)
✅ **localStorage** (except theme preference)
✅ **sessionStorage** (all)
✅ **Service Worker caches** (all)

❌ **Not cleared**: Cookies, IndexedDB, browser cache

---

## 🔒 Production Safety

**In Production:**
- Debug panel: ❌ **NOT RENDERED**
- Debug utilities: ❌ **NO-OPS** (do nothing)
- Bundle impact: ✅ **0 KB** (tree-shaken out)
- Performance: ✅ **ZERO OVERHEAD**

The panel only appears when:
- `import.meta.env.DEV === true`, OR
- `window.location.hostname === 'localhost'`

---

## 📖 Full Documentation

For detailed documentation, see: [DEBUG_PANEL.md](./DEBUG_PANEL.md)

---

## 🆘 Need Help?

1. Read [DEBUG_PANEL.md](./DEBUG_PANEL.md) for detailed docs
2. Check browser console for additional debug logs
3. Open GitHub issue with:
   - What you're trying to debug
   - What the panel is showing
   - Expected vs actual behavior

---

**Quick Start Created**: 2025-10-11
**Version**: 5.4.2
**Status**: ✅ **READY TO USE**
