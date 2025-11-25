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

The tests run against a standalone HTML mockup (`verification_mockup.html`) served locally. You do not need a running Home Assistant instance.

To run the tests:

```bash
npm run test
```

This command will:
1.  Start a local Python HTTP server on port 8123.
2.  Launch Playwright (headless mode by default).
3.  Run the tests defined in `tests/mockup.spec.ts`.

## Troubleshooting

*   **Missing Card**: If tests fail saying elements are not visible, ensure `npm run build` completed successfully and `dist/growspace-manager-card.js` exists.
*   **Port Conflicts**: The test config uses port 8123. If this port is in use, verify if another process is running or edit `playwright.config.ts`.
