# 👑 YieldKing

A sustainable crypto idle game with real DeFi yield, prize pools, tournaments, and ads.

## 🚀 Deploy in 5 Minutes (Free)

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Test locally
```bash
npm start
# Opens at http://localhost:3000
```

### Step 3 — Deploy to Vercel (free)
1. Push this folder to a GitHub repo
2. Go to vercel.com → "Add New Project"
3. Import your GitHub repo
4. Click Deploy — done ✅

Your game is live at `https://your-project.vercel.app`

## 💰 Monetization (Phase 1 — No Crypto Needed)

- **Watch-to-earn ads** — replace the fake ads in AdBanner with real Coinzilla or Google AdSense slots
- **Coinzilla** — apply at coinzilla.com (crypto-native, high CPM ~$2–8)
- **AdSense** — apply at adsense.google.com (broader, lower CPM ~$0.5–2)

## 📋 Ad Integration

Replace the `AdBanner` component's button with a real ad iframe:

```jsx
// Coinzilla example
<iframe 
  src="https://coinzilla.com/your-zone-id" 
  width="728" height="90" 
  scrolling="no" frameBorder="0"
/>
```

## 🗺️ Roadmap

- Phase 1: Free-to-play + ads (NOW)
- Phase 2: MetaMask wallet connect + BNB testnet
- Phase 3: Aave yield integration + mainnet launch
- Phase 4: Cosmetic shop + premium membership

## 🛠️ Tech Stack

- React 18
- CSS-in-JS (no dependencies beyond React)
- localStorage for game saves
- SVG for the kingdom scene
- Deployable on Vercel, Netlify, or any static host
