import { atom, type WritableAtom } from 'nanostores';

export interface MetricComparison {
  id: string;
  metrics: string[];
}

interface MetricComparisonRecord {
  schema_version: 1;
  record_revision: number;
  comparisons: MetricComparison[];
}

export interface MetricComparisonState {
  growspaceId: string | null;
  recordRevision: number;
  comparisons: MetricComparison[];
  persistence: 'durable' | 'session';
}

export class ComparisonConflictError extends Error {
  constructor() {
    super('Metric comparisons changed in another tab. Review the latest groups and try again.');
    this.name = 'ComparisonConflictError';
  }
}

export class ComparisonConstraintError extends Error {
  constructor(public readonly constraint: 'claimed' | 'limit') {
    super(constraint);
    this.name = 'ComparisonConstraintError';
  }
}

const SCHEMA_VERSION = 1 as const;
const STORAGE_PREFIX = 'growspace-manager-card:metric-comparisons';
const COMPARISON_CHANGE_EVENT = 'growspace-manager-card:metric-comparisons-changed';
const sessionRecords = new Map<string, MetricComparisonRecord>();
let sessionCounter = 0;

function emptyRecord(): MetricComparisonRecord {
  return { schema_version: SCHEMA_VERSION, record_revision: 0, comparisons: [] };
}

function canonicalMetrics(metrics: string[]): string[] {
  return [...new Set(metrics)].sort();
}

function validRecord(value: unknown): value is MetricComparisonRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<MetricComparisonRecord>;
  if (
    record.schema_version !== SCHEMA_VERSION ||
    typeof record.record_revision !== 'number' ||
    !Number.isInteger(record.record_revision) ||
    record.record_revision < 0 ||
    !Array.isArray(record.comparisons)
  ) {
    return false;
  }
  const claimed = new Set<string>();
  const ids = new Set<string>();
  return record.comparisons.every((comparison) => {
    if (
      !comparison ||
      typeof comparison.id !== 'string' ||
      comparison.id.length === 0 ||
      ids.has(comparison.id) ||
      !Array.isArray(comparison.metrics) ||
      comparison.metrics.some((metric) => typeof metric !== 'string' || metric.length === 0)
    ) {
      return false;
    }
    const metrics = canonicalMetrics(comparison.metrics);
    if (
      metrics.length !== comparison.metrics.length ||
      metrics.some((metric, index) => metric !== comparison.metrics[index]) ||
      metrics.length < 2 ||
      metrics.length > 4 ||
      metrics.some((metric) => claimed.has(metric))
    ) {
      return false;
    }
    ids.add(comparison.id);
    metrics.forEach((metric) => claimed.add(metric));
    return true;
  });
}

function cloneRecord(record: MetricComparisonRecord): MetricComparisonRecord {
  return {
    ...record,
    comparisons: record.comparisons.map((comparison) => ({
      id: comparison.id,
      metrics: [...comparison.metrics],
    })),
  };
}

export class MetricComparisonStore {
  public readonly $state: WritableAtom<MetricComparisonState> = atom({
    growspaceId: null,
    recordRevision: 0,
    comparisons: [],
    persistence: 'session',
  });

  private readonly _instanceId = `instance-${++sessionCounter}`;
  private _storageKey: string | null = null;
  private _sessionKey = this._instanceId;
  private _durable = false;
  private _metricLabels = new Map<string, string>();
  private _sessionNoticeIssued = false;

  constructor() {
    window.addEventListener('storage', this._handleStorage);
    window.addEventListener(COMPARISON_CHANGE_EVENT, this._handlePeerChange as EventListener);
  }

  public destroy(): void {
    window.removeEventListener('storage', this._handleStorage);
    window.removeEventListener(COMPARISON_CHANGE_EVENT, this._handlePeerChange as EventListener);
  }

