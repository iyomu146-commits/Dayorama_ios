// ICRS -> Galactic rotation, Gaia EDR3 documentation, equation 4.62.
// https://gea.esac.esa.int/archive/documentation/GEDR3/Data_processing/chap_cu3ast/sec_cu3ast_intro/ssec_cu3ast_intro_tansforms.html
// Only the coordinate frame is astronomical. The light, dust and unresolved
// particles below are original procedural artwork, not a measured star map.
export const GALACTIC_ROTATION=Object.freeze([
 -.0548755604162154,-.8734370902348850,-.4838350155487132,
 .4941094278755837,-.4448296299600112,.7469822444972189,
 -.8676661490190047,-.1980763734312015,.4559837761750669
]);
export function toGalactic(v){return[0,1,2].map(i=>v.reduce((s,x,j)=>s+x*GALACTIC_ROTATION[i*3+j],0));}
export function fromGalactic(v){return[0,1,2].map(i=>v.reduce((s,x,j)=>s+x*GALACTIC_ROTATION[j*3+i],0));}
const laneAt=l=>.023*Math.sin(l*2+.4)+.017*Math.sin(l*5-1.2);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function dustTransmission(l,b){
 const lane=laneAt(l),width=.009+.019*(.5+.5*Math.sin(l*7+.7));
 const coverage=smooth(.28,.74,.5+.28*Math.sin(l*4+.8)+.16*Math.sin(l*9-.4));
 // Foreground stars remain visible through the dust. Gaps in the obscuring
 // clouds keep the whole galactic equator from becoming one black trench.
 return .30+.70*Math.exp(-1.45*Math.exp(-(((b-lane)/width)**2))*coverage*(.55+.45*(.5+.5*Math.cos(l))));
}
export function makeMilkyWayParticles({count=110000,seed=741031}={}){
 if(!Number.isInteger(count)||count<0||count>200000)throw Error('Invalid Milky Way particle budget');
 let state=(seed>>>0)||1;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random());
 const positions=new Float32Array(count*3),flux=new Float32Array(count),sizes=new Float32Array(count),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const population=random();let l,b;
  if(population<.13){l=random()*Math.PI*2;b=Math.asin(random()*2-1);}
  else if(population>.87){l=normal()*.44;b=normal()*.085;}
  else{l=random()*Math.PI*2;b=normal()*(random()<.7?.062:.16)+laneAt(l)*.4;}
  const cb=Math.cos(b),v=fromGalactic([cb*Math.cos(l),cb*Math.sin(l),Math.sin(b)]);
  positions.set(v,i*3);
  const clusters=.6+.4*(.5+.5*Math.sin(l*19+b*71)*Math.sin(l*31-b*53));
  flux[i]=(.07+random()**3*.32)*dustTransmission(l,b)*clusters;
  sizes[i]=.7+random()**3*1.4;
  const warmth=(.5+.5*Math.cos(l))*.5+random()*.4;
  colors.set([.65+warmth*.26,.76+warmth*.09,1.-warmth*.26],i*3);
 }
 return{positions,flux,sizes,colors};
}

// Noise lives in 3D galactic directions. There is no UV seam at longitude
// +/-180 and no time-dependent drift that could detach dust from the stars.
export const MILKY_WAY_GLSL=`
uniform mat3 equatorialToGalactic;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
 float n=0.,a=.54;
 const mat3 turn=mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64);
 for(int i=0;i<5;i++){n+=noise3(p)*a;p=turn*p*2.04+vec3(3.1,7.2,5.8);a*=.49;}return n;
}
vec3 milkyWay(vec3 eq){
 vec3 g=normalize(equatorialToGalactic*eq);
 float l=atan(g.y,g.x),b=asin(clamp(g.z,-1.,1.));
 float warp=.018*sin(l*3.+.8)+.011*sin(l*7.-.6);
 float latitude=b-warp;
 vec3 p=g*vec3(8.,8.,19.);
 float broad=fbm(p+vec3(11.2,3.8,8.6));
 float knots=fbm(p*2.9+vec3(broad*3.,1.4,broad*2.));
 float lace=fbm(p*10.7+vec3(2.1,8.9,4.2));
 float halo=exp(-pow(latitude/.185,2.));
 float disk=exp(-pow(latitude/.079,2.));
 float core=exp(-7.*(1.-g.x)-pow(b/.19,2.));
 float clouds=pow(max(.0,broad*.85+knots*.60-.22),1.6);
 float stars=halo*(.007+.030*clouds)+disk*(.021+.076*clouds)*(.72+.28*g.x);
 stars+=core*(.013+.035*knots);
 float lane=.023*sin(l*2.+.4)+.017*sin(l*5.-1.2);
 float width=.009+.019*(.5+.5*sin(l*7.+.7));
 float coverage=smoothstep(.28,.74,.5+.28*sin(l*4.+.8)+.16*sin(l*9.-.4));
 float rift=exp(-pow((b-lane-(knots-.5)*.024)/width,2.));
 float fragments=smoothstep(.47,.72,knots+lace*.24)*disk;
 float dust=rift*coverage*(.48+.52*(.5+.5*cos(l)))*(.35+.65*smoothstep(.30,.62,knots))+fragments*.42;
 float transmission=.30+.70*exp(-1.65*dust);
 vec3 tint=mix(vec3(.55,.68,1.),vec3(1.,.80,.57),clamp(core*.8+clouds*.28,0.,1.));
 vec3 light=tint*stars*transmission;
 // Fine luminous knots and a few restrained red emission regions.
 light+=vec3(.64,.74,1.)*halo*pow(max(0.,lace-.28),3.)*.035*transmission;
 float emission=exp(-pow((g.x+.14)/.22,2.)-pow((g.y-.98)/.3,2.)-pow(b/.1,2.));
 light+=vec3(.55,.19,.25)*emission*pow(knots,3.)*.025;
 return light*2.05;
}`;

export const GALAXY_PARTICLE_VERTEX=`
attribute float flux,pointSize;
attribute vec3 particleColor;
uniform mat3 skyRotation;
uniform float pixelRatio,zoom;
varying float vFlux;
varying vec3 vColor;
void main(){
 vec3 dir=skyRotation*position;
 gl_Position=projectionMatrix*viewMatrix*vec4(dir*100.,1.);
 gl_PointSize=max(1.,pointSize*pixelRatio*zoom);
 vFlux=flux*smoothstep(.025,.14,dir.y);vColor=particleColor;
}`;
export const GALAXY_PARTICLE_FRAGMENT=`
varying float vFlux;
varying vec3 vColor;
void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=dot(p,p);if(r>1.)discard;gl_FragColor=vec4(vColor,exp(-r*2.8)*vFlux);}
`;
