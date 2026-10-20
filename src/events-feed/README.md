# LMG Events Feed

Static event wall for Louisville Makes Games.

## Files required

- `index.html`
- `styles.css`
- `app.js`
- `events.json`

## Build feed data

From workspace root:

```bash
node events-feed/build-events.mjs
```

## Run locally

From workspace root:

```bash
python3 -m http.server 8080
```

Open:

- http://localhost:8080/events-feed/
