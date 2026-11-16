"""Renders the mock light site in every theme in a real (headless, throwaway) Firefox: python3 tools/theme_sheet.py <outdir> [theme ...]

The theme is chosen through the add-on's own popup, without reloading the page, so this also checks live switching.
Prints, per theme, each key colour on the page beside the token it should be.
"""
import functools, http.server, json, pathlib, sys, threading, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
themes = json.loads((root / 'src/themes.json').read_text())
wanted = sys.argv[2:] or list(themes)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root / 'tests/fixtures/mock'))
handler.log_message = lambda *a: None
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

PROBE = '''
const hex = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return '#' + m.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); };
const css = (sel, prop) => hex(getComputedStyle(document.querySelector(sel))[prop]);
return {base: css('body', 'backgroundColor'), s1: css('nav', 'backgroundColor'), text: css('body', 'color'), text2: css('.dim', 'color'), text3: css('.dimmer', 'color'),
        accent: css('#link', 'color'), accent2: css('.v', 'color'), accent3: css('.visited', 'color'), good: css('.s', 'color'), warn: css('.n', 'color'), bad: css('.k', 'color'),
        line: css('nav', 'borderRightColor'), lineHi: css('pre', 'borderTopColor'), sel: getComputedStyle(document.documentElement).getPropertyValue('--darkreader-selection-background').trim().toLowerCase()};
'''
opts = Options(); opts.add_argument('-headless')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver', service_args=['--allow-system-access']))
try:
    addon_id = driver.install_addon(str(root / 'dist/addon'), temporary=True)  # noqa: the newer call needs a packed file
    with driver.context(driver.CONTEXT_CHROME):
        host = driver.execute_script('return WebExtensionPolicy.getByID(arguments[0]).mozExtensionHostname', addon_id)
    driver.set_window_size(760, 520)
    driver.get(f'http://127.0.0.1:{server.server_address[1]}/'); time.sleep(2)
    page = driver.current_window_handle
    driver.switch_to.new_window('tab'); driver.get(f'moz-extension://{host}/popup.html'); time.sleep(1)
    popup = driver.current_window_handle
    for theme in wanted:
        driver.switch_to.window(popup)
        driver.execute_script("document.querySelector(`#themes [data-theme=\"${arguments[0]}\"]`).click();", theme)
        time.sleep(1.5)
        driver.switch_to.window(page); time.sleep(0.5)
        driver.execute_script("getSelection().selectAllChildren(document.getElementById('sel'))")
        driver.save_screenshot(str(out / f'theme-{theme}.png'))
        got = driver.execute_script(PROBE)
        near = lambda a, b: all(abs(int(a[i:i + 2], 16) - int(b[i:i + 2], 16)) <= 1 for i in (1, 3, 5))  # one step of rounding
        wrong = {k: (v, themes[theme][k]) for k, v in got.items() if not near(v, themes[theme][k])}
        print(theme, 'all tokens hit' if not wrong else f'MISS (got, token): {wrong}')
    # The popup itself, with its grid of theme previews, wearing the last theme.
    driver.switch_to.window(popup); driver.set_window_size(380, 620); time.sleep(0.5)
    driver.save_screenshot(str(out / 'popup.png'))
finally:
    driver.quit(); server.shutdown()