  public async configure(
    userId: string | undefined,
    growspaceId: string,
    legacyGroups: string[][] = []
  ): Promise<'durable' | 'session'> {
    const durable = this._canPersist(userId);
    const storageKey = durable ? `${STORAGE_PREFIX}:${userId}:${growspaceId}` : null;
    const sessionKey = userId ? `${userId}:${growspaceId}` : `${this._instanceId}:${growspaceId}`;
    if (
      this.$state.get().growspaceId === growspaceId &&
      this._storageKey === storageKey &&
      this._sessionKey === sessionKey
    ) {
      return this._durable ? 'durable' : 'session';
    }

    this._durable = durable;
    this._storageKey = storageKey;
    this._sessionKey = sessionKey;
    const hadRecord = this._hasRecord();
    let record = this._readRecord();
    if (!hadRecord) {
      const imported = this._validLegacyGroups(legacyGroups);
      if (imported.length > 0) {
        record = {
          schema_version: SCHEMA_VERSION,
          record_revision: record.record_revision + 1,
          comparisons: imported.map((metrics) => ({ id: this._newId(), metrics })),
        };
        this._writeRecord(record);
      }
    }
    this._publish(record, growspaceId);
    return durable ? 'durable' : 'session';
  }

  public setMetricCatalog(metrics: Array<{ key: string; label: string }>): void {
    this._metricLabels = new Map(metrics.map((metric) => [metric.key, metric.label]));
  }

  public takeSessionOnlyNotice(): boolean {
    if (this._durable || this._sessionNoticeIssued) return false;
    this._sessionNoticeIssued = true;
    return true;
  }

  public labelFor(metric: string): string {
    return this._metricLabels.get(metric) ?? metric.replaceAll('_', ' ');
  }

  public labelForComparison(comparison: MetricComparison): string {
    return comparison.metrics.map((metric) => this.labelFor(metric)).join(' + ');
  }

  public groupFor(metric: string): MetricComparison | undefined {
    return this.$state.get().comparisons.find((comparison) => comparison.metrics.includes(metric));
  }

  public async save(
    comparisonId: string | null,
    metrics: string[],
    expectedRevision: number,
    originalMetrics: string[]
  ): Promise<void> {
    const canonical = canonicalMetrics(metrics);
    if (canonical.length < 2 || canonical.length > 4) {
      throw new ComparisonConstraintError('limit');
    }
    await this._mutate(expectedRevision, (record) => {
      const existingIndex = comparisonId
        ? record.comparisons.findIndex((comparison) => comparison.id === comparisonId)
        : -1;
      if (comparisonId && existingIndex < 0) throw new ComparisonConflictError();
      if (
        existingIndex >= 0 &&
        canonicalMetrics(record.comparisons[existingIndex].metrics).join('\0') !==
          canonicalMetrics(originalMetrics).join('\0')
      ) {
        throw new ComparisonConflictError();
      }
      const claimed = record.comparisons.some(
        (comparison, index) =>
          index !== existingIndex && comparison.metrics.some((metric) => canonical.includes(metric))
      );
      if (claimed) throw new ComparisonConstraintError('claimed');

      const next = [...record.comparisons];
      const comparison = { id: comparisonId ?? this._newId(), metrics: canonical };
      if (existingIndex >= 0) next[existingIndex] = comparison;
      else next.push(comparison);
      return next;
    });
  }

  public async delete(comparisonId: string, expectedRevision: number): Promise<void> {
    await this._mutate(expectedRevision, (record) => {
      if (!record.comparisons.some((comparison) => comparison.id === comparisonId)) {
        throw new ComparisonConflictError();
      }
      return record.comparisons.filter((comparison) => comparison.id !== comparisonId);
    });
  }

  public reload(): void {
    const growspaceId = this.$state.get().growspaceId;
    if (growspaceId) this._publish(this._readRecord(), growspaceId);
  }

  public async pruneUnavailableMetrics(eligibleMetrics: string[]): Promise<number> {
    const eligible = new Set(eligibleMetrics);
    return this._runLocked(() => {
      const current = this._readRecord();
      let removed = 0;
      const comparisons = current.comparisons.flatMap((comparison) => {
        const metrics = comparison.metrics.filter((metric) => eligible.has(metric));
        if (metrics.length === comparison.metrics.length) return [comparison];
        if (metrics.length < 2) {
          removed += comparison.metrics.length;
          return [];
        }
        removed += comparison.metrics.length - metrics.length;
        return [{ ...comparison, metrics }];
      });
      if (removed === 0) return 0;
      const next: MetricComparisonRecord = {
        schema_version: SCHEMA_VERSION,
        record_revision: current.record_revision + 1,
        comparisons,
      };
      this._writeRecord(next);
      const growspaceId = this.$state.get().growspaceId;
      if (growspaceId) this._publish(next, growspaceId);
      return removed;
    });
  }

