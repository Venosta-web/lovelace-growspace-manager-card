/**
 * What a control may offer, and where every option came from.
 *
 * The editor's hardest promise is the one that is easiest to break by
 * accident: **a control must not be able to express a label the product
 * cannot print.** A font list typed into a stylesheet, an "any angle"
 * rotation field, a QR error-correction picker with four entries where the
 * printer profile admits three — each of those produces a document the
 * backend refuses, or worse, one it accepts and the compiler then blocks, so
 * the user discovers the constraint after the design rather than while making
 * it.
 *
 * So nothing here is a list this module knows. Every option is resolved from
 * one of exactly two sources, and which one is never a matter of taste:
 *
 * **The capability envelope**, for anything the backend catalogues or
 * measures — fonts, line spacing, monochrome tokens, bindings and their
 * parameters, and the per-profile limits a printer imposes (the readable font
 * floor, the QR quiet zone, the divider's thinnest ink, the rotations the
 * renderer has actually earned).
 *
 * **The canonical document schema**, for the closed enumerations that are
 * part of the layout language rather than of any printer — the three
 * horizontal alignments, the three vertical ones, the four overflow policies.
 * Those are read off the zod schemas in `draft-schema`, not retyped, so a
 * schema change moves the controls with it and a control cannot drift from
 * the wire it writes.
 *
 * The one thing this module does hold is the *shape* of a new element, which
 * is not a constraint but a starting point — and even there every token it
 * reaches for is taken from the catalogue rather than named.
 */

import type { CapabilityProfile, LabelTemplateCapability } from '../../../slices/labels';
import {
  TextStyleSchema,
  type LabelDocument,
  type LabelElement,
  type LabelFrame,
} from '../../../slices/labels/draft-schema';
import type { StockMm } from './geometry';

/** The four variants version 1 has, in the order the editor offers them. */
export const ELEMENT_KINDS = ['text', 'logo', 'qr', 'divider'] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

/**
 * Clockwise degrees the document language admits, per kind.
 *
 * A divider takes only two: it is a rectangular mark, so 180 describes the
 * same ink as 0 and 270 the same as 90, and admitting them would let two
 * documents mean one label. That is the backend's rule, mirrored here so the
 * control never offers a value the save would refuse.
 */
export const ROTATIONS: readonly number[] = [0, 90, 180, 270];
export const DIVIDER_ROTATIONS: readonly number[] = [0, 90];

/** The closed enumerations of the layout language itself, read off the wire shape. */
export const HORIZONTAL_ALIGNMENTS = TextStyleSchema.shape.horizontal_align.options;
export const VERTICAL_ALIGNMENTS = TextStyleSchema.shape.vertical_align.options;
export const OVERFLOW_POLICIES = TextStyleSchema.shape.overflow.options;

/**
 * The profile whose limits the editor holds a design to.
 *
 * Where a stock has several, the one that may put a real record on paper
 * wins, then the one with physical evidence, then whatever is catalogued:
 * designing against the strictest thing that could actually print this label
 * is the only ordering that cannot surprise somebody at the printer. `null`
 * is an ordinary answer — an unprofiled stock has no printer to be safe for,
 * and the editor then offers the document language's own limits alone.
 */
export function governingProfile(
  capability: LabelTemplateCapability | undefined,
  labelSizeId: string
): CapabilityProfile | null {
  const profiles = (capability?.catalogues.profiles ?? []).filter(
    (profile) => profile.label_size_id === labelSizeId
  );
  return (
    profiles.find((profile) => profile.authorizes_production) ??
    profiles.find((profile) => profile.evidence === 'product_verified') ??
    profiles[0] ??
    null
  );
}

/**
 * The rotations this element may actually be given.
 *
 * The document language's set for the kind, narrowed to what the profile's
 * renderer has earned. The shipped Niimbot profile admits `[0]` alone, which
 * is why this returns a list rather than a boolean: a control offering one
 * value says "this printer places elements upright" honestly, where a
 * rotate-by-90 button that produced `profile.rotation_unsupported` on the
 * next render would not.
 */
export function rotationsFor(kind: ElementKind, profile: CapabilityProfile | null): number[] {
  const language = kind === 'divider' ? DIVIDER_ROTATIONS : ROTATIONS;
  if (profile === null) return [...language];
  return language.filter((degrees) => profile.supported_element_rotations.includes(degrees));
}

export interface TextControls {
  fonts: { id: string; description: string }[];
  lineSpacing: { id: string; ratio: number }[];
  horizontalAlign: readonly string[];
  verticalAlign: readonly string[];
  overflow: readonly string[];
  /** Below this the profile says the printer cannot render legible text at all. */
  readableFloorMm: number;
  /** Above this it is comfortable; between the two it is a warning, not a refusal. */
  comfortThresholdMm: number;
}

