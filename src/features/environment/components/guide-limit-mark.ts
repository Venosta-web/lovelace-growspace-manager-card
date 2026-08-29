import { svg, type TemplateResult } from 'lit';

export interface GuideLimitMarkOptions {
  id: string;
  value: number;
  min: number;
  max: number;
  width: number;
  height: number;
  color: string;
  x1?: number;
  x2?: number;
  className?: string;
}

/**
 * Draw one [[Limit]] with the geometry shared by Env Graphs and the tank chart.
 *
 * Limits deliberately do not alter `min`/`max`. A value outside that visible
 * domain becomes a small outward-facing chevron at the edge it crossed; a value
 * inside remains a tight-dashed line. Attributes stay inline because the helper
 * renders into two different shadow roots.
 */
export function renderGuideLimitMark({
  id,
  value,
  min,
  max,
  width,
  height,
  color,
  x1 = 0,
  x2 = width,
  className = '',
}: GuideLimitMarkOptions): TemplateResult {
  const classes = `gs-guide-limit${className ? ` ${className}` : ''}`;
  const center = (x1 + x2) / 2;

  if (value > max) {
    return svg`<path
      class=${classes}
      data-guide-id=${id}
      data-guide-placement="upper-edge"
      d="M ${center - 5} 6 L ${center} 1 L ${center + 5} 6"
      fill="none"
      stroke=${color}
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    ></path>`;
  }

  if (value < min) {
    return svg`<path
      class=${classes}
      data-guide-id=${id}
      data-guide-placement="lower-edge"
      d="M ${center - 5} ${height - 6} L ${center} ${height - 1} L ${center + 5} ${height - 6}"
      fill="none"
      stroke=${color}
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    ></path>`;
  }

  const span = max - min || 1;
  const y = height - ((value - min) / span) * height;
  return svg`<line
    class=${classes}
    data-guide-id=${id}
    data-guide-placement="line"
    x1=${x1}
    x2=${x2}
    y1=${y}
    y2=${y}
    stroke=${color}
    stroke-opacity="0.82"
    stroke-width="1.25"
    stroke-dasharray="2 2.5"
    vector-effect="non-scaling-stroke"
  ></line>`;
}
