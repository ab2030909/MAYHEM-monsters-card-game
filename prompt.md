# MonsterSnap — Build the Complete Game

You are a senior game developer, frontend engineer, and professional UI/UX designer. Your task is to **start building MonsterSnap immediately**. Do not spend time producing a long plan or asking me for confirmation. Inspect the existing project, make sensible technical decisions, and implement the game directly in the codebase.

## 1. Strict Execution Instructions

- **Start coding immediately.** Inspect the repository, identify the existing framework, and begin implementation.
- **NO TESTING.** Do not create or run unit tests, integration tests, end-to-end tests, test suites, or test-only files. Do not spend time testing the application.
- **NO LONG THINKING OR EXTENSIVE PLANNING.** Think briefly, make decisions, and execute. Do not produce a lengthy plan before writing code.
- Do not ask me to approve routine decisions. Use your own judgment.
- Do not stop after creating a design, mockup, scaffold, or basic landing page. Build a functional, playable game.
- Do not leave TODO placeholders, fake buttons, empty screens, or unfinished primary features.
- Install the required dependencies if necessary.
- Reuse the current project structure and working configuration where possible. Do not unnecessarily overwrite existing files.
- If an API key or external service credential is unavailable, implement the integration structure and a useful local fallback. Continue building instead of stopping.
- Prioritize implementation, visual quality, gameplay, and a working development setup.
- After implementation, provide a short summary of what you built and the command to run it. Do not run tests.

## 2. Game Concept

Build **MonsterSnap**, a polished browser-based monster collection and battle game.

Players discover, create, collect, customize, and battle monsters. They can upload their own images to create unique monster cards. Each monster has its own artwork, name, element, rarity, statistics, and special ability.

The core gameplay loop is:

Discover monsters → Create or collect a monster → Build a team → Battle opponents → Earn rewards → Unlock more monsters and customization options.

The result should feel like a real indie game with professional product design, not a generic dashboard or a basic CRUD application.

## 3. Visual Design — Extremely Important

Create a beautiful, cohesive, professional game interface.

### Art direction

Use a premium, playful fantasy aesthetic with:
- Rich dark backgrounds and deep indigo or midnight-purple surfaces.
- Vibrant violet, electric blue, cyan, and restrained orange accents.
- Soft gradients, atmospheric glows, subtle particles, and polished lighting.
- Large, expressive monster artwork.
- Distinctive collectible card frames.
- Strong typography and excellent visual hierarchy.
- Carefully balanced spacing and rounded corners.
- Subtle shadows and depth without excessive glassmorphism.
- Smooth hover states, transitions, card reveals, and battle animations.

Make the interface feel like a combination of a premium indie monster-collecting game and a modern gaming product.

Use a consistent design system for colors, typography, spacing, cards, buttons, dialogs, rarity tiers, and interactive states.

**Do not make the UI look like an admin panel, analytics dashboard, generic SaaS website, or unstyled starter template.**

### Main game layout

Create a persistent game navigation system with:
- Home / Discover
- Monster Collection
- Create Monster
- Battle Arena
- Profile / Progress

Use a polished sidebar on desktop or a compact navigation rail if that fits the design better. On mobile, use a responsive navigation pattern that preserves the game experience.

### Home screen

The home screen must immediately communicate that this is a game.

Include:
- A visually striking hero section featuring an original fantasy monster.
- The title “MonsterSnap”.
- A concise tagline such as “Create your legend. Collect the extraordinary.”
- A prominent “Enter the Arena” button.
- A “Create Your Monster” secondary action.
- Featured monsters with distinct artwork and rarity labels.
- Daily reward or quest cards.
- Player level, XP progress, and collection progress.
- A recently discovered monsters section.

Use real visual assets or generate attractive original monster illustrations where asset generation tools are available. Avoid using emoji as the main monster artwork.

## 4. Monster Collection System

Build a functional collection screen with a responsive grid of collectible monster cards.

Each card should include:
- Monster artwork.
- Name and elemental type.
- Rarity.
- Level.
- Attack, defense, and speed indicators.
- A visual rarity treatment.
- A hover interaction that reveals additional information.
- A detail view when clicked.

