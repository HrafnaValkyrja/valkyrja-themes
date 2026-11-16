"""Reports what paints a point on a page under the add-on: python3 tools/probe.py <url> <x> <y>"""
import json, pathlib, sys, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
opts = Options(); opts.add_argument('-headless'); opts.add_argument('--width=1400'); opts.add_argument('--height=1000')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver'))
JS = '''
const [x, y] = arguments; let el = document.elementFromPoint(x, y); const path = [];
while (el && el.shadowRoot && el.shadowRoot.elementFromPoint(x, y) && el.shadowRoot.elementFromPoint(x, y) !== el) { path.push(el.tagName); el = el.shadowRoot.elementFromPoint(x, y); }
const out = {path, chain: [], proxy: document.documentElement.dataset.darkreaderProxyInjected ?? null, sheets: []};
const rootOf = el.getRootNode(); for (const sh of (rootOf.adoptedStyleSheets || [])) { let t = ''; try { t = [...sh.cssRules].map((r) => r.cssText).join(' ').slice(0, 300); } catch (e) { t = 'ERR ' + e; } out.sheets.push({n: sh.cssRules.length, t}); }
for (let n = el; n && out.chain.length < 6; n = n.parentElement || (n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null)) {
  const cs = getComputedStyle(n); const r = n.getRootNode();
  out.chain.push({tag: n.tagName, cls: String(n.className).slice(0, 60), bg: cs.backgroundColor, color: cs.color, inShadow: r instanceof ShadowRoot,
    drStyles: r.querySelectorAll ? r.querySelectorAll('.darkreader').length : -1, adopted: r.adoptedStyleSheets ? r.adoptedStyleSheets.length : -1, iframe: n.tagName === 'IFRAME' ? (n.src || 'srcdoc').slice(0, 80) : undefined});
}
return out;
'''
try:
    driver.install_addon(str(root / 'dist/addon'), temporary=True)
    driver.get(sys.argv[1]); time.sleep(5)
    print(json.dumps(driver.execute_script(JS, int(sys.argv[2]), int(sys.argv[3])), indent=1))
    if len(sys.argv) > 4:
        # Poke: add a rule to the first adopted sheet at that point, then report the editor colour and the sheet list again.
        POKE = '''
const [x, y] = arguments; let el = document.elementFromPoint(x, y);
while (el && el.shadowRoot && el.shadowRoot.elementFromPoint(x, y) && el.shadowRoot.elementFromPoint(x, y) !== el) { el = el.shadowRoot.elementFromPoint(x, y); }
const root = el.getRootNode(); root.adoptedStyleSheets[0].insertRule('.valkyrja-poke { color: red }', 0);
return new Promise((done) => setTimeout(() => { const ed = root.querySelector('.cm-editor');
  done({dbg: (document.documentElement.dataset.vkDbg || '').slice(-900), ev: document.documentElement.dataset.vkEv, raf: document.documentElement.dataset.vkRaf, proxy: document.documentElement.dataset.vkProxy, native: String(Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'adoptedStyleSheets').set).slice(0, 80), bg: ed && getComputedStyle(ed).backgroundColor, sheets: [...root.adoptedStyleSheets].map((s) => [s.cssRules.length, s.cssRules[0] ? s.cssRules[0].cssText.slice(0, 50) : ''])}); }, 1500));
'''
        print('POKE', json.dumps(driver.execute_script(POKE, int(sys.argv[2]), int(sys.argv[3]))))
finally:
    driver.quit()
