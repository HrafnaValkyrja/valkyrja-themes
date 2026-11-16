# Vivid theme tokens from OKLCH (lightness, chroma, hue): each colour takes the most chroma sRGB can show at its lightness.
# usage: python3 -I vivid.py <out.json> <sheet.html>
import json, math, sys
def oklch(L, C, H):
    a, b = C*math.cos(math.radians(H)), C*math.sin(math.radians(H))
    l, m, s = (L+0.3963377774*a+0.2158037573*b)**3, (L-0.1055613458*a-0.0638541728*b)**3, (L-0.0894841775*a-1.2914855480*b)**3
    return [4.0767416621*l-3.3077115913*m+0.2309699292*s, -1.2684380046*l+2.6097574011*m-0.3413193965*s, -0.0041960863*l-0.7034186147*m+1.7076147010*s]
def hexof(L, C, H):
    lo, hi = 0.0, C
    rgb = oklch(L, C, H)
    if not all(-1e-4 <= v <= 1+1e-4 for v in rgb):
        for _ in range(24):
            mid = (lo+hi)/2
            if all(-1e-4 <= v <= 1+1e-4 for v in oklch(L, mid, H)): lo = mid
            else: hi = mid
        rgb = oklch(L, lo, H)
    g = lambda v: 12.92*v if v <= 0.0031308 else 1.055*v**(1/2.4)-0.055
    return '#' + ''.join(f'{round(255*min(1, max(0, g(max(0, v))))):02x}' for v in rgb)
def maxc(L, H):
    lo, hi = 0.0, 0.4
    for _ in range(24):
        mid = (lo+hi)/2
        if all(-1e-4 <= v <= 1+1e-4 for v in oklch(L, mid, H)): lo = mid
        else: hi = mid
    return lo
def vivid(H, lo=.64, hi=.88):
    # the lightness where this hue is most colourful, kept light enough to read on black
    L = max((lo + i*.01 for i in range(int(round((hi-lo)*100))+1)), key=lambda l: maxc(l, H))
    return hexof(L, .4, H)
def theme(label, hs, cs, hl, a1, a2, a3, bad=25, fixed=None):
    t = {'label': label, 'base': '#000000',
         's1': hexof(.17, cs, hs), 's2': hexof(.23, cs*1.3, hs), 's3': hexof(.30, cs*1.6, hs),
         'line': hexof(.42, .16, hl), 'lineHi': hexof(.60, .4, hl),
         'text': hexof(.97, .006, hs), 'text2': hexof(.82, .015, hs), 'text3': hexof(.68, .02, hs),
         'accent': vivid(a1), 'accent2': vivid(a2), 'accent3': vivid(a3),
         'good': vivid(150), 'warn': vivid(70), 'bad': vivid(bad, .64, .70)}
    t.update(fixed or {}); t['sel'] = t['accent']; return t