Support these rarity tiers:
- Common
- Rare
- Epic
- Legendary

Use distinct but tasteful visual treatments for each tier. Legendary monsters should feel special.

Include:
- Search by monster name.
- Filters by element and rarity.
- Sorting by level, rarity, or power.
- Collection completion progress.
- Empty states that look intentional.

Provide a starter collection of at least 12 distinct monsters. Use unique artwork, names, types, and balanced stats. Do not simply duplicate the same monster under different names.

Suggested elemental types:
Fire, Water, Nature, Electric, Shadow, and Crystal.

Create an original monster roster with memorable names such as Emberclaw, Voltbyte, Mossling, Aquaphantom, Nightfang, and Crystalis.

## 5. Create Monster — Core Cloudinary Feature

This is one of the most important parts of the game.

Create a beautiful monster creation studio where players can turn their own images into collectible monsters.

### User workflow

1. The player opens Create Monster.
2. The player uploads an image or selects an existing image.
3. Display a preview immediately.
4. Let the player enter a monster name.
5. Let the player select an elemental type.
6. Let the player choose or generate a rarity using controlled game rules.
7. Show the proposed monster statistics.
8. Generate a polished collectible card preview.
9. Let the player save the monster to their collection.
10. Show an animated creation-success screen.

### Image upload requirements

Integrate Cloudinary for real image upload, transformation, storage, and delivery.

Use the official Cloudinary SDK or supported upload mechanisms appropriate for the selected stack.

Implement:
- Image selection and preview.
- Drag-and-drop upload where practical.
- File-type and file-size validation.
- Upload progress and loading states.
- Helpful error messages.
- Optimized image delivery.
- Consistent image dimensions for cards.
- A fallback using bundled artwork if Cloudinary credentials are missing.

Use environment variables for configuration, for example:

VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

Use an unsigned upload preset only when it is configured for this purpose and appropriately restricted. Never expose the Cloudinary API secret in browser code. Do not put credentials directly in source files.

### Cloudinary transformations

Use Cloudinary delivery URLs or its SDK to apply appropriate transformations, such as:
- Automatic format selection.
- Automatic image quality.
- Smart cropping or consistent card framing.
- Resizing for card thumbnails.
- Text and graphic overlays where appropriate.
- Background removal only if the required Cloudinary capability and account configuration are available.

Build the visual card composition so that uploaded artwork becomes part of the game's collectible identity.

Do not pretend that an image was uploaded to Cloudinary if the upload failed. Show an honest status and retain a useful local preview.

## 6. Collectible Monster Cards

Design collectible cards as a signature feature of MonsterSnap.

Each card should contain:
- Large artwork.
- Monster name.
- Element icon or graphic.
- Rarity label.
- Level and experience.
- Attack, defense, and speed.
- Special ability.
- A distinctive card border and background.

Use layered visual composition, subtle gradients, and rarity-specific effects.

Add a card detail modal or dedicated detail screen with a larger artwork preview and complete monster information.

Where practical, implement a share-card action that produces a downloadable or shareable visual card. Use Cloudinary transformations for the image composition where appropriate.

## 7. Battle Arena — Make It Playable

Implement a functional turn-based battle system against a computer-controlled opponent.

Do not build a multiplayer system. A self-contained single-player battle is sufficient.

### Battle setup

- The player chooses a team of three monsters.
- The game selects an opponent team.
- Display both teams clearly.
- Show monster portraits, names, levels, health bars, and elemental types.
- Include a clear battle log.

### Battle actions

Each turn should provide:
- Basic attack.
- Special ability.
- Defend.
- Switch monster, if a reserve monster is available.

Implement:
- Damage calculations based on attack and defense.
- Elemental advantages and disadvantages.
- Health reduction and defeat conditions.
- Ability cooldowns or resource costs where appropriate.
- Computer opponent decisions.
- Turn order based on speed.
- Victory and defeat screens.
- Rewards for winning.
- XP and level progression.

