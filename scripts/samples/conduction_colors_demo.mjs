// Isolated experiment. Reads canonical assets/model; never stages or edits the app.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const out=resolve('artifacts/conduction-color-sample');await mkdir(out,{recursive:true});
const asset='content/en/practice2_f26/assets/figures/p2-f26-q4-conduction';
const geometryText=await readFile(asset+'.json','utf8'),geometry=JSON.parse(geometryText);
const sourceSVG=await readFile(asset+'.svg','utf8');
const model=await readFile('src/lib/visualizations/semi-converter-model.mjs','utf8');
const template=await readFile('scripts/samples/conduction_colors.template.html','utf8');
// Recover the existing equal-unit transform from its native terminal coordinates.
const [origin,terminal]=geometry.routes.positive,scale=(terminal[0]-origin[0])/2.8;
const p=(x,y)=>[+(origin[0]+(x+1)*scale).toFixed(4),+(origin[1]-(y-3.7)*scale).toFixed(4)];
const current=(key,symbol,name,point,arrow,reference,pattern='')=>({key,symbol,name,kind:'current',unit:'I₀',point:p(...point),arrow:arrow.map(a=>p(...a)),anchor:p(...point),reference,pattern,dash:pattern==='dashed'?'5 3':''});
const voltage=(key,symbol,name,pins,ends,reference,pattern='')=>({key,symbol,name,kind:'voltage',unit:'Vₘ',pins:pins.map(a=>p(...a)),ends:ends.map(a=>p(...a)),anchor:p(...ends[0]),reference,pattern,dash:pattern==='dotted'?'2 3':''});
const signals=[
 voltage('v','v','电源电压',[[-1,3.7],[-1,2.3]],[[-.08,3.7],[-.08,2.3]],'电源上端为 +，下端为 −。'),
 current('i','i','源电流',[.65,3.7],[[.15,3.4],[1.05,3.4]],'固定正参考沿上输入导线向右。'),
 voltage('v0','v₀','输出电压',[[6.6,5.6],[6.6,.4]],[[7.65,5.6],[7.65,.4]],'负载上端为 +，下端为 −。'),
 current('i0','i₀','负载电流',[5.55,5.6],[[5.1,5.3],[6.05,5.3]],'固定正参考沿负载上导线向右，再向下流过 R–L。'),
 current('is1','iₛ₁','S₁ 电流',[1.8,5.4],[[1.25,4.25],[1.25,5.15]],'S₁ 的正电流由下方阳极 A 流向上方阴极 K。'),
 current('is2','iₛ₂','S₂ 电流',[1.8,.65],[[1.25,.95],[1.25,1.85]],'S₂ 的正电流沿左下支路向上。','dashed'),
 current('id1','iᴅ₁','D₁ 电流',[3.8,5.4],[[4.25,4.25],[4.25,5.15]],'D₁ 的正电流沿右上支路向上。'),
 current('id2','iᴅ₂','D₂ 电流',[3.8,.65],[[4.25,.95],[4.25,1.85]],'D₂ 的正电流沿右下支路向上。','dashed'),
 // Crucial: v_s1 is anode minus cathode, NOT top minus bottom.
 voltage('vs1','vₛ₁','S₁ 电压',[[1.8,4.2],[1.8,5.2]],[[.92,4.2],[.92,5.2]],'S₁ 下端阳极 A 为 +，上端阴极 K 为 −。','dotted'),
];
const base=sourceSVG.replace('<svg ',`<svg width="${geometry.viewBox[2]}" height="${geometry.viewBox[3]}" style="color:CanvasText;color-scheme:light" `).replaceAll('var(--card)','Canvas');
await writeFile(resolve(out,'bridge.svg'),base);
const escapeScript=s=>s.replaceAll('</script','<\\/script');
let html=template.replace('__MODEL_JS__',escapeScript(model.replaceAll('export ','')))
 .replace('__SIGNALS_JSON__',JSON.stringify(signals))
 .replace('__BASE_IMAGE__',resolve(out,'bridge.svg'));
