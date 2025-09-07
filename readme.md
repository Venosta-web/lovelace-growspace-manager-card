# Lovelace Growspace Manager Card

A modern **Home Assistant Lovelace custom card** to manage multiple growspaces and track plants, their stages, and growth dates. Built with **Lit**, **TypeScript**, and **Rollup**.

---

## Features

- Display plants in a grid layout with configurable rows and columns per growspace.
- Track plant stages: `veg`, `flower`, `dry`, `cure`.
- Strain Library:
  Maintain a list of strains.
  Autocomplete input when adding or updating a plant for quick selection.
  Add, remove, and clear strains easily from the card.
- Automatically calculate days in each stage.
- Add, update, move, and delete plants directly from the card.
- Harvest and finish drying plants with proper stage checks.
- Compact and wide views for flexible dashboard layout.
- Integrated strain library management.
- Full drag-and-drop support for plant rearrangement.
- Timezone-aware date handling using **Home Assistant timezone**.
- Responsive design and smooth animations.

---

## Screenshots

![Growspace Manager Card](docs/screenshot.png)  
*Example layout showing plants and stages*

![Grid Layout Diagram](docs/grid-layout.png)
*Diagram showing the grid layout and stage representation*

---

## Installation

### Using HACS (recommended)
1. Add this repository to HACS under **Custom Repositories** with category `Frontend`.
2. Install `lovelace-growspace-manager-card`.
3. Add to your Lovelace dashboard:
```yaml
type: 'custom:growspace-manager-card'
title: Growspace Manager
default_growspace: my_growspace
```

### Manual
1. Copy `dist/growspace-manager-card.js` to your `www` folder.
2. Add the resource in Lovelace:
```yaml
resources:
  - url: /local/growspace-manager-card.js
    type: module
```
3. Add the card as above.

---

## Configuration Options

| Option               | Type          | Description |
|---------------------|---------------|-------------|
| `type`              | `string`      | Must be `'custom:growspace-manager-card'`. |
| `title`             | `string`      | Optional card title. |
| `default_growspace` | `string`      | Device ID or name of default growspace to display. |
| `compact`           | `boolean`     | Show a compact grid layout. |
| `theme`             | `'dark' | 'default' | 'green'` | Optional color theme. |

---

## Plant Attributes

Each plant entity should have:

- `plant_id` (UUID)
- `strain` (string)
- `phenotype` (string)
- `veg_start`, `flower_start`, `dry_start`, `cure_start` (ISO date strings)
- `row`, `col` (number)
- `stage` (union: `'veg' | 'flower' | 'dry' | 'cure'`)

---

## Development

### Install Dependencies

```bash
npm install
```

### Build & Deploy

```bash
npm run build
npm run deploy
```

- `build` compiles TypeScript and bundles the card.
- `deploy` copies the output to Home Assistant `www` folder.

### TypeScript & Lit Tips

- Use `PlantStage` union type to track stages consistently.
- Always use `Home Assistant` timezone via Luxon for date/time handling.
- Drag-and-drop is supported using native HTML5 events.

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a pull request.

---

## License

MIT License – see [LICENSE](LICENSE) file.

---

## Credits

- Built with [Lit](https://lit.dev/) & [TypeScript](https://www.typescriptlang.org/)
- Stage icons from [Material Design Icons](https://materialdesignicons.com/)
- Timezone handling with [Luxon](https://moment.github.io/luxon/)

