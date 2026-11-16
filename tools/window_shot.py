"""Saves a picture of the browser window itself (tabs, toolbar, address bar) with the add-on installed:
python3 tools/window_shot.py <out.png>

Runs a headless, throwaway Firefox, waits for the window colours to settle, prints them and saves the picture.
"""
import base64, pathlib, sys, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1])
opts = Options()
opts.add_argument('-headless')
opts.add_argument('--width=1280')
opts.add_argument('--height=800')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver', service_args=['--allow-system-access']))
try:
    driver.install_addon(str(root / 'dist/addon'), temporary=True)
    driver.get('https://example.com/')
    driver.switch_to.new_window('tab')
    driver.get('about:blank')
    time.sleep(4)
    with driver.context(driver.CONTEXT_CHROME):
        colours = driver.execute_script('''
            const css = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
            return {
                lwtheme: document.documentElement.hasAttribute('lwtheme'),
                frame: css('#navigator-toolbox', 'backgroundColor'),
                toolbar: css('#nav-bar', 'backgroundColor'),
                field: css('#urlbar-background', 'backgroundColor') || css('.urlbar-background', 'backgroundColor'),
                selectedTab: css('.tabbrowser-tab[selected] .tab-background', 'backgroundColor'),
                text: css('#nav-bar', 'color'),
            };''')
        data = driver.execute_async_script('''
            const done = arguments[arguments.length - 1];
            (async () => {
                const rect = new DOMRect(0, 0, window.innerWidth, Math.min(window.innerHeight, 260));
                const bitmap = await window.browsingContext.currentWindowGlobal.drawSnapshot(rect, 1, 'rgb(0,0,0)');
                const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
                canvas.width = bitmap.width; canvas.height = bitmap.height;
                canvas.getContext('2d').drawImage(bitmap, 0, 0);
                done(canvas.toDataURL('image/png'));
            })().catch((err) => done('ERR ' + err));''')
    print(colours)
    if data.startswith('ERR'):
        sys.exit(data)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(data.split(',', 1)[1]))
    print('saved', out)
finally:
    driver.quit()
