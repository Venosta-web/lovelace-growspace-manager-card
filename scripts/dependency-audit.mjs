const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'];

export function parseAudit(stdout, stderr, status) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    throw new Error(
      `npm audit did not return JSON (exit ${status}): ${stderr.trim() || stdout.trim()}`
    );
  }

  if (report.error) {
    throw new Error(
      `npm audit failed: ${report.error.summary || report.error.message || 'unknown error'}`
    );
  }

  const counts = report.metadata?.vulnerabilities;
  if (!counts || !SEVERITIES.every((severity) => Number.isInteger(counts[severity]))) {
    throw new Error('npm audit returned no usable vulnerability counts');
  }
  if (status !== 0 && status !== 1) {
    throw new Error(`npm audit exited ${status}: ${stderr.trim() || 'unknown error'}`);
  }

  return { counts, vulnerabilities: report.vulnerabilities || {} };
}

export function totalFindings({ counts, vulnerabilities }) {
  return Math.max(
    SEVERITIES.reduce((total, severity) => total + counts[severity], 0),
    Object.keys(vulnerabilities).length
  );
}

export function advisoryLines(vulnerabilities) {
  return Object.entries(vulnerabilities).map(([name, finding]) => {
    const advisories = (finding.via || []).filter((via) => typeof via === 'object');
    const titles = advisories.map((via) => via.title).filter(Boolean);
    const urls = advisories.map((via) => via.url).filter(Boolean);
    const reason = titles.length ? titles.join('; ') : `via ${(finding.via || []).join(', ')}`;
    return `${name} (${finding.severity}${finding.range ? `, ${finding.range}` : ''}): ${reason}${urls.length ? ` — ${urls.join(', ')}` : ''}`;
  });
}

export function summaryTable(shipped, full, fullError) {
  const rows = SEVERITIES.map((severity) => {
    const shippedCount = shipped?.counts[severity] ?? '—';
    const fullCount = full?.counts[severity] ?? '—';
    const toolingCount = full && shipped ? Math.max(0, fullCount - shippedCount) : '—';
    return `| ${severity} | ${shippedCount} | ${toolingCount} | ${fullCount} |`;
  });
  const total = (report) => (report ? totalFindings(report) : '—');
  rows.push(
    `| **Total** | **${total(shipped)}** | **${full && shipped ? Math.max(0, total(full) - total(shipped)) : '—'}** | **${total(full)}** |`
  );

  return [
    '## Dependency audit',
    '',
    'The shipped dependency tree is a required gate. The full tree includes build and test tooling; its findings are reported only.',
    '',
    '| Severity | Shipped | Tooling only | Full tree |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
    ...(fullError
      ? [`Full-tree audit could not be reported: ${fullError.replaceAll('\n', ' ')}`, '']
      : []),
  ].join('\n');
}

export function githubError(message) {
  return `::error title=Shipped dependency advisory::${message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`;
}
