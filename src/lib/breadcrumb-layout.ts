export type BreadcrumbLayout = 'full' | 'icon' | 'partial' | 'compact';
export interface BreadcrumbWidths {
  course: number;
  courseIcon: number;
  group: number;
  paper: number;
  current: number;
  path: number;
  separator: number;
  gap: number;
}

/** Keep the most context that fits the actual free toolbar space at normal text size. */
export function breadcrumbLayout(available: number, widths: BreadcrumbWidths): BreadcrumbLayout {
  if (!Number.isFinite(available) || available <= 0) return 'compact';
  // A short label needs no artificial minimum; long labels may truncate, but
  // keep enough of the paper visible to identify it before hiding ancestors.
  const paper = Math.min(widths.paper, 80);
  const expanded = widths.group + paper + widths.current + 3 * widths.separator + 6 * widths.gap;
  if (available >= widths.course + expanded) return 'full';
  if (available >= widths.courseIcon + expanded) return 'icon';
  const partial = widths.path + paper + widths.current + 2 * widths.separator + 4 * widths.gap;
  if (available >= partial) return 'partial';
  return 'compact';
}
