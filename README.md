# FluxFind

A userscript that makes Roblox better. Region-filtered servers, live search with thumbnails, no ads, dark mode all free and open source.

## What it does

- **Find servers near you** - Filter by region, see player thumbnails, sort by proximity
- **Live search** - Type in the search bar and get games and people with icons and player counts, no page reload
- **Blocks ads** - Removes promotional junk from game pages
- **Dark mode** - Because light mode hurts
- **Hide chat** - Sometimes you just want peace
- **Clean settings panel** - Animated pill tabs with a nice shine effect

## How to install

1. Get [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/)
2. Grab `dist/fluxfind.user.js` from this repo, open it raw, and your userscript manager will pick it up
3. That's it. Head to any game page on [roblox.com](https://www.roblox.com)

## Build it yourself

```bash
git clone https://github.com/YuiElina/fluxfind.git
cd fluxfind
npm install
npm run build
```

## How it's organized

```
src/
├── api/           Talking to Roblox (games, thumbnails, geolocation)
├── config/        Constants, region lists, URL patterns
├── core/          DOM helpers, logger, sanitizer, state atoms, storage, utils
├── features/      The actual features (ad-remover, server-browser, smart-search, url-router)
├── state/         Reactive app state that auto-saves
├── types/         TypeScript types
└── ui/            Icons, modals, notifications, settings panel, CSS
```

## License

[Authentic Open License (AOL-1.0)](https://github.com/YuiElina/AOL-LICENSE)