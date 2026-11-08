"""Provision ECSE 2110 shared PDFs from the local reference archive.

Only explicitly listed teaching materials are imported. Student submissions are
never copied. This writes source metadata, not question/solution Markdown.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
LECTURES = [
    ('01', 'Lecture1-', 'Electrical energy systems', '电能系统概览'),
    ('02', 'Lecture2-', 'AC power and power factor', '交流功率与功率因数'),
    ('03', 'Lecture3-', 'Three-phase circuits', '三相电路'),
    ('04', 'Lecture4-', 'Magnetic circuits and transformers', '磁路与变压器'),
    ('06', 'Lecture6-', 'Transformer tests and per-unit analysis', '变压器试验与标幺值'),
    ('07', 'Lecture7-', 'Transformer performance and efficiency', '变压器性能与效率'),
    ('08', 'Lecture8-', 'Electromechanical conversion and DC machines', '机电能量转换与直流电机'),
    ('09', 'Lecture9-', 'DC windings, voltage and torque', '直流绕组、电压与转矩'),
    ('10', 'Lecture10-', 'Synchronous machines', '同步电机'),
    ('11–12', 'Lecture11-12-', 'Power electronics', '电力电子'),
    ('13–14', 'Lecture13-14-', 'Power conversion', '电能变换'),
    ('15', 'Lecture15-', 'Renewable energy', '可再生能源'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference-dir', type=Path, default=ROOT / 'reference')
    args = parser.parse_args()
    reference = args.reference_dir.resolve()
    registry, navigation, components = {}, [], []
    destination = ROOT / 'static/sources'
    destination.mkdir(parents=True, exist_ok=True)

    def entry(doc_id, path, title, kind, original):
        with pymupdf.open(path) as pdf:
            registry[doc_id] = {
                'id': doc_id, 'title': title, 'kind': kind, 'pages': len(pdf),
                'pdf': f'/sources/{doc_id}.pdf', 'pageBase': f'/pages/{doc_id}',
                'sizes': [[round(p.rect.width, 2), round(p.rect.height, 2)] for p in pdf],
                'original': original, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            }

    def register(doc_id, source, title, kind):
        target = destination / f'{doc_id}.pdf'
        shutil.copyfile(source, target)
        entry(doc_id, target, title, kind, 'reference/' + source.relative_to(reference).as_posix())

    for label, prefix, en, zh in LECTURES:
        matches = list((reference / 'Lecture Notes').glob(prefix + '*.pdf'))
        if len(matches) != 1:
            raise ValueError(f'Expected one lecture matching {prefix}: {matches}')
        doc_id = 'lecture-' + label.replace('–', '-')
        register(doc_id, matches[0], 'Lecture ' + label, 'lecture')
        navigation.append({'doc': doc_id, 'label': label, 'title': {'en': en, 'zh': zh}})

    # Post-lecture editions contain different handwritten/visual material even
    # where extracted text matches; preserve them as distinct sources.
    for number, filename in [('02', 'Post_Lecture-EES-Lecture-2.pdf'),
                             ('03', 'Post_Lecture-EES-Lecture_3.pdf'),
                             ('07', 'Post_Lecture-EES-Lecture_7.pdf')]:
        register(f'post-lecture-{number}', reference / 'Lecture Notes' / filename,
                 f'Lecture {number} · Post-lecture edition', 'notes')

    # Two independent byte-preserved sheets, one per exam; never combine them.
    sheets = [('reference-exam1', 'Exams/Exam1/Reference_Sheet_-_Fall_2026.pdf'),
              ('reference-exam2', 'Exams/Exam2/Reference_Sheet_Midterm_Exam-2-_Fall_2026.pdf')]
    for doc_id, relative in sheets:
        path = reference / relative
        register(doc_id, path, f'Reference Sheet · Exam {doc_id[-1]} · Fall 2026', 'crib')
        components.append({'doc': doc_id, 'original': 'reference/' + relative,
                           'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

    for doc_id, relative, title, kind in [
        ('syllabus', 'Course Syllabus.pdf', 'Course syllabus · Fall 2026', 'notes'),
    ]:
        register(doc_id, reference / relative, title, kind)
    for number in range(1, 8):
        candidates = [p for p in (reference / 'Homework').glob('*.pdf')
                      if f'Homework-{number}_' in p.name or f'Homework_-_{number}_' in p.name]
        if len(candidates) != 1:
            raise ValueError(f'Expected one Homework {number}: {candidates}')
        register(f'homework-{number}', candidates[0], f'Homework {number}', 'homework')
        solutions = [p for p in (reference / 'Homework/Homework Solutions').glob('*.pdf')
                     if f'Homework-{number}_' in p.name]
        if len(solutions) > 1:
            raise ValueError(f'Ambiguous Homework {number} solution')
        if solutions:
            register(f'homework-{number}-sol', solutions[0], f'Homework {number} · Solutions', 'solution')

    def save(path, value):
        (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    save('content/documents.json', registry)
    save('content/source-provenance.json', {'referenceSheets': components, 'method': 'Separate byte-preserved official Reference_Sheet PDFs; never combined or supplemented from lectures'})
    save('content/course.json', {
        'id': 'ecse-2110', 'code': 'ECSE 2110',
        'title': {'en': 'Electrical Energy Systems', 'zh': '电能系统'},
        'defaultProblemId': 'e1-f26-q1', 'storageKey': 'ecse2110-fieldnotes-v1',
        'resources': {'formulaSheet': None, 'formulaSheets': {'1': 'reference-exam1', '2': 'reference-exam2'}, 'lectures': navigation},
    })
    print(f'Provisioned {len(registry)} shared documents; no student submissions imported.')


if __name__ == '__main__':
    main()
