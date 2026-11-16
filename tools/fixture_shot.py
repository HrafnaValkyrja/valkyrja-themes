"""Renders a saved page as if it were served by a real host, without touching that host.

Usage: python3 tools/fixture_shot.py <fixture-dir> <host> <out.png>
The throwaway browser resolves <host> to this machine, where a local server hands out <fixture-dir>.
"""
import functools, http.server, pathlib, sys, threading, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
fixture, host, out = sys.argv[1], sys.argv[2], sys.argv[3]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=fixture)
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

opts = Options(); opts.add_argument('-headless')
opts.set_preference('network.dns.localDomains', host)
opts.set_preference('dom.security.https_only_mode', False)
opts.set_preference('dom.security.https_first', False)
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver'))
try:
    driver.install_addon(str(root / 'dist/addon'), temporary=True)
    driver.set_window_size(1400, 1000)
    driver.get(f'http://{host}:{server.server_address[1]}/index.html'); time.sleep(4)
    height = driver.execute_script('return document.documentElement.scrollHeight')
    driver.set_window_size(1400, min(height + 120, 4000)); time.sleep(1)
    driver.save_screenshot(out)
    print(driver.execute_script("return [location.hostname, document.documentElement.getAttribute('data-darkreader-mode')]"), height)
finally:
    driver.quit(); server.shutdown()