export function textControls(
  capability: LabelTemplateCapability | undefined,
  profile: CapabilityProfile | null
): TextControls {
  return {
    fonts: capability?.catalogues.style_tokens.fonts ?? [],
    lineSpacing: capability?.catalogues.style_tokens.line_spacing ?? [],
    horizontalAlign: HORIZONTAL_ALIGNMENTS,
    verticalAlign: VERTICAL_ALIGNMENTS,
    overflow: OVERFLOW_POLICIES,
    readableFloorMm: profile?.limits.text_readable_floor_mm ?? 0,
    comfortThresholdMm: profile?.limits.text_comfort_threshold_mm ?? 0,
  };
}

export interface LogoControls {
  monochrome: { id: string; dither: boolean }[];
  /**
   * How an image is fitted into its frame.
   *
   * Version 1 has exactly one, which the canonical schema fixes rather than
   * catalogues — so this is a fact the inspector states, not a choice it
   * offers. It stays a list because a minor version may add one, and a
   * one-entry list becomes a control the day it does without anything here
   * changing.
   */
  fit: readonly string[];
  minimumEffectiveDpi: number;
}

export const LOGO_FITS: readonly string[] = ['contain'];

export function logoControls(
  capability: LabelTemplateCapability | undefined,
  profile: CapabilityProfile | null
): LogoControls {
  return {
    monochrome: capability?.catalogues.style_tokens.monochrome ?? [],
    fit: LOGO_FITS,
    minimumEffectiveDpi: profile?.limits.image_minimum_effective_dpi ?? 0,
  };
}

export interface QrControls {
  /** Per profile, because a coarser printer needs more redundancy than a fine one. */
  errorCorrection: readonly string[];
  minimumQuietZoneModules: number;
  maximumEncodedBytes: number;
}

export function qrControls(profile: CapabilityProfile | null): QrControls {
  return {
    errorCorrection: profile?.limits.qr_error_correction_levels ?? QR_ERROR_CORRECTION,
    minimumQuietZoneModules: profile?.limits.qr_minimum_quiet_zone_modules ?? 0,
    maximumEncodedBytes: profile?.limits.qr_maximum_encoded_bytes ?? 0,
  };
}

/** The document language's four levels, for a stock no profile governs. */
export const QR_ERROR_CORRECTION: readonly string[] = ['low', 'medium', 'quartile', 'high'];

export interface DividerControls {
  /** Thinner than this and the printhead cannot be relied on to lay any ink. */
  minimumThicknessMm: number;
  fill: readonly string[];
}

export const DIVIDER_FILLS: readonly string[] = ['black'];

export function dividerControls(profile: CapabilityProfile | null): DividerControls {
  return {
    minimumThicknessMm: profile?.limits.divider_minimum_thickness_mm ?? 0,
    fill: DIVIDER_FILLS,
  };
}

/**
 * The bindings that may fill an element of this kind, in this document.
 *
 * Filtered by kind because the catalogue says which kinds each binding
 * applies to, and a binding on the wrong kind is `content.binding_kind_mismatch`
 * rather than a design somebody can look at and judge.
 */
export function bindingsFor(
  capability: LabelTemplateCapability | undefined,
  kind: ElementKind
): LabelTemplateCapability['catalogues']['bindings'] {
  return (capability?.catalogues.bindings ?? []).filter((binding) => binding.kinds.includes(kind));
}

/** The binding catalogue entry an element is currently bound to, if it is bound at all. */
export function bindingOf(
  capability: LabelTemplateCapability | undefined,
  element: LabelElement
): LabelTemplateCapability['catalogues']['bindings'][number] | undefined {
  if (element.kind === 'divider') return undefined;
  const content = element.content;
  if (!('binding' in content)) return undefined;
  return (capability?.catalogues.bindings ?? []).find((entry) => entry.id === content.binding);
}

// ---------------------------------------------------------------------------
// Making one
// ---------------------------------------------------------------------------

/** A new element's side, as a fraction of the stock's shorter axis. */
const NEW_ELEMENT_FRACTION = 0.4;

/**
 * A starting frame for a new element: small, on the paper, and at the origin
 * the safe area suggests.
 *
 * Deliberately not centred on the selection or under the cursor. A new
 * element that lands exactly on top of an existing one is the one placement
 * a user cannot see happening, and the snapping and alignment tools exist to
 * move it from a known starting point to wherever it belongs.
 */
export function newElementFrame(stock: StockMm, square: boolean): LabelFrame {
  const side = Math.min(stock.widthMm, stock.heightMm) * NEW_ELEMENT_FRACTION;
  return {
    x_mm: round(stock.widthMm * 0.1),
    y_mm: round(stock.heightMm * 0.1),
    width_mm: round(square ? side : Math.min(stock.widthMm * 0.6, stock.widthMm)),
    height_mm: round(square ? side : Math.max(side * 0.25, 2)),
  };
}

const round = (value: number): number => Number.parseFloat(value.toFixed(2));

