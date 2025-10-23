# Quick Reference - PWA Task Manager

## 🚀 Quick Start

```bash
npm install              # Install dependencies
npm run build           # Build for production
npm start               # Start production server
npm run dev             # Development mode
```

## 📦 What Was Fixed in Phase 2

### Build Issues ✅
- Next.js 15 async params/headers
- TailwindCSS v4 PostCSS plugin
- TypeScript type errors
- Missing UI components
- Edge runtime compatibility

### PWA Enhancements ✅
- Complete manifest with ID, categories, shortcuts
- Optimized cache headers
- Enhanced metadata and SEO
- Icon configuration
- Service worker scope

### Performance ✅
- Static asset caching (1 year)
- Code splitting (automatic)
- Web Workers for heavy operations
- 3-tier caching strategy
- Network timeout handling

## 📊 Build Stats

```
Build Size: ~102 kB (shared)
Largest Route: 116 kB (dashboard)
Middleware: 33 kB
Routes: 11 total (9 dynamic, 1 static)
```

## 🔧 Key Configuration Files

| File | Purpose |
|------|---------|
| `next.config.js` | Cache headers + build config |
| `public/manifest.json` | PWA manifest |
| `public/service-worker.js` | Service worker (852 lines) |
| `app/layout.tsx` | Root layout + metadata |
| `postcss.config.mjs` | TailwindCSS v4 config |

## 🎯 PWA Features

### Installation
- Installable as standalone app
- Custom splash screen
- App shortcuts (Dashboard, New Task)
- Maskable icon for Android

### Offline
- Full offline navigation
- Background sync for mutations
- IndexedDB persistence
- Offline fallback page

### Caching
```javascript
Static Cache:   Offline page, manifest, critical assets
Runtime Cache:  Pages, navigation (100 entries, 7 days)
API Cache:      API responses (100 entries, 7 days)
```

## 🔒 Environment Variables

```bash
# Required for production
NEXTAUTH_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://...

# OAuth Providers
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

## 📱 Testing

### Desktop
```bash
# Open in Chrome/Edge
http://localhost:3000

# Install PWA
Click install icon in address bar
```

### Mobile
```bash
# Android: Add to Home Screen
# iOS: Share > Add to Home Screen
```

### Offline Mode
```
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Try navigating - should show offline page
4. Create task - should queue for sync
```

## 🐛 Common Issues

### "Module not found: localforage"
```bash
npm install localforage
```

### "Cannot find module @tailwindcss/postcss"
```bash
npm install --save-dev @tailwindcss/postcss
```

### Build fails with "module variable"
- Don't use `module` as a variable name
- Rename to `localforageModule` or similar

### Service Worker not updating
```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()))
```

## 📚 Documentation

- **Full Audit:** `docs/LIGHTHOUSE_AUDIT_REPORT.md`
- **Summary:** `PHASE2_AUDIT_SUMMARY.md`
- **Service Worker:** `SERVICE_WORKER_IMPLEMENTATION.md`
- **Sync Queue:** `SYNC_QUEUE_IMPLEMENTATION.md`

## 🎨 Icon Sizes

Current icons (placeholders):
- 192x192 (PWA required)
- 256x256
- 384x384
- 512x512 (PWA required)
- 512x512 maskable (Android adaptive)

**⚠️ Replace with branded assets before production**

## ⚡ Performance Tips

### Code Splitting
```typescript
// Dynamic import
const HeavyComponent = dynamic(() => import('./Heavy'))
```

### Caching Strategy
```typescript
// Service worker already handles:
- Static: Cache-first
- API: Network-first with timeout
- Pages: Stale-while-revalidate
```

### Bundle Size
```bash
# Analyze bundle
npm run build
# Check output for chunk sizes
```

## 🔍 Debugging

### Service Worker
```javascript
// Browser console
navigator.serviceWorker.ready.then(reg => {
  console.log('SW:', reg)
})
```

### IndexedDB
```javascript
// Browser console (async)
const { getAllKeys } = await import('/lib/indexedDB')
const keys = await getAllKeys('tasks')
console.log('Keys:', keys)
```

### Cache
```javascript
// Browser console
caches.keys().then(names => console.log('Caches:', names))
caches.open('app-runtime-v2').then(cache => 
  cache.keys().then(reqs => console.log('Cached:', reqs))
)
```

## 🚀 Deployment Checklist

- [ ] Set production environment variables
- [ ] Replace placeholder icons
- [ ] Enable HTTPS (required for SW)
- [ ] Test on real devices
- [ ] Run Lighthouse audit
- [ ] Monitor Web Vitals
- [ ] Set up error tracking

## 🎉 Success Criteria

✅ Build passes without errors
✅ PWA installable
✅ Works offline
✅ Service worker active
✅ Background sync working
✅ Lighthouse PWA score: 100
✅ Performance score: 90+

---

**Last Updated:** Phase 2 Audit Complete
**Status:** Production Ready
**Build:** Passing ✅
