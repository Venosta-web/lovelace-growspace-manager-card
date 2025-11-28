# Testing Instructions

This repository uses [Playwright](https://playwright.dev/) for verifying the frontend functionality of the `growspace-manager-card`.

## Prerequisites

Before running the tests, you must build the project to generate the distribution files that the mockup relies on.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build the Project**:
    ```bash
    npm run build
    ```
    This creates `dist/growspace-manager-card.js`.

## Running Tests

The tests are located in the `tests/` directory and run against a local dev server (serving `index.html` by default, but tests may target other files).

To run the full test suite:

```bash
npx playwright test
```

This command will:
1.  Start a local HTTP server on port 8080 (configured in `playwright.config.ts`).
2.  Launch Playwright (headless mode is enabled by default in config).
3.  Run all `.spec.ts` files found in the `tests/` directory.

## Troubleshooting

*   **Missing Card**: If tests fail saying elements are not visible, ensure `npm run build` completed successfully and `dist/growspace-manager-card.js` exists.
*   **Port Conflicts**: The test config uses port 8080. If this port is in use, verify if another process is running or edit `playwright.config.ts`.
