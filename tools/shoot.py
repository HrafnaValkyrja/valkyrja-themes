"""Loads the built add-on into a throwaway Firefox profile and saves screenshots of real pages.
Usage: python3 tools/shoot.py <out-dir> <url> [<url> ...]"""
import pathlib, re, sys, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
opts = Options(); opts.add_argument('-headless'); opts.add_argument('--width=1400'); opts.add_argument('--height=1000')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver'))
try:
    driver.install_addon(str(root / 'dist/addon'), temporary=True)
    for url in sys.argv[2:]:
        name = re.sub(r'[^a-z0-9]+', '-', url.split('://', 1)[1].lower()).strip('-')[:60]
        try:
            driver.get(url); time.sleep(4)
            driver.save_screenshot(str(out / f'{name}.png'))
            info = driver.execute_script("return [document.documentElement.getAttribute('data-darkreader-mode'), getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color, document.querySelectorAll('.darkreader').length]")
            print(name, info)
        except Exception as e:
            print(name, 'ERROR', str(e)[:200])
finally:
    driver.quit()
