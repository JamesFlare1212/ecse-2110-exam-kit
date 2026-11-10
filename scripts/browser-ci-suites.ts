/** Each suite runs on its own CI runner; retain all production browser coverage. */
export const browserSuites={
 startup:['scripts/browser-startup-qa.mjs'],
 reading:[
  'scripts/browser-course-qa.mjs',
  'scripts/browser-reader-layout-qa.mjs',
  'scripts/browser-reader-sections-qa.mjs',
  'scripts/browser-sidebar-controls-qa.mjs',
 ],
 conduction:[
  'scripts/browser-conduction-qa.mjs',
  'scripts/browser-conduction-compact-qa.mjs',
  'scripts/browser-conduction-colors-qa.mjs',
 ],
 'converter-focus':[
  'scripts/browser-converter-defaults-qa.mjs',
  'scripts/browser-converter-slider-qa.mjs',
  'scripts/browser-converter-waves-qa.mjs',
  'scripts/browser-full-converter-qa.mjs',
 ],
 sources:[
  'scripts/browser-page-links-qa.mjs',
  'scripts/browser-course-citations-qa.mjs',
  'scripts/browser-content-typography-qa.mjs',
 ],
 navigation:['scripts/browser-converter-navigation-qa.mjs'],
} as const;