/**
 * Build one new element of a kind, from the catalogue and nothing else.
 *
 * Returns `null` when the catalogue cannot fill it — a QR with no QR binding
 * shipped, say. Refusing to add is the honest answer there: an element the
 * backend would reject on the next save is not a starting point, and a card
 * that invented a binding id to fill the gap would be writing a document
 * against a catalogue it does not have.
 *
 * `placeholder` is the text a new text element starts with. It arrives from
 * the caller because it is the one thing in a document that a user reads as
 * prose, so it belongs to the localized surface rather than to this module —
 * and the backend refuses a literal that is blank, so there has to be one.
 */
export function newElement(options: {
  capability: LabelTemplateCapability | undefined;
  profile: CapabilityProfile | null;
  kind: ElementKind;
  stock: StockMm;
  id: string;
  placeholder: string;
}): LabelElement | null {
  const { capability, profile, kind, stock, id, placeholder } = options;
  const frame = newElementFrame(stock, kind === 'qr' || kind === 'logo');
  // Upright, because it is the one rotation every profile realises: a new
  // element that arrived at an angle this printer cannot place would be
  // blocked by the compiler before the user had drawn anything.
  const rotation = rotationsFor(kind, profile)[0] ?? 0;
  const tokens = capability?.catalogues.style_tokens;

  if (kind === 'divider') {
    const thickness = Math.max(dividerControls(profile).minimumThicknessMm, 0.4);
    return {
      id,
      kind,
      frame: { ...frame, height_mm: round(thickness) },
      rotation,
      style: { fill: DIVIDER_FILLS[0] },
    };
  }

  if (kind === 'text') {
    const font = tokens?.fonts[0]?.id;
    const spacing = tokens?.line_spacing[0]?.id;
    if (font === undefined || spacing === undefined) return null;
    const floor = Math.max(textControls(capability, profile).comfortThresholdMm, 2.2);
    return {
      id,
      kind,
      frame,
      rotation,
      // A literal rather than the first binding: new text is text somebody is
      // about to write, and a field that silently arrived bound to the
      // breeder would be a guess wearing the authority of a default. The
      // inspector offers every binding the catalogue holds beside it.
      content: { literal: placeholder },
      style: {
        font,
        font_size_mm: round(Math.max(floor * 1.45, floor)),
        horizontal_align: 'left',
        vertical_align: 'center',
        line_spacing: spacing,
        overflow: 'shrink_ellipsis',
        minimum_font_size_mm: round(floor),
        maximum_lines: 1,
      },
    };
  }

  const binding = bindingsFor(capability, kind)[0];
  if (binding === undefined) return null;

  if (kind === 'logo') {
    const monochrome = tokens?.monochrome[0]?.id;
    if (monochrome === undefined) return null;
    return {
      id,
      kind,
      frame,
      rotation,
      content: { binding: binding.id, parameters: defaultParameters(binding) },
      style: { monochrome, fit: LOGO_FITS[0] },
    };
  }

  const qr = qrControls(profile);
  const correction = qr.errorCorrection[0];
  if (correction === undefined) return null;
  return {
    id,
    kind,
    frame,
    rotation,
    content: { binding: binding.id, parameters: defaultParameters(binding) },
    style: {
      error_correction: correction,
      quiet_zone_modules: Math.max(qr.minimumQuietZoneModules, 1),
    },
  };
}

/**
 * Each of a binding's parameters at its first catalogued value.
 *
 * First rather than chosen, because the backend documents the first entry as
 * the parameter's default and fills an omitted one with exactly that — so a
 * document written here and one written by the backend agree.
 */
export function defaultParameters(
  binding: LabelTemplateCapability['catalogues']['bindings'][number]
): Record<string, string> {
  const parameters: Record<string, string> = {};
  for (const [name, allowed] of Object.entries(binding.parameters)) {
    const first = allowed[0];
    if (first !== undefined) parameters[name] = first;
  }
  return parameters;
}

/**
 * Whether this element is the one every publishable layout needs.
 *
 * The editor does not use this to forbid anything — deleting it is allowed,
 * and the backend's own `document.missing_required_strain_name` is what says
 * the layout cannot publish, in one place rather than two. What the editor
 * does with it is *say so* in the elements list, so the consequence is
 * visible before the deletion rather than after the next save.
 */
export function isRequiredElement(element: LabelElement): boolean {
  return (
    element.kind === 'text' &&
    'binding' in element.content &&
    element.content.binding === REQUIRED_BINDING
  );
}

/** The binding the backend requires exactly one text element to carry. */
export const REQUIRED_BINDING = 'strain.name';

/** Whether removing these elements would leave the layout without its required one. */
export function wouldDropRequired(document: LabelDocument, removing: readonly string[]): boolean {
  const remaining = document.elements.filter((element) => !removing.includes(element.id));
  return document.elements.some(isRequiredElement) && !remaining.some(isRequiredElement);
}
