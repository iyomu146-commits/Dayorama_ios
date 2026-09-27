// formatVersion 1 / SPEC §3.4: every multiply must wrap to uint32.
export function h32(x:number,y:number,z:number,salt=0):number {
  let h=(0x9e3779b9 ^ Math.imul(x,0x8da6b343) ^ Math.imul(y,0xd8163841) ^ Math.imul(z,0xcb1ab31f) ^ Math.imul(salt,0x165667b1))>>>0;
  h=(h^(h>>>16))>>>0;h=Math.imul(h,0x7feb352d)>>>0;
  h=(h^(h>>>15))>>>0;h=Math.imul(h,0x846ca68b)>>>0;
  return (h^(h>>>16))>>>0;
}
export const u01=(x:number,y:number,z:number,salt=0)=>h32(x,y,z,salt)/4294967296;
