import * as THREE from 'three';
import {TownScene} from './scene';import {Bench,native,platformLabel,snapshot} from './native';import type {V3} from './types';
export const PROFILE='three-visible-faces-v1';
export const median=(a:number[])=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
export function percentile(a:number[],p:number){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor((s.length-1)*p))];}
export class Benchmark {
  active=false;frame:((time:number)=>void)|null=null;cancelled=false;
  report:Record<string,any>={profile:PROFILE,formatVersion:1,status:'pending-physical-device',createdAt:new Date().toISOString(),platform:platformLabel,acceptance:{medianFps:59,p95FrameMs:20,longFrameMs:33.34,maxLongFrameFraction:.01,meanRebuildMs:30,memory:'See MEASUREMENT-PROTOCOL.md; full process set required'},fps:{},edits:null,idle:null,startup:null};
  constructor(public town:TownScene,public request:()=>void,public status:(s:string)=>void){}
  async initialize(){this.report.device=native?await Bench.info():{userAgent:navigator.userAgent};this.report.data=this.town.world.bundle.manifest;this.report.render=this.town.stats();}
  async begin(label:string){if(this.active)throw Error('計測中です');this.active=true;this.cancelled=false;this.town.controls.enabled=false;this.status(label);if(native)await Bench.awake({enabled:true});}
  async end(){this.frame=null;this.active=false;this.town.controls.enabled=true;if(native)await Bench.awake({enabled:false});this.request();}
  abort(){this.cancelled=true;}
  check(){if(this.cancelled||document.hidden)throw Error('計測を中止しました。アプリを前面にして再実行してください。');}
  async fps(){
    await this.begin('描画計測 3 × 30秒');
    const originalZoom=this.town.camera.zoom;const originalPos=this.town.camera.position.clone();
    try{
      for(const mode of ['still','orbit','zoom']){
        this.check();this.town.resetView();const startPos=this.town.camera.position.clone().sub(this.town.controls.target),radius=Math.hypot(startPos.x,startPos.y),angle=Math.atan2(startPos.y,startPos.x),baseZ=startPos.z;
        const result=await new Promise<Record<string,unknown>>((resolve,reject)=>{
          let start=0,last=0;const dt:number[]=[];
          this.frame=t=>{try{
            this.check();if(!start)start=t;const seconds=(t-start)/1000,elapsed=Math.max(0,seconds-3);
            if(seconds>=3&&last&&t-last>0)dt.push(t-last);last=t;
            if(mode==='orbit'){const theta=angle+elapsed*Math.PI*2/30;this.town.camera.position.copy(this.town.controls.target).add(new THREE.Vector3(radius*Math.cos(theta),radius*Math.sin(theta),baseZ));this.town.camera.lookAt(this.town.controls.target);}
            if(mode==='zoom'){this.town.camera.zoom=1+.25*(1-Math.cos(2*Math.PI*elapsed/30));this.town.camera.updateProjectionMatrix();}
            if(seconds>=33){this.frame=null;const p95=percentile(dt,.95)!;const fps=median(dt.map(x=>1000/x))!;const longFraction=dt.filter(x=>x>33.34).length/dt.length;
              resolve({durationMs:dt.reduce((a,b)=>a+b,0),samples:dt.length,medianFps:fps,p95FrameMs:p95,longFrameFraction:longFraction,intervalsMs:dt,source:'WebView requestAnimationFrame / CPU submission cadence',thresholdPass:fps>=59&&p95<=20&&longFraction<=.01});}
          }catch(e){this.frame=null;reject(e);}};this.request();
        });
        this.report.fps[mode]=result;this.status(`${mode} 完了`);
      }
    }finally{this.town.camera.position.copy(originalPos);this.town.camera.zoom=originalZoom;this.town.camera.updateProjectionMatrix();this.town.controls.update();await this.end();}
  }
  async edits(){
    await this.begin('置く・消す 各10回');
    try{
      let p:V3|null=null;
      const w=this.town.world;
      // Interior plain surface: one changed cell, exactly one chunk. Do not break source finish pieces.
      for(let z=w.size[2]-2;z>0&&!p;z--)for(let y=2;y<w.size[1]-2&&!p;y++)for(let x=2;x<w.size[0]-2&&!p;x++){
        if([x,y,z].some(v=>(v&15)<2||(v&15)>12))continue;
        if(w.get(x,y,z)&&!w.getOwner(x,y,z)&&!w.get(x,y,z+1))p=[x,y,z+1];
      }
      if(!p)throw Error('計測用の空きマスがありません');const value=w.get(p[0],p[1],p[2]-1),rows:any[]=[];
      for(let i=0;i<10;i++)for(const v of [value,0]){
        this.check();const start=performance.now(),row=this.town.applyEdit(p,v);this.town.render();
        await new Promise<void>(r=>requestAnimationFrame(()=>r()));rows.push({...row,index:i,cpuSubmitToNextRafMs:performance.now()-start});
      }
      this.report.edits={cell:p,rows,add:this.summarizeEdits(rows.filter(r=>r.operation==='add')),remove:this.summarizeEdits(rows.filter(r=>r.operation==='remove')),scope:'interior plain cell, 1 chunk; CPU mesh and submission, not GPU present fence'};
      this.status('置く・消す 完了');
    }finally{await this.end();}
  }
  summarizeEdits(rows:any[]){const times=rows.map(r=>r.meshMs);const mean=times.reduce((a,b)=>a+b,0)/times.length;return {n:rows.length,meanMeshMs:mean,p95MeshMs:percentile(times,.95),meanTotalMs:rows.reduce((a,b)=>a+b.totalMs,0)/rows.length,thresholdPass:mean<30};}
  async idle(){
    await this.begin('静止・電池計測 10分。充電を外してください');
    try{
      this.town.resetView();this.town.render();await new Promise(r=>setTimeout(r,1000));
      const beforeRenders=this.town.renderCount,start=performance.now(),samples:any[]=[];
      for(let i=0;i<=20;i++){
        this.check();samples.push({elapsedMs:performance.now()-start,...await snapshot()});
        if(i<20)await new Promise<void>((resolve,reject)=>{let n=0;const timer=setInterval(()=>{try{this.check();if(++n===30){clearInterval(timer);resolve();}}catch(e){clearInterval(timer);reject(e);}},1000);});
      }
      const first=samples[0],last=samples.at(-1),charging=samples.some(s=>s.plugged);
      const delta=(key:string)=>typeof first[key]==='number'&&typeof last[key]==='number'?last[key]-first[key]:null;
      this.report.idle={elapsedMs:performance.now()-start,extraRenders:this.town.renderCount-beforeRenders,samples,chargingInvalid:charging,batteryDropPercent:!charging&&delta('batteryPercent')!==null?-delta('batteryPercent')!:null,appPssDeltaKb:delta('appPssKb'),appPhysFootprintDeltaBytes:delta('appPhysFootprintBytes'),totalProcessPssDeltaKb:null,note:'App-only memory excludes WKWebView WebContent/GPU processes. Capture the full process set externally; no leak verdict from app memory alone.'};
      this.status(charging?'完了（充電中のため電池結果は無効）':'10分計測 完了');
    }finally{await this.end();}
  }
  json(){this.report.render=this.town.stats();return JSON.stringify(this.report,null,2);}
}
