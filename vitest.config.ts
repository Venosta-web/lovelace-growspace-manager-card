import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // specific to logic that touches DOM APIs (like FileReader/Image in utils.ts)
        environment: 'jsdom',
        include: ['tests/unit/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.spec.ts', 'src/types.ts']
        },
        // Fix for loading assets like CSS or images in tests if needed
        server: {
            deps: {
                inline: ['@material/web']
            }
        }
    },
});
