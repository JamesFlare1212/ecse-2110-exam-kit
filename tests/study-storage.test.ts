import {expect, test} from 'bun:test';
import {mergeStudyRecords, parseStudyRecord} from '../src/lib/study-storage';

test('stale tabs merge independent progress, bookmarks and preferences, including undo', () => {
  const base = {version:1,locale:'zh',theme:'light',completed:{a:true},bookmarks:{q:true},sidebars:{navigation:true,references:true}};
  const remote = {...base,locale:'en',completed:{a:true,b:true},bookmarks:{q:true,r:true},sidebars:{navigation:false,references:true}};
  const local = {...base,theme:'dark',completed:{a:false},bookmarks:{q:false},sidebars:{navigation:true,references:false}};
  const result = mergeStudyRecords(base,local,remote);
  expect(result).toEqual({version:1,locale:'en',theme:'dark',completed:{a:false,b:true},bookmarks:{q:false,r:true},sidebars:{navigation:false,references:false}});
  expect(mergeStudyRecords(local,local,result)).toEqual(result);
});

test('legacy and unplugged records remain lossless while active progress changes', () => {
  const note = 'x'.repeat(19999)+'😀TAIL';
  const base = {version:1,notes:{'e9-f99-q1':note},mode:'practice',revealed:{'e9-f99-q1-a':999},completed:{},future:{data:'keep'}};
  const remote = {...base,notes:{...base.notes,other:'another tab'}};
  const result = mergeStudyRecords(base,{...base,completed:{'e1-f25-q1-a':true}},remote);
  expect(result.notes).toEqual(remote.notes);
  expect(result.revealed).toEqual(base.revealed);
  expect(result.future).toEqual(base.future);
  expect(parseStudyRecord(JSON.stringify(result))).toEqual(result);
});

test('invalid and unsupported records reject writes instead of becoming empty progress', () => {
  for (const raw of ['{','null','[]','7','{}','{"version":2,"saved":true}'])
    expect(()=>parseStudyRecord(raw)).toThrow();
  expect(parseStudyRecord(null)).toEqual({version:1});
});
