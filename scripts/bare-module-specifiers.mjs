function isBareModuleSpecifier(specifier) {
  return (
    !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier)
  );
}

export function failOnBareModuleSpecifiers({ allowlist = [] } = {}) {
  const allowedSpecifiers = new Set(allowlist);

  return {
    name: 'fail-on-bare-module-specifiers',
    generateBundle(_outputOptions, bundle) {
      const emittedFileNames = new Set(Object.keys(bundle));
      const violations = [];

      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;

        const specifiers = new Set([...output.imports, ...output.dynamicImports]);
        for (const specifier of specifiers) {
          if (
            isBareModuleSpecifier(specifier) &&
            !emittedFileNames.has(specifier) &&
            !allowedSpecifiers.has(specifier)
          ) {
            violations.push({ chunk: output.fileName, specifier });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map(({ chunk, specifier }) => `  - "${specifier}" in "${chunk}"`)
          .join('\n');
        this.error(
          `Bare module specifiers survived bundling and cannot be resolved by the browser:\n${details}\n` +
            'Bundle these dependencies or add intentional browser-provided imports to the build allowlist.'
        );
      }
    },
  };
}
