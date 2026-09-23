import { atom } from 'nanostores';
import type { TcManifest } from './schema';

export type TcPresence =
  | { status: 'unknown' }
  | { status: 'present'; manifest: TcManifest }
  | { status: 'absent'; reason: string };

export const tcPresence$ = atom<TcPresence>({ status: 'unknown' });