  private async _mutate(
    expectedRevision: number,
    update: (record: MetricComparisonRecord) => MetricComparison[]
  ): Promise<void> {
    const commit = () => {
      const current = this._readRecord();
      if (current.record_revision !== expectedRevision) throw new ComparisonConflictError();
      const comparisons = update(cloneRecord(current));
      if (JSON.stringify(comparisons) === JSON.stringify(current.comparisons)) return;
      const next: MetricComparisonRecord = {
        schema_version: SCHEMA_VERSION,
        record_revision: current.record_revision + 1,
        comparisons,
      };
      this._writeRecord(next);
      const growspaceId = this.$state.get().growspaceId;
      if (growspaceId) this._publish(next, growspaceId);
    };

    await this._runLocked(commit);
  }

  private async _runLocked<T>(operation: () => T): Promise<T> {
    if (this._durable && this._storageKey) {
      return navigator.locks.request(`${this._storageKey}:lock`, async () => operation());
    }
    return operation();
  }

  private _canPersist(userId: string | undefined): boolean {
    if (!userId || !globalThis.crypto?.randomUUID || !navigator.locks?.request) return false;
    try {
      const probe = `${STORAGE_PREFIX}:probe`;
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  private _readRecord(): MetricComparisonRecord {
    if (!this._durable || !this._storageKey) {
      return cloneRecord(sessionRecords.get(this._sessionKey) ?? emptyRecord());
    }
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return emptyRecord();
      const parsed: unknown = JSON.parse(raw);
      return validRecord(parsed) ? cloneRecord(parsed) : emptyRecord();
    } catch {
      return emptyRecord();
    }
  }

  private _hasRecord(): boolean {
    if (!this._durable || !this._storageKey) return sessionRecords.has(this._sessionKey);
    try {
      return localStorage.getItem(this._storageKey) !== null;
    } catch {
      return false;
    }
  }

  private _writeRecord(record: MetricComparisonRecord): void {
    if (this._durable && this._storageKey) {
      localStorage.setItem(this._storageKey, JSON.stringify(record));
    } else {
      sessionRecords.set(this._sessionKey, cloneRecord(record));
    }
    window.dispatchEvent(
      new CustomEvent(COMPARISON_CHANGE_EVENT, {
        detail: {
          sourceId: this._instanceId,
          storageKey: this._storageKey,
          sessionKey: this._sessionKey,
          record: cloneRecord(record),
        },
      })
    );
  }

  private _publish(record: MetricComparisonRecord, growspaceId: string): void {
    this.$state.set({
      growspaceId,
      recordRevision: record.record_revision,
      comparisons: record.comparisons,
      persistence: this._durable ? 'durable' : 'session',
    });
  }

  private _newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${++sessionCounter}`;
  }

  private _validLegacyGroups(groups: string[][]): string[][] {
    const claimed = new Set<string>();
    return groups.flatMap((group) => {
      const metrics = canonicalMetrics(group.filter((metric) => typeof metric === 'string'));
      if (
        metrics.length < 2 ||
        metrics.length > 4 ||
        metrics.some((metric) => claimed.has(metric))
      ) {
        return [];
      }
      metrics.forEach((metric) => claimed.add(metric));
      return [metrics];
    });
  }

  private _handleStorage = (event: StorageEvent): void => {
    if (!this._durable || event.key !== this._storageKey || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      const growspaceId = this.$state.get().growspaceId;
      if (growspaceId && validRecord(parsed)) this._publish(parsed, growspaceId);
    } catch {
      // Ignore malformed writes from other code using the same storage namespace.
    }
  };

  private _handlePeerChange = (
    event: CustomEvent<{
      sourceId: string;
      storageKey: string | null;
      sessionKey: string;
      record: MetricComparisonRecord;
    }>
  ): void => {
    if (event.detail.sourceId === this._instanceId) return;
    const sameRecord = this._durable
      ? event.detail.storageKey === this._storageKey
      : event.detail.storageKey === null && event.detail.sessionKey === this._sessionKey;
    const growspaceId = this.$state.get().growspaceId;
    if (sameRecord && growspaceId && validRecord(event.detail.record)) {
      this._publish(event.detail.record, growspaceId);
    }
  };
}
