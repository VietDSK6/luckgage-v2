# Regenerates src/features/journeys/vietnamMap.ts from Natural Earth 10m admin-1 (public domain):
#   curl -L -o /tmp/admin1.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
#   python3 apps/mobile/scripts/build-vietnam-map.py /tmp/admin1.geojson apps/mobile/src/features/journeys/vietnamMap.ts
# Old provinces are dissolved into the 34 units of Resolution 202/2025/QH15 by removing shared edges.
import json, math, sys, collections
src, out_ts = sys.argv[1], sys.argv[2]
groups = {
 "ha-noi":("Hà Nội",["Hà Nội"]),"hue":("Huế",["Thừa Thiên Huế"]),"lai-chau":("Lai Châu",["Lai Châu"]),
 "dien-bien":("Điện Biên",["Điện Biên"]),"son-la":("Sơn La",["Sơn La"]),"lang-son":("Lạng Sơn",["Lạng Sơn"]),
 "quang-ninh":("Quảng Ninh",["Quảng Ninh"]),"thanh-hoa":("Thanh Hóa",["Thanh Hóa"]),"nghe-an":("Nghệ An",["Nghệ An"]),
 "ha-tinh":("Hà Tĩnh",["Hà Tĩnh"]),"cao-bang":("Cao Bằng",["Cao Bằng"]),
 "tuyen-quang":("Tuyên Quang",["Tuyên Quang","Hà Giang"]),"lao-cai":("Lào Cai",["Lào Cai","Yên Bái"]),
 "thai-nguyen":("Thái Nguyên",["Thái Nguyên","VN-53"]),"phu-tho":("Phú Thọ",["Phú Thọ","Vĩnh Phúc","Hòa Bình"]),
 "bac-ninh":("Bắc Ninh",["Bắc Ninh","Bắc Giang"]),"hung-yen":("Hưng Yên",["VN-66","Thái Bình"]),
 "hai-phong":("Hải Phòng",["Hải Phòng","Hải Dương"]),"ninh-binh":("Ninh Bình",["Ninh Bình","Hà Nam","Nam Định"]),
 "quang-tri":("Quảng Trị",["Quảng Trị","Quảng Bình"]),"da-nang":("Đà Nẵng",["Đà Nẵng","Quảng Nam"]),
 "quang-ngai":("Quảng Ngãi",["Quảng Ngãi","Kon Tum"]),"gia-lai":("Gia Lai",["Gia Lai","Bình Định"]),
 "khanh-hoa":("Khánh Hòa",["Khánh Hòa","Ninh Thuận"]),"lam-dong":("Lâm Đồng",["Lâm Đồng","Đắk Nông","Bình Thuận"]),
 "dak-lak":("Đắk Lắk",["Đắk Lắk","Phú Yên"]),"ho-chi-minh":("TP. Hồ Chí Minh",["VN-SG","Bình Dương","Bà Rịa - Vũng Tàu"]),
 "dong-nai":("Đồng Nai",["VN-39","Bình Phước"]),"tay-ninh":("Tây Ninh",["Tây Ninh","Long An"]),
 "can-tho":("Cần Thơ",["Cần Thơ","Sóc Trăng","Hậu Giang"]),"vinh-long":("Vĩnh Long",["Vĩnh Long","Bến Tre","Trà Vinh"]),
 "dong-thap":("Đồng Tháp",["Đồng Tháp","Tiền Giang"]),"ca-mau":("Cà Mau",["Cà Mau","Bạc Liêu"]),
 "an-giang":("An Giang",["An Giang","Kiên Giang"]),
}
lookup={o:k for k,(_,v) in groups.items() for o in v}
Q=1000  # quantize to 0.001 degree for exact shared-edge matching
def q(pt): return (round(pt[0]*Q), round(pt[1]*Q))
def rings_of(geom):
    polys = geom["coordinates"] if geom["type"]=="MultiPolygon" else [geom["coordinates"]]
    for poly in polys:
        for ring in poly: yield ring
def ring_area(r): return sum(r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1] for i in range(len(r)-1))/2
data=json.load(open(src))
edges=collections.defaultdict(collections.Counter)
for f in data["features"]:
    p=f["properties"]
    if p.get("adm0_a3")!="VNM": continue
    key=lookup[p["iso_3166_2"] if p["iso_3166_2"] in lookup else p["name_vi"]]
    for ring in rings_of(f["geometry"]):
        pts=[q(x) for x in ring]
        for a,b in zip(pts,pts[1:]):
            if a!=b: edges[key][(a,b)]+=1
