<div align="center">

# 🔥 MAYHEM

### Monster Fighting Arena

**Create your legend. Collect the extraordinary. Fight for glory.**

An open-source, browser-based monster-collecting and turn-based battle game.
You can turn any image into a fighter, build a squad of three and take it into the arena.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-powered-3448c5?logo=cloudinary&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b)
![Built with AdaL](https://img.shields.io/badge/Built_with-AdaL-ff6a00)

</div>

---

## ⚔️ About

MAYHEM is a dark-fantasy creature-collecting game that runs in the browser on desktop, tablet and mobile. It has no installs and no accounts.

- **Collect** distinct monsters across six elements and four rarity tiers.
- **Create** your own monster from any photo. Cloudinary hosts, crops and optimises the artwork.
- **Battle** rival tamers in turn-based fights. Fights use elemental matchups, special abilities, shields, items and switching.
- **Progress** by earning coins and XP, completing daily quests, unlocking legendary species and levelling up your summoner.

MAYHEM is **open source** under the MIT License. You're welcome to fork it, mod it, reskin it or learn from it.

---

## 🎮 Features

### 🏠 Discover
- Cinematic hero scene with a battle-damaged arcade logo
- Rising fire embers, lightning flashes, claw-slash effects and a "READY… FIGHT!" announcer
- Daily login rewards, daily quests, collection progress and featured discoveries

### 📚 Collection
- Collectible trading-card frames with distinct art for every monster
- **Common · Rare · Epic · Legendary** tiers, with foil and holographic finishes on higher rarities
- Search, element and rarity filters, sorting, favourites
- Locked species that unlock through summoner level and coins

### ✨ Create Your Monster
- Upload, drag-and-drop or paste an image, or use bundled sample art
- Live collectible-card preview
- Choose a name, element and rarity, then roll stats within balanced game rules
- Cloud upload with honest progress and error reporting, plus a fallback that saves the art on the device
- A full-screen card reveal when your monster is born

### ⚔️ Battle Arena
- Pick a squad of 3. Your first pick leads the charge.
- Three difficulty tiers, each with its own venue:

  | Tier | Venue | Atmosphere |
  |---|---|---|
  | Rookie | Verdant Ruins | Drifting leaves, emerald glow |
  | Veteran | Stormspire Citadel | Rain, lightning, electric arcs |
  | Champion | Infernal Throne | Firestorm, embers, heat haze |

- **Attack · Special · Defend · Switch · Items**, with keyboard shortcuts `1`–`5`
- Elemental advantage chart, speed-based turn order, crits, burn, stun, shields and buffs
- Floating damage numbers, element-specific idle animations and particle effects
- Full-screen battle mode
- Victory and defeat screens with grades, XP, coins and monster drops

### 🏆 Progression
- Summoner levels, monster levels and a monster level cap
- Stat boosts, learnable skills and a shop with battle items
- Achievements, collection milestones and login streaks
- Progress saves automatically

### 🔊 Audio
- An audio engine built on the Web Audio API, with no audio files to download
- War-drum and brass soundtrack, with separate menu and battle moods
- Distinct sounds for attacks, specials (one per element), shield blocks, thunder on switch-in, the fight intro, victory, defeat, rewards, upgrades and purchases
- Music and sound toggles, saved between sessions

### 📱 Mobile
- Responsive layouts from small phones to ultrawide monitors
- Safe-area aware (notches and home bars), uses the dynamic viewport height and touch-friendly controls
- Can be installed to the home screen as a full-screen web app
- Respects `prefers-reduced-motion`

---

## ☁️ Powered by Cloudinary

Cloudinary handles all image work in MAYHEM: uploads, hosting, transformation and optimised delivery.

| Capability | How MAYHEM uses it |
|---|---|
| **Unsigned uploads** | Players upload monster art straight from the browser using an unsigned preset, with live progress. The API secret never touches the frontend. |
| **Automatic format and quality** | `f_auto,q_auto` serves WebP or AVIF at the best quality for each device. |
| **Smart cropping** | `c_fill,g_auto` crops to the subject to fill the 3:4 card frame, at thumbnail, card and full-size widths. |
| **AI background removal** *(optional)* | `e_background_removal` creates a cut-out of your creature. This needs the add-on. If it isn't available, the original image is used. |
| **Composed share cards** | Cloudinary renders a shareable card with text overlays (name, rarity, stats, ability), a rarity-coloured border and rounded corners. `fl_attachment` turns it into a download link. |
| **Efficient delivery** | Images load from the CDN at responsive sizes, with lazy loading and graceful fallbacks. |

Game state stays separate from image hosting. Monster stats, inventory, progression and battle logic live in the game layer. Cloudinary only stores and delivers pixels.

> **No Cloudinary account?** MAYHEM still works. Uploaded art is cropped and compressed in the browser and saved on the device. The game tells you this clearly and never pretends an upload succeeded.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm

### Install and run

```bash
git clone <your-fork-url> mayhem
cd mayhem
npm install --include=dev
npm run dev
```

Open **http://localhost:5173**.

### Production build

```bash
npm run build
npm run preview
```

---

## 🔧 Cloudinary Configuration

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Copy `.env.example` to `.env.local`.
3. Fill in the browser-safe values:

   ```env
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
   ```

4. In the Cloudinary console, go to **Settings → Upload → Upload presets** and add an **unsigned** preset:
   - Allowed formats: `jpg, png, webp, gif`
   - Max file size: `10 MB`
   - Folder: `monstersnap`
5. Restart `npm run dev`.

> 🔒 **Security:** never put your Cloudinary **API secret** in a `VITE_` variable. Vite bundles anything prefixed with `VITE_` into the public JavaScript. Server-side credentials (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) belong only in local Node scripts, never in the client.

---

## 🗂️ Project Structure

```
src/
├─ game/         Types, elements and type chart, monster roster, stats, rules,
│                battle engine (AI, damage, turn order), progression
├─ services/     cloudinary.ts   uploads and transformation URLs
│                sound.ts        Web Audio engine (SFX and adaptive music)
│                shareCard.ts    canvas-rendered collectible cards
│                persistence.ts  storage adapter (localStorage by default)
├─ state/        GameContext.tsx player state, rewards, achievements, toasts
├─ components/   Layout, Brand (logo), MonsterCard, MonsterDetail, fx (particles
│                and reveal), ui primitives
├─ screens/      Home, Collection, Create, Battle, Shop, Progress, Guide
├─ index.css     Tailwind theme and core styles
└─ fx.css        Animations, venues, battle layout, mobile polish
public/
├─ monsters/     Monster artwork (WebP)
└─ art/          Hero and arena scenes
```

### Saves
Progress is saved to `localStorage` through the `StorageAdapter` interface in `services/persistence.ts`. To move saves to a backend, implement a new adapter. No game logic needs to change.

---

## 🕹️ How to Play

1. **Collect.** Start with a squad of starters. Unlock more species in the Collection.
2. **Create.** Snap an image in the Create studio to forge a one-of-a-kind monster.
3. **Assemble.** Choose three monsters in the Arena. Mix elements to cover weaknesses.
4. **Fight.** Use the type chart. Specials hit hard but need to recharge. Defend to soak a big hit. Switch to dodge a bad matchup.
5. **Grow.** Spend coins on boosts, skills and items. Climb summoner levels to raise the monster level cap.

An in-game **How to Play** page explains every rule in detail.

---

## 🤝 Contributing

Contributions are welcome. Ideas: new monsters, venues, abilities, balance tweaks, translations, accessibility improvements or a real backend.

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-idea`
3. Commit your changes: `git commit -m "Add my idea"`
4. Push and open a Pull Request

Please keep secrets out of commits and match the existing code style.

---

## 🧠 Built with AdaL

MAYHEM was designed and developed with **AdaL**, an AI-assisted development workflow. AdaL helped with game design, UI and UX, the battle engine, the procedural audio and the Cloudinary integration.

---

## 📄 License

Released under the **MIT License**. See [`LICENSE`](./LICENSE). You're free to use, modify and distribute this project, including commercially, as long as the copyright notice is kept.

<div align="center">

**⚔️ Enter the arena. Unleash MAYHEM. ⚔️**

</div>
