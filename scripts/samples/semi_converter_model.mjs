/** Offline teaching sample for p2-f26-q4(a), not a new question-bank source.
 * Ideal devices, alpha=30 degrees, established continuous current i0/I0=1.
 * Original leg order: S1/S2 on the left, D1/D2 on the right, all forward up.
 */
export const STAGES = [
  {start:0,end:30,title:'续流，等待触发',pair:'D₁ + D₂',short:'续流',
    explanation:'S₁ 尚未触发。电感维持负载电流，电流经 D₁、负载、D₂ 闭合；交流电源不供电。',
    path:'D₁ → R–L → D₂ → D₁',relation:'v₀ = 0，i = 0，i₀ = I₀',
    active:['load','D1','D2'],route:'freewheel'},
  {start:30,end:180,title:'正半周供电',pair:'S₁ + D₂',short:'正向供电',
    explanation:'在 α = 30° 触发 S₁。电流从电源上端经 S₁、负载、D₂ 回到电源下端；源电流为正。',
    path:'电源上端 → S₁ → R–L → D₂ → 电源下端',relation:'v₀ = v，i = +I₀，i₀ = I₀',
    active:['load','source','S1','D2','top-left'],route:'positive'},
  {start:180,end:210,title:'电源过零，再次续流',pair:'D₁ + D₂',short:'再次续流',
    explanation:'电源反向后，S₁ 关断，电流转入 D₁、D₂ 续流。负载电流不消失；S₂ 等待 210° 的触发。',
    path:'D₁ → R–L → D₂ → D₁',relation:'v₀ = 0，i = 0；vₛ₁ = v（过零后为负）',
    active:['load','D1','D2'],route:'freewheel'},
  {start:210,end:360,title:'负半周供电',pair:'S₂ + D₁',short:'反向供电',
    explanation:'在 π + α = 210° 触发 S₂。电流从电源下端经 D₁、负载、S₂ 回到上端；交流侧电流反向，负载电流仍同向。',
    path:'电源下端 → D₁ → R–L → S₂ → 电源上端',relation:'v₀ = −v > 0，i = −I₀，i₀ = I₀',
    active:['load','source','S2','D1','bottom-left'],route:'negative'},
];
export const ROWS = [
  ['v','v / Vₘ'],['i0','i₀ / I₀'],['v0','v₀ / Vₘ'],
  ['is1','iₛ₁ / I₀'],['is2','iₛ₂ / I₀'],['id1','i_d₁ / I₀'],
  ['id2','i_d₂ / I₀'],['i','i / I₀'],['vs1','vₛ₁ / Vₘ'],
];
// The approved prototype now shares its arithmetic with the production widget.
export {atAngle} from '../../src/lib/visualizations/semi-converter-model.mjs';
