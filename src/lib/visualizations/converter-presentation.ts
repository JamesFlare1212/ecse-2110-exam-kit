import {CONDUCTION_INTERVALS,atCycleAngle} from './semi-converter-model.mjs';
import {FULL_PROFILES,fullIntervals,atFullCycleAngle,validateRippleData} from './full-converter-model.mjs';
import {semiConverterCopy} from './semi-converter-copy';
import {conductionMeasurements,svgPath,type Measurement,type WaveKey,type ConverterValues} from './conduction-measurements';
import type {ConductionGeometry,RouteKey} from './conduction-geometry';
import type {FullConverterProfile,Locale} from '../types';
export type RippleData=ReturnType<typeof validateRippleData>;
export interface ConverterInterval {start:number;end:number;route:RouteKey;active:string[]}
export type ConverterCopy=Omit<typeof semiConverterCopy.en,'measurements'>&{measurements:Partial<Record<WaveKey,{name:string;reference:string}>>};
export function converterIntervals(profile?:FullConverterProfile):ConverterInterval[]{
  return (profile?fullIntervals(FULL_PROFILES[profile].alpha):CONDUCTION_INTERVALS) as ConverterInterval[];
}
export function converterValues(angle:number,profile?:FullConverterProfile,ripple?:RippleData):ConverterValues{
  const raw=profile?atFullCycleAngle(angle,profile,ripple):atCycleAngle(angle);
  return{is3:0,is4:0,id1:0,id2:0,vs1:0,...raw};
}
export function converterMeasurements(geometry:ConductionGeometry,profile?:FullConverterProfile,ripple?:RippleData):Measurement[]{
  if(!profile){if(geometry.version!==1)throw new Error('Semi-converter requires its own bridge geometry');return conductionMeasurements(geometry);}
  if(geometry.version!==2)throw new Error('Full converter requires its own four-SCR geometry');
  const alpha=FULL_PROFILES[profile].alpha;
  const samples=[...Array.from({length:721},(_,i)=>i*.5),alpha-1e-6,alpha,180+alpha-1e-6,180+alpha,359.999999].sort((a,b)=>a-b);
  const symbols:Partial<Record<WaveKey,string>>={v:'v',i:'i',v0:'v₀',i0:'i₀',is1:'iₛ₁',is2:'iₛ₂',is3:'iₛ₃',is4:'iₛ₄'};
  const tokens:Partial<Record<WaveKey,string>>={v:'voltage',i:'source-current',v0:'output-voltage',i0:'load-current',is1:'thyristor-current',is2:'thyristor-current',is3:'alternate-thyristor-current',is4:'alternate-thyristor-current'};
  return geometry.probes.map(probe=>{
    const key=probe.key,dash=key==='is2'||key==='is4'?'5 3':'';
    return{...probe,symbol:symbols[key]!,unit:key[0]==='v'?'Vₘ':'I₀',token:`--measurement-${tokens[key]}`,pattern:dash?'dashed':'',dash,
      trace:svgPath(samples.map(t=>[5+310*t/360,15-converterValues(t,profile,ripple)[key]*10]))};
  });
}
export function converterCopy(locale:Locale,profile?:FullConverterProfile):ConverterCopy{
  const base=semiConverterCopy[locale];if(!profile)return base;
  const zh=locale==='zh',settings=FULL_PROFILES[profile],alpha=settings.alpha;
  const firing=Number(alpha.toFixed(6)),nextFiring=Number((180+alpha).toFixed(6));
  const pairs=['S₃ + S₄','S₁ + S₂','S₃ + S₄'];
  const positive=zh?'正向电源电流':'Positive source current',negative=zh?'反向电源电流':'Negative source current';
  const stages=[0,1,2].map((index)=>({
    short:index===1?positive:negative,title:index===1?positive:negative,
    explanation:zh?(index===0?'上一周期的 S₃、S₄ 继续导通，直到本周期触发 S₁、S₂。':index===1?'S₁、S₂ 从 α 导通到 π+α；电源过零不自动关断，输出电压在过零后可为负。':'S₃、S₄ 从 π+α 继续导通到下一周期的 α。'):(index===0?'S₃/S₄ remain on from the preceding cycle until S₁/S₂ fire.':index===1?'S₁/S₂ conduct from α to π+α, including the negative output-voltage segment after the source zero crossing.':'S₃/S₄ conduct from π+α until α in the next cycle.'),
    path:index===1?'S₁ → L–motor → S₂':'S₃ → L–motor → S₄',relation:index===1?'v₀ = v, i = +i₀':'v₀ = −v, i = −i₀',
  }));
  const profileNote=profile==='reversed-emf'?(zh?'本题强制采用连续无纹波电流；不能因给出有限电感而另造纹波。Eₐ = −11 V，机械端和交流源都向电路供能，不是向交流源再生制动。':'The question imposes ripple-free continuous current despite finite inductance. Eₐ = −11 V: both the mechanical machine and AC source feed the circuit; this is not regeneration into the AC source.'):
    profile==='ideal-drive'?(zh?'按题设理想无损电机，省略电枢电阻和独立励磁支路。触发角使用未取整的 59.397409°，不替换成原解近似的 60°。':'The ideal lossless motor has no armature resistor or separate field branch here. Use the unrounded 59.397409° firing angle, not the source’s approximate 60°.'):
    (zh?'纹波沿用静态解答的代表性周期 RL–反电动势解：平均 20 A，纹波有效值 4 A；形状和所选电感是示意模型，不是新增已知条件。8192 点周期样本线性插值有微小数值误差（平均功率误差小于 0.01%）；不能把平均功率替换为平均电压乘平均电流。独立励磁支路不在桥的电枢电流路径中，保持普通线条，不表示关断。':'Ripple reuses the static solution’s representative periodic RL–emf trajectory: mean 20 A, ripple RMS 4 A. Its shape and chosen inductance are illustrative, not additional givens. Linear interpolation of 8192 periodic samples has small numerical error (<0.01% in average power); average power is not the product of means. The independent field is outside the bridge armature-current route; its ordinary outline does not mean it is off.');
  return{...base,fullPlotTitle:profile==='reversed-emf'?(zh?'完整静态电路示意':'Complete static circuit schematic'):base.fullPlotTitle,compactTitle:zh?'全控桥导通与波形':'Full converter',title:zh?'全控桥导通与波形':'Full-converter conduction and waveforms',pairs,stages,
    stageLabels:[zh?'上周期延续':'Previous pair',zh?'S₁ / S₂':'S₁ / S₂',zh?'S₃ / S₄':'S₃ / S₄'],
    compactStates:zh?['S₃、S₄ 延续导通；等待 α 触发。','S₁、S₂ 导通；跨越电源过零点仍保持电流。','S₃、S₄ 导通；负载电流方向不变。']:['S₃/S₄ remain on until firing at α.','S₁/S₂ stay on through the source zero crossing.','S₃/S₄ conduct; load current stays positive.'],
    phaseHelp:zh?`可连续拖动 0°–360°。只有两组对角器件轮流导通；显示边界把前一组拆成首尾两段，没有二极管续流区间。触发点为 ${firing}° 和 ${nextFiring}°；播放跨越过零点，不自动暂停。`:`Scrub continuously from 0° to 360°. Only two diagonal pairs alternate; the display boundary splits one pair into first/last segments. There is no diode-freewheel interval. Firing: ${firing}° and ${nextFiring}°. Play crosses the zero crossing without pausing.`,
    completed:zh?'本周期结束，保持 S₃、S₄ 的末段左极限；重新播放才归零。':'Cycle complete: holding the final S₃/S₄ left limit. Restart explicitly.',
    endRelation:'360°: S₃ + S₄; v₀ = 0; i = −i₀.',
    diagram:zh?'四晶闸管全控桥；粗亮支路表示导通，中性箭头表示电枢回路约定电流方向':'Four-SCR full bridge; bold branches conduct, neutral arrows show armature-loop conventional current',
    waveAlt:zh?'全控桥的电源电压和电流、输出电压和电流及四个晶闸管电流':'Full-converter supply/load voltages and currents, and four SCR currents',
    reverseNote:zh?'全控桥没有半控桥的两二极管续流状态；每组持续导通 180°。负的瞬时输出电压不等于负的平均功率。':'There is no two-diode freewheel state. Each pair conducts for 180°. Negative instantaneous output voltage does not imply negative average power.',
    assumptions:`${zh?'理想器件，已建立连续电流；电压按峰值 Vₘ、电流按平均值 I₀ 归一化。':'Ideal devices, established continuous current; voltages normalized by peak Vₘ and currents by mean I₀.'} Vₘ = ${(Math.SQRT2*settings.voltageRms).toFixed(4)} V; I₀ = ${settings.current.toFixed(6)} A. ${profileNote}`,
    polarityHelp:zh?'电压正端固定在上端，负值不交换测量端。左上／左下为 S₁／S₄，右上／右下为 S₃／S₂；正电流均沿器件支路向上。电枢 Eₐ 是有符号反电动势，图中 + / − 为固定参考。':'Voltage references stay + upper/− lower even for negative readings. Left upper/lower: S₁/S₄; right upper/lower: S₃/S₂. Forward device currents run upward. Eₐ is signed emf; the drawn +/− reference stays fixed.',
    measurements:{...base.measurements,is2:{name:zh?'S₂ 电流':'S₂ current',reference:zh?'S₂ 在右下支路，正参考向上。':'S₂ is lower right; positive reference is upward.'},is3:{name:zh?'S₃ 电流':'S₃ current',reference:zh?'S₃ 在右上支路，正参考向上。':'S₃ is upper right; positive reference is upward.'},is4:{name:zh?'S₄ 电流':'S₄ current',reference:zh?'S₄ 在左下支路，正参考向上。':'S₄ is lower left; positive reference is upward.'}},
  };
}
