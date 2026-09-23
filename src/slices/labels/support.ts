import { atom } from 'nanostores';
import type { LabelTemplateCapability } from './schema';

export type LabelTemplateSupport =
  | { status: 'unknown' }
  | { status: 'classic'; reason: string }
  | { status: 'incompatible'; reason: string }
  | { status: 'available'; capability: LabelTemplateCapability };

export const labelTemplateSupport$ = atom<LabelTemplateSupport>({ status: 'unknown' });
