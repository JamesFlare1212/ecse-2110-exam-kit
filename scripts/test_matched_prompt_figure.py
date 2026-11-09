"""Verify the actual, same-paper Fig. 10.21 match without fabricating a crop."""
import json
import unittest

import generate_figures as figures
from paper_assets import papers


class MatchedPromptFigureTests(unittest.TestCase):
    def test_separate_question_svg_preserves_the_verified_source_circuit(self):
        for paper in papers():
            if paper['name'] != 'practice2_f26':
                continue
            with self.subTest(locale=paper['locale']):
                question = next(q for q in paper['exam']['problems'] if q['id'] == 'p2-f26-q3')
                self.assertEqual(question['figure'], 'p2-f26-q3')
                self.assertIs(question['figureOriginal'], False)
                self.assertEqual(question['originalFigure']['page'], 4)
                self.assertIn('p2-f26-q3', figures.figure_names(paper, questions_only=True))
                self.assertNotIn('p2-f26-q3', figures.original_figure_names(paper))
                directory = paper['directory'] / 'assets/figures'
                for suffix in ('.svg', '-dark.svg'):
                    matched = directory / ('p2-f26-q3' + suffix)
                    source = directory / ('p2-f26-q6' + suffix)
                    self.assertEqual(matched.read_bytes(), source.read_bytes())
                    self.assertNotEqual(matched.stat().st_ino, source.stat().st_ino)
                self.assertFalse((paper['directory'] / 'assets/original-figures/p2-f26-q3.webp').exists())
                review = json.loads((paper['directory'] / 'extracted/source-review.json').read_text())
                evidence = review['questions'][2]
                self.assertFalse(evidence['hasPromptDiagram'])  # direct page-4 source remains unchanged
                match = evidence['matchedPromptDiagram']
                self.assertEqual(match['sourcePage'], 9)
                self.assertEqual(match['reference'], '10.21')
                registry = json.loads((paper['directory'] / 'figure-sources.json').read_text())
                self.assertEqual(match['sourcePanel'], registry['panels']['p2-f26-q6'][0])

    def test_the_crop_filter_does_not_suppress_unrelated_originals_or_part_figures(self):
        paper = {'exam': {'problems': [
            {'figure': 'matched', 'figureOriginal': False, 'parts': []},
            {'figure': 'original', 'parts': [{'questionFigure': {'name': 'part-source'}}]},
            {'figure': None, 'parts': [{'figure': 'solution-only'}]},
        ]}}
        self.assertEqual(figures.original_figure_names(paper), {'original', 'part-source'})
        self.assertEqual(figures.figure_names(paper), {'matched', 'original', 'part-source', 'solution-only'})


if __name__ == '__main__':
    unittest.main()