def dissolve(counter):
    und=collections.Counter()
    for (a,b),n in counter.items(): und[frozenset((a,b))]+=n
    keep=[(a,b) for (a,b),n in counter.items() if und[frozenset((a,b))]==1]
    nxt=collections.defaultdict(list)
    for a,b in keep: nxt[a].append(b)
    rings=[]; used=set()
    for a,b in keep:
        if (a,b) in used: continue
        ring=[a]; cur=(a,b)
        while cur not in used:
            used.add(cur); ring.append(cur[1])
            cands=[c for c in nxt[cur[1]] if (cur[1],c) not in used]
            if not cands: break
            cur=(cur[1],cands[0])
        if len(ring)>3: rings.append(ring)
    return rings
LAT0=math.radians(16); W=1000.0
LON_MIN,LON_MAX,LAT_MIN,LAT_MAX=102.1,117.4,8.3,23.5
sx=math.cos(LAT0); scale=W/((LON_MAX-LON_MIN)*sx); H=(LAT_MAX-LAT_MIN)*scale
def proj(lon,lat): return ((lon-LON_MIN)*sx*scale,(LAT_MAX-lat)*scale)
def dp(pts,tol):
    if len(pts)<4: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True; stack=[(0,len(pts)-1)]
    while stack:
        s,e=stack.pop(); ax,ay=pts[s]; bx,by=pts[e]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy) or 1e-9
        best,bi=0,None
        for i in range(s+1,e):
            d=abs(dy*pts[i][0]-dx*pts[i][1]+bx*ay-by*ax)/L
            if d>best: best,bi=d,i
        if bi is not None and best>tol: keep[bi]=True; stack+=[(s,bi),(bi,e)]
    return [p for p,k in zip(pts,keep) if k]
provinces=[]; total=0
for key,(name,_) in groups.items():
    rings=[]
    for ring in dissolve(edges[key]):
        pts=[proj(x/Q,y/Q) for x,y in ring]
        if abs(ring_area(pts))<12: continue  # drop islets smaller than ~a few pixels
        far=max(range(len(pts)),key=lambda i:(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2)
        s=dp(pts[:far+1],1.2)[:-1]+dp(pts[far:],1.2)
        if len(s)<4: continue
        rings.append([[round(x,1),round(y,1)] for x,y in s]); total+=len(s)
    provinces.append({"id":key,"name":name,"rings":rings})
# Natural Earth places Con Dao (8.6-8.8N, 106.5-106.7E) under Soc Trang; it belongs to Ba Ria - Vung Tau,
# now part of Ho Chi Minh City.
bx0,by1=proj(106.45,8.55); bx1,by0=proj(106.75,8.85)
byid={p["id"]:p for p in provinces}
for pid,pv in byid.items():
    for r in list(pv["rings"]):
        if all(bx0<=x<=bx1 and by0<=y<=by1 for x,y in r) and pid!="ho-chi-minh":
            pv["rings"].remove(r); byid["ho-chi-minh"]["rings"].append(r); print("moved Con Dao ring from",pid)
def P(lon,lat): x,y=proj(lon,lat); return [round(x,1),round(y,1)]
islands=[{"id":"hoang-sa","name":"Quần đảo Hoàng Sa","parent":"da-nang","points":[P(111.6,16.5),P(112.3,16.8),P(111.9,16.2),P(112.6,16.1),P(111.2,15.8)]},
         {"id":"truong-sa","name":"Quần đảo Trường Sa","parent":"khanh-hoa","points":[P(114.3,10.4),P(114.9,10.9),P(115.6,10.2),P(113.9,9.9),P(114.6,9.6),P(115.2,8.9),P(116.1,9.6)]}]
ts=f"""// Generated by scripts/build-vietnam-map.py from Natural Earth 10m admin-1 (public domain), dissolved into the
// 34 provincial units in force since 1 July 2025 (Resolution 202/2025/QH15) and simplified.
// Coordinates are an equirectangular projection (cos 16°) into a {W:.0f}x{H:.0f} viewBox.

export type MapPoint = readonly [number, number];
export type ProvinceShape = {{ id: string; name: string; rings: readonly (readonly MapPoint[])[] }};
export type IslandGroup = {{ id: string; name: string; parent: string; points: readonly MapPoint[] }};

export const VIETNAM_MAP_VIEWBOX = {{ width: {W:.0f}, height: {H:.0f} }} as const;
export const VIETNAM_PROJECTION = {{ lonMin: {LON_MIN}, latMax: {LAT_MAX}, xScale: {sx*scale:.6f}, yScale: {scale:.6f} }} as const;

export const VIETNAM_PROVINCES: readonly ProvinceShape[] = {json.dumps(provinces,ensure_ascii=False,separators=(',',':'))};

export const VIETNAM_ISLAND_GROUPS: readonly IslandGroup[] = {json.dumps(islands,ensure_ascii=False,separators=(',',':'))};
"""
open(out_ts,"w").write(ts)
print("provinces",len(provinces),"points",total,"bytes",len(ts.encode()),"H",round(H),"rings",[ (p["id"],len(p["rings"])) for p in provinces if len(p["rings"])!=1])
