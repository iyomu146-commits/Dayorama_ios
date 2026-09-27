export type V3 = [number,number,number];
export type Box = [number,number,number,number,number,number];
export interface Block {size:V3;encoding:'rows'|'rle';rows?:string[];rle?:string;}
export interface Diff {add?:[number,number,number,number][];remove?:V3[];paint?:[number,number,number,number][];}
export interface Template {kind:'template';formatVersion:1;id:string;palette:string;voxels:Block;pivot:V3;pieces:Box[];order:{rule:string;runs:[number,number][]};emitters?:unknown[];}
export interface Placement {id:string;template:string;at:V3;rot?:number;progress?:number|null;diff?:Diff;}
export interface Tile {kind:'tile';formatVersion:1;id:string;size:V3;chunk:16;cellSize:0.15;groundZ:number;originCell:V3;palette:string;look:string;base:{chunks:Record<string,Block>;pieces:Box[]};placements:Placement[];zones:{id:string;min:V3;max:V3;diff:Diff}[];wires:Wire[];clouds:Cloud[];views:unknown[];}
export interface Wire {a:V3;b:V3;sag:number;radius:number;surface:string;}
export interface Cloud {min:V3;max:V3;surface:string;}
export interface Entry {index:number;name:string;hex:string;surface:string;role:string;emitScale?:number;}
export interface Surface {roughness?:number;jitter?:number;emission?:number;emissionHex?:string;joint?:number;ao?:number;}
export interface Look {kind:'look';formatVersion:1;id:string;cellHash:'cellhash-v1';jointDefault:number;surfaces:Record<string,Surface>;sun:{dir:V3;color:V3;power:number};sky:{strength:number;stops:[number,string][]};lightClasses:Record<string,number>;grade:{exposure:number;white:number;lift:V3;gain:V3;gamma:V3;saturation:number};}
export interface Bundle {tile:Tile;templates:Record<string,Template>;palette:{kind:'palette';formatVersion:1;id:string;entries:Entry[]};look:Look;manifest:{files:Record<string,string>};}