T = {
 'nott': theme('Nott', 262, .035, 262, 255, 190, 305),
 'night': theme('Valkyrja Night', 285, .045, 280, 210, 240, 300, bad=355, fixed={'accent': '#4fe0ff', 'lineHi': '#5b4bd6', 'bad': '#ff3d9a'}),
 'mimir': theme('Mimir', 235, .035, 235, 230, 180, 290),
 'bifrost': theme('Bifrost', 272, .06, 270, 265, 200, 330),
 'freyja': theme('Freyja', 325, .04, 320, 340, 300, 15, bad=20),
 'eldr': theme('Eldr', 50, .03, 45, 60, 95, 25, bad=10),
 'skogr': theme('Skogr', 155, .03, 155, 150, 125, 195),
 'isa': theme('Isa', 215, .03, 215, 210, 240, 320),
 'norn': theme('Norn', 300, .04, 298, 300, 195, 5),
 'jarn': theme('Jarn', 60, .015, 55, 45, 165, 0),
 'tyr': theme('Tyr', 280, .02, 280, 255, 195, 310, fixed={'text': '#ffffff', 'text2': '#e4e4ee', 'text3': '#c4c4d4'}),
}
json.dump(T, open(sys.argv[1], 'w'), indent=2)
old = {'label': 'REJECTED: Nott as sent', 'base':'#000000','s1':'#07080c','s2':'#0e1015','s3':'#171a22','line':'#2c3340','lineHi':'#556384','text':'#b9c0cf','text2':'#8c95a8','text3':'#777f92','accent':'#6a93d8','accent2':'#48b0b0','accent3':'#9a84cc','good':'#7bd3c3','warn':'#d99445','bad':'#d93e60','sel':'#6a93d8'}
html = '''<!doctype html><meta charset="utf-8"><title>Vivid targets</title><style>
body{margin:0;background:#1c1c1c;font:14px/1.4 system-ui,sans-serif;color:#eee;padding:14px}h1{font-size:17px;margin:0 0 6px}
.row{display:flex;gap:14px;flex-wrap:wrap}.col{width:520px}.sw{display:flex;flex-wrap:wrap;margin:4px 0 8px}.sw div{width:65px;height:30px;font:9px/1.2 monospace;padding:2px;box-sizing:border-box}
</style><div class="row" id="out"></div><script>
const S = %s;
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const fill=(h)=>h;
for (const t of S) {
 const sw = Object.entries(t).filter(([k])=>k!='label').map(([k,v])=>`<div style="background:${v};color:${lum(v)>.3?'#000':'#fff'}">${k}<br>${v}</div>`).join('');
 document.getElementById('out').insertAdjacentHTML('beforeend', `<div class="col"><h1>${t.label}</h1><div class="sw">${sw}</div>
 <div style="background:${t.base};color:${t.text};display:flex;height:360px;border:1px solid #444">
  <div style="width:130px;background:${t.s1};border-right:1px solid ${t.line};padding:10px">
   <div style="background:${fill(t.accent)};color:#000;padding:5px 8px;font-weight:600">+ New chat</div>
   <div style="padding:6px 8px;margin-top:8px;background:${t.s3};border-left:2px solid ${t.accent}">Selected</div>
   <div style="padding:6px 8px;color:${t.text2}">Projects</div><div style="padding:6px 8px;color:${t.text2}">Artifacts</div>
   <div style="padding:6px 8px;color:${t.text3};font-size:12px">Recents</div></div>
  <div style="flex:1;padding:12px">
   <div style="margin-left:90px;background:${t.s2};border:1px solid ${t.line};padding:8px 10px">A message in a bubble</div>
   <p style="margin:10px 0">Body text with a <span style="color:${t.accent};text-decoration:underline">link</span>, <span style="color:${t.accent3}">visited</span> and <span style="color:${t.text2}">dim</span> / <span style="color:${t.text3}">dimmer</span> text. <span style="background:${t.sel};color:#000">Highlighted text here</span></p>
   <div style="background:${t.s1};border:1px solid ${t.lineHi};padding:8px;font-family:monospace;font-size:12px"><span style="color:${t.bad}">const</span> <span style="color:${t.accent2}">theme</span> = <span style="color:${t.good}">"valkyrja"</span>; <span style="color:${t.text3}">// note</span><br><span style="color:${t.warn}">42</span> <span style="color:${t.accent3}">return</span> theme;</div>
   <div style="display:flex;gap:6px;margin:10px 0;font-size:12px">
    <span style="border:1px solid ${t.good};color:${t.good};padding:2px 8px">ok</span><span style="border:1px solid ${t.warn};color:${t.warn};padding:2px 8px">warning</span><span style="border:1px solid ${t.bad};color:${t.bad};padding:2px 8px">error</span>
    <span style="background:${fill(t.bad)};color:#000;padding:2px 8px">Delete</span><span style="background:${fill(t.accent3)};color:#000;padding:2px 8px">Badge</span><span style="background:${t.s3};border:1px solid ${t.lineHi};padding:2px 8px">button</span></div>
   <div style="background:${t.s2};border:1px solid ${t.line};padding:8px">Card on the page<div style="background:${t.s3};margin-top:6px;padding:6px;border:1px solid ${t.line}">Raised panel inside the card</div></div>
  </div></div></div>`);
}
</script>''' % json.dumps([old] + list(T.values()))
open(sys.argv[2], 'w').write(html)
for k, t in T.items(): print(k, ' '.join(f'{a}={b}' for a, b in t.items() if a != 'label'))
