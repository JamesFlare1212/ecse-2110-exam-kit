"""PDF-free figure generation and the optional original-image crop boundary."""
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from PIL import Image

import generate_figures as G


class GenerateFiguresTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(dir=G.ROOT)
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        (self.directory/'generate_figures.py').write_text('# Test renderer input\n')
        self.sources = self.directory/'figure-sources.json'
        self.sources.write_text('{"figures": {}, "panels": {}}')
        self.output = self.directory/'assets/figures'
        self.crops = self.directory/'assets/original-figures'
        self.problem = {'figure': None, 'parts': [{'figure': 'solution'}]}
        self.paper = {'name': 'test', 'locale': 'en', 'directory': self.directory,
                      'exam': {'problems': [self.problem]}}

        def render(save, dark):
            for name in sorted(G.figure_names(self.paper)):
                fig, ax = G.plt.subplots()
                ax.plot([0, 1], [0, 1])
                save(fig, name, dark)

        module = SimpleNamespace(render_figures=render)
        for patcher in (patch.object(G, 'papers', return_value=[self.paper]),
                        patch.object(G, 'renderer', return_value=module),
                        patch.object(G, 'documents', return_value={'source': {'pdf': '/source.pdf'}})):
            patcher.start()
            self.addCleanup(patcher.stop)
        self.addCleanup(G.plt.close, 'all')

    def source(self):
        return {'doc': 'source', 'page': 1, 'region': [.1, .2, .3, .4]}

    def generate_without_pdf(self):
        # Also guard against attempts to resolve a canonical local PDF. This
        # remains a regression test in full offline environments with PyMuPDF.
        with (patch.dict('sys.modules', {'pymupdf': None}),
              patch.object(G, 'asset_source', side_effect=AssertionError('Unexpected PDF lookup'))):
            G.generate_paper(self.directory)
        manifest = json.loads((self.output/'manifest.json').read_text())
        self.assertEqual(manifest['figures'], sorted(G.figure_names(self.paper)))
        for name in manifest['figures']:
            for suffix in ('.svg', '-dark.svg'):
                self.assertTrue((self.output/(name+suffix)).is_file())
        self.assertEqual(list(self.crops.iterdir()), [])

    def test_no_original_sources_generate_both_themes_without_pdf_tooling(self):
        self.generate_without_pdf()

    def test_prompt_text_missing_reference_and_stale_sources_do_not_require_pdf_tooling(self):
        self.problem.update(figure='supplement', figureOriginal=False)
        self.sources.write_text(json.dumps({'figures': {
            'prompt-text': self.source(), 'supplement': self.source(), 'retired': self.source(),
        }, 'panels': {}}))
        self.crops.mkdir(parents=True)
        (self.crops/'supplement.webp').write_bytes(b'stale text crop')
        (self.crops/'retired.webp').write_bytes(b'stale removed crop')
        self.generate_without_pdf()
        manifest = json.loads((self.output/'manifest.json').read_text())
        self.assertEqual(manifest['questionFigures'], ['supplement'])

    def test_actual_original_crop_still_requires_pdf_tooling(self):
        self.problem['figure'] = 'original'
        self.sources.write_text(json.dumps({'figures': {'original': self.source()}, 'panels': {}}))
        with (patch.dict('sys.modules', {'pymupdf': None}),
              self.assertRaises(ModuleNotFoundError) as missing):
            G.generate_paper(self.directory)
        self.assertEqual(missing.exception.name, 'pymupdf')
        self.assertFalse((self.output/'manifest.json').exists())
        self.assertFalse((self.crops/'original.webp').exists())

    def test_actual_original_crop_keeps_pdf_panel_rendering(self):
        self.problem['figure'] = 'original'
        panels = [[.1, .2, .3, .4], [.5, .6, .2, .1]]
        self.sources.write_text(json.dumps({'figures': {'original': self.source()},
                                           'panels': {'original': panels}}))
        page = SimpleNamespace(rect=SimpleNamespace(width=100, height=200),
                               get_pixmap=MagicMock(return_value=SimpleNamespace(
                                   width=4, height=3, samples=b'\xff\x00\x00'*12)))
        pdf = SimpleNamespace(open=MagicMock(), Rect=MagicMock(side_effect=lambda *args: args),
                              Matrix=MagicMock(return_value='2x'))
        pdf.open.return_value.__enter__.return_value = [page]
        source = self.directory/'source.pdf'
        # A small PDF API stand-in exercises real Pillow crop composition with
        # no dependency on canonical PDFs or the optional PyMuPDF installation.
        with (patch.dict('sys.modules', {'pymupdf': pdf}),
              patch.object(G, 'asset_source', return_value=source) as asset_source):
            G.generate_paper(self.directory)
        asset_source.assert_called_once_with('/source.pdf')
        pdf.open.assert_called_once_with(source)
        self.assertEqual(pdf.Rect.call_count, 2)
        for rectangle, expected in zip(pdf.Rect.call_args_list, [(10, 40, 40, 120), (50, 120, 70, 140)]):
            self.assertEqual(len(rectangle.args), 4)
            for actual, coordinate in zip(rectangle.args, expected):
                self.assertAlmostEqual(actual, coordinate)
        self.assertEqual(page.get_pixmap.call_count, 2)
        for call in page.get_pixmap.call_args_list:
            self.assertEqual(call.kwargs['matrix'], '2x')
            self.assertIs(call.kwargs['alpha'], False)
        with Image.open(self.crops/'original.webp') as crop:
            self.assertEqual(crop.format, 'WEBP')
            self.assertEqual(crop.size, (4, 3+24+3))
        manifest = json.loads((self.output/'manifest.json').read_text())
        self.assertEqual(manifest['questionFigures'], ['original'])


if __name__ == '__main__':
    unittest.main()
