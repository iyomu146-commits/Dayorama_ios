class_name CellHash
extends RefCounted

# formatVersion 1 / cellhash-v1. Split multiplication avoids int64 overflow.
static func mul32(a: int,b: int) -> int:
	var u: int=a & 0xffffffff
	return (((u & 0xffff)*b) + ((((u >> 16)*b) & 0xffff)<<16)) & 0xffffffff

static func h32(x: int, y: int, z: int, salt: int = 0) -> int:
	var h: int = 0x9e3779b9 ^ mul32(x,0x8da6b343) ^ mul32(y,0xd8163841) ^ mul32(z,0xcb1ab31f) ^ mul32(salt,0x165667b1)
	h = h ^ (h >> 16)
	h = mul32(h,0x7feb352d)
	h = h ^ (h >> 15)
	h = mul32(h,0x846ca68b)
	h = h ^ (h >> 16)
	return h

static func u01(x: int, y: int, z: int, salt: int = 0) -> float:
	return float(h32(x,y,z,salt)) / 4294967296.0