Keep the rules understandable. Balance the battle mechanics so that the player can make meaningful choices.

### Battle visuals

Make the arena feel alive:
- Contrasting player and opponent sides.
- Large monster artwork.
- Animated attack effects.
- Floating damage numbers.
- Health bar transitions.
- Hit reactions.
- Ability activation effects.
- A satisfying victory animation.

Use CSS and lightweight animation libraries if necessary. Avoid excessive effects that harm performance.

## 8. Progression and Rewards

Implement a lightweight progression system.

Include:
- Player level and XP.
- Coins.
- Daily reward UI.
- Battle rewards.
- Monster leveling.
- Collection milestones.
- Unlockable monsters or starter rewards.
- Achievement badges.

Use persistent storage so that a page refresh does not erase the player's collection, coins, level, or unlocked items.

Prefer an existing backend or database if one is already configured. If no backend exists, use localStorage for the initial playable version and isolate the persistence logic so it can be replaced later.

Never store secret credentials or sensitive authentication data in localStorage.

## 9. Technical Stack

Inspect the repository before choosing the implementation.

Preferred stack if starting from scratch:
- React
- TypeScript
- Vite
- Phaser 3 if it adds meaningful value to the game experience
- Tailwind CSS or an existing styling system
- Lucide icons
- Framer Motion or CSS animations for UI transitions
- Cloudinary for image management
- localStorage for initial game persistence if no backend exists

Use Phaser for the battle arena only if it improves the experience and integrates cleanly. The collection, creation studio, and other screens can remain React-based.

Do not add unnecessary dependencies. A well-built React game interface with lightweight CSS-based battles is acceptable if it provides a better implementation path.

Organize the project into reusable components, game logic modules, data models, and service functions.

Keep the following concerns separate:
- Monster definitions and statistics.
- Battle calculations.
- Player progression.
- Cloudinary uploads and image transformations.
- Persistence.
- UI components.

## 10. Functional Requirements

All primary interactions must work.

Implement:
- Navigation between game screens.
- Monster card selection and details.
- Search, filters, and sorting.
- Monster creation.
- Image upload and preview.
- Monster saving.
- Team selection.
- Turn-based battles.
- Health and damage calculations.
- Victory and defeat handling.
- XP and rewards.
- Persistent game progress.
- Responsive layouts.
- Loading, error, empty, and success states.

Do not use dead buttons or placeholder links. If a feature is visible, it should have a meaningful action.

Avoid unnecessary authentication screens. Make it possible to start playing immediately.

## 11. Performance and Responsiveness

- Optimize artwork through Cloudinary.
- Use responsive image sizes.
- Lazy-load nonessential images where appropriate.
- Avoid unnecessary re-renders.
- Support desktop, tablet, and mobile screens.
- Maintain good contrast and readable text.
- Respect reduced-motion preferences where practical.
- Ensure the interface remains usable on lower-end hardware.

## 12. Execution Order

Start implementing in this order without stopping to ask me questions:

1. Inspect the current repository and identify the application entry point.
2. Set up or adapt the design system and application layout.
3. Build the home screen and monster collection.
4. Implement monster data, cards, filters, and details.
5. Build the Cloudinary-powered monster creation studio.
6. Implement the battle system.
7. Add progression, rewards, and persistence.
8. Polish animations, responsiveness, and all primary interactions.
9. Check that the development command and environment configuration are documented. Do not run tests.

Prioritize a visually excellent, functional end-to-end experience over adding unnecessary features.

If time or context becomes limited, complete the core gameplay loop first: create a monster → save it → select a team → battle → earn a reward.

## 13. Final Delivery

Begin coding now.

Do not return a long implementation proposal. Do not ask for permission to start. Do not create or run tests.

When you finish, give me only:
1. A short summary of the features implemented.
2. The key files created or modified.
3. Any Cloudinary environment variables I need to configure.
4. The exact command to run the game locally.
5. Any genuinely incomplete feature that requires external credentials or configuration.

**Your priority is to build MonsterSnap now: beautiful, polished, playable, and powered by Cloudinary.**