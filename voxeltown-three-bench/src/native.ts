import {Capacitor,registerPlugin} from '@capacitor/core';
export const platform=Capacitor.getPlatform();
export const native=platform==='android'||platform==='ios';
export const platformLabel=platform==='ios'?'ios-wkwebview':native?'android-webview':'desktop-QA-NOT-product-benchmark';
interface Bridge {
  info():Promise<Record<string,unknown>>;
  snapshot():Promise<Record<string,unknown>>;
  ready():Promise<{activityToReadyMs:number}>;
  awake(options:{enabled:boolean}):Promise<void>;
  save(options:{json:string}):Promise<{path:string}>;
}
export const Bench=registerPlugin<Bridge>('Bench');
export async function snapshot(){return native?Bench.snapshot():{source:'desktop-functional-QA',totalPssKb:null,batteryPercent:null};}
