"""Reports which bundled fonts a page loaded: python3 tools/font_check.py <url>"""
import pathlib, sys, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
opts = Options(); opts.add_argument('-headless')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver'))
try:
    driver.install_addon(str(root / 'dist/addon'), temporary=True)
    for url in sys.argv[1:]:
      driver.get(url); time.sleep(6)
      driver.save_screenshot(str(root / 'shots' / ('font-' + url.split('/')[2] + '.png')))
      print(driver.execute_script('''
        const faces = [...document.fonts].map((f) => [f.family, f.weight, f.status]);
        const override = [...document.querySelectorAll('style.darkreader')].map((s) => [s.className, s.textContent.length, s.textContent.includes('font-face')]);
        const h = document.querySelector('h1, h2');
        return {faces: faces.filter((f) => f[2] === 'loaded').map((f) => f[0] + ' ' + f[1]), body: getComputedStyle(document.body).fontFamily, heading: h && getComputedStyle(h).fontFamily,
                src: (document.querySelector('style.darkreader--override')?.textContent.match(/url\\("moz-extension[^)]*\\)/) || [null])[0]?.replace(/[0-9a-f-]{36}/, 'ID')};'''))
finally:
    driver.quit()
