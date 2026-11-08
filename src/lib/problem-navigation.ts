import { course } from '../../content/course';

export const DEFAULT_PROBLEM_ID = course.defaultProblemId ?? '';

export function problemPath(id: string, part?: string) {
  return `/problems/${id}/${part ? '#'+encodeURIComponent(part) : ''}`;
}

/** Keep native open-in-new-tab and modified-click behavior on problem links. */
export function followProblemLink(event: MouseEvent, select: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  event.preventDefault();
  select();
  return true;
}
