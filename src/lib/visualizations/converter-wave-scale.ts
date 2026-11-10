/** Shared SVG coordinates for curves, cursors, reference guides and the HTML ruler. */
export const WAVE_PLOT={width:320,height:30,start:5,end:315} as const;
export const waveX=(angle:number)=>WAVE_PLOT.start+(WAVE_PLOT.end-WAVE_PLOT.start)*angle/360;
export const wavePercent=(angle:number)=>waveX(angle)/WAVE_PLOT.width*100;