const fonts=process.argv.indexOf('--font-css');if(fonts!==-1)html=html.replace('</style>',await readFile(process.argv[fonts+1],'utf8')+'\n</style>');
await writeFile(resolve(out,'preview.zh.html'),html);
// UI-only translation for the portable preview; no question content is authored.
const phrases={
 '半控桥 · 彩色测量与波形筛选小样':'Semi-converter · linked probes and waveforms',
 '彩色测量与波形筛选交互小样':'Linked circuit probes and waveform filters',
 '电路探针 ↔ 同色波形':'Circuit probes ↔ matching waveforms',
 '独立小样 · 未接入正式页':'Prototype · not integrated','独立小样':'Prototype',
 '波形筛选':'Waveform filters','显示波形':'Waveforms','波形组合':'Waveform preset',
 '输入与输出':'Input / output','开关器件':'Devices','全部波形':'All nine','自定义':'Custom','只看当前':'Solo focus',
 '勾选要显示的物理量':'Select quantities to show',
 '点波形开关；灰色为关闭，保留位置便于再次开启。':'Click any waveform to toggle it. Gray is off; every row stays available.',
 '点任意波形即可开启。':'Click any waveform to turn it on.',
 '开启':'On','关闭':'Off',
 '勾选筛选；点波形标题，定位电路中的同色探针与迷你示波器。':'Filter with checkboxes. Click a waveform title to locate its probe and in-circuit mini scope.',
 '选择导通区间':'Select conduction interval','上一边界':'Previous boundary','下一边界':'Next boundary','电角度':'Electrical angle',
 '可连续拖动；播放从当前位置到 360 度，不在触发点暂停。':'Scrub freely. Play continues to 360° without stopping at firing points.',
 '电路测量位置':'Circuit probe locations','测量位置':'Probe location','筛选后的同步波形':'Selected synchronized waveforms','同步波形':'Waveforms',
 '色线：已走过 · 灰线：参考':'Color: elapsed · gray: reference',
 '颜色标识':'Colors identify ','同一个测量量':'the same measured quantity',
 '，不是节点电势高低或导通状态。空心圆是测量探针，点状线是示波器引线，均不是新增接线；隐藏曲线不会改变电路计算。':', not node potential or conduction state. Hollow rings and dotted scope leads are measurement annotations, not new circuit connections. Filtering never changes the physics.',
 '极性、方向与小样边界':'Polarity, directions and scope',
 '电压使用固定 + / − 参考，负值不交换测量端。彩色电流箭头随实际约定电流方向反向；零值仅留虚线参考。iₛ₁/iₛ₂、iᴅ₁/iᴅ₂ 分别用同色实线／虚线与下标区分，不靠颜色单独辨认。vₛ₁ 的正端在 S₁ 下端阳极 A，负端在上端阴极 K。':'Voltage polarity references stay fixed, including for negative values. Colored current arrows reverse with the signed conventional current; zero current has only a dashed reference. Paired device currents use solid/dashed styles and explicit subscripts. For vₛ₁, + is the lower anode A and − is the upper cathode K.',
 '沿用正式模型：α = 30°、理想器件、已建立连续恒定负载电流，所有量归一化。360° 完成位置取末段左极限；主动重新播放才回到 0°。正式题目、原图、资源及现有交互不变。':'Uses the production model: α = 30°, ideal devices, established constant continuous load current, normalized values. The 360° endpoint holds the final interval’s left-hand limit. Restart is explicit. No production content or behavior is changed.',
 '原半控桥电路及彩色测量探针':'Original semi-converter topology with colored measurement probes',
 '负半周供电；源电流反向，负载电流同向。':'Negative supply: source current reverses, load current does not.',
 '电感维持负载电流，源电流为零。':'Freewheeling: load current continues; source current is zero.',
 '正半周供电；源电流为正。':'Positive supply: positive source current.',
 '再次续流；S₁ 电压过零后转负。':'Freewheeling again: S₁ voltage is now negative.',
 '本周期结束，保持末段左极限；重新播放才回到 0°。':'Cycle complete: holding the final left-hand limit. Restart explicitly.',
 '没有选中的波形。可勾选物理量，或选择“输入与输出”恢复。':'No waveforms selected. Select quantities or restore Input / output.',
 '选择波形后，在电路上显示对应测量位置。':'Select a waveform to show its measurement location.',
 '电源上端为 +，下端为 −。':'Supply upper terminal +, lower terminal −.',
 '固定正参考沿上输入导线向右。':'Positive reference: rightwards along the upper supply lead.',
 '负载上端为 +，下端为 −。':'Load upper terminal +, lower terminal −.',
 '固定正参考沿负载上导线向右，再向下流过 R–L。':'Positive reference: rightwards on the top load wire, then down through R–L.',
 'S₁ 的正电流由下方阳极 A 流向上方阴极 K。':'Positive S₁ current: lower anode A to upper cathode K.',
 'S₂ 的正电流沿左下支路向上。':'Positive S₂ current: upwards through the lower-left branch.',
 'D₁ 的正电流沿右上支路向上。':'Positive D₁ current: upwards through the upper-right branch.',
 'D₂ 的正电流沿右下支路向上。':'Positive D₂ current: upwards through the lower-right branch.',
 'S₁ 下端阳极 A 为 +，上端阴极 K 为 −。':'S₁ lower anode A is +; upper cathode K is −.',
 ' 当前为负，彩色箭头与固定参考反向。':' Negative now: the colored arrow opposes the fixed reference.',
 ' 当前为零，无彩色流动箭头。':' Zero now: no flowing-current arrow.',
 ' 当前为正，彩色箭头与参考同向。':' Positive now: the colored arrow follows the reference.',
 ' 当前读数为负，固定极性不交换。':' Negative reading: polarity references do not swap.',
 '电源电压':'Supply voltage','源电流':'Supply current','输出电压':'Output voltage','负载电流':'Load current',
 'S₁ 电流':'S₁ current','S₂ 电流':'S₂ current','D₁ 电流':'D₁ current','D₂ 电流':'D₂ current','S₁ 电压':'S₁ voltage',
 '已定位 ':'Focused: ','归一化波形':'normalized waveform','未选择':'No selection','定位 ':'Focus ',
 '：':': ','从头播放':'Restart','显示周期末':'Show cycle end','暂停':'Pause','播放':'Play','续流':'Freewheel','正半周':'Positive','负半周':'Negative',' 度，':'°, ',
};
// Long phrases first so a short label never corrupts an explanatory sentence.
for(const [zh,en]of Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length))html=html.replaceAll(zh,en);
html=html.replace('lang="zh-CN"','lang="en"');
// The English inline preview needs no large CJK font asset.
if(fonts!==-1){const css=await readFile(process.argv[fonts+1],'utf8');html=html.replace(css,'');}
await writeFile(resolve(out,'preview.html'),html);
const provenance={purpose:'Isolated color/probe/filter prototype; not a registered page or authored question',files:Object.fromEntries([[asset+'.svg',sourceSVG],[asset+'.json',geometryText],[ 'src/lib/visualizations/semi-converter-model.mjs',model]].map(([file,value])=>[file,createHash('sha256').update(value).digest('hex')])),signals:signals.map(s=>({key:s.key,kind:s.kind,reference:s.reference})),transform:{origin,scale}};
await writeFile(resolve(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(`Created ${out}/preview.html and preview.zh.html (${Buffer.byteLength(html)} English HTML bytes)`);
