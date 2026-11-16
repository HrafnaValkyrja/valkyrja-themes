"""Checks the master switch in a real (headless, throwaway) Firefox: python3 tools/switch_check.py

Opens a page, opens the add-on's popup in a second tab, clicks the switch off and on,
and prints whether the page is themed after each step.
"""
import pathlib, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

root = pathlib.Path(__file__).resolve().parent.parent
opts = Options()
opts.add_argument('-headless')
driver = webdriver.Firefox(options=opts, service=Service('/snap/bin/geckodriver', service_args=['--allow-system-access']))
MODE = "return [document.documentElement.getAttribute('data-darkreader-mode'), getComputedStyle(document.body).backgroundColor]"
try:
    addon_id = driver.install_addon(str(root / 'dist/addon'), temporary=True)
    with driver.context(driver.CONTEXT_CHROME):
        host = driver.execute_script('return WebExtensionPolicy.getByID(arguments[0]).mozExtensionHostname', addon_id)
        window_colours = driver.execute_script('''
            const css = (id) => { const el = document.getElementById(id); return el ? getComputedStyle(el).backgroundColor : null; };
            return {lwtheme: document.documentElement.hasAttribute('lwtheme'), titlebar: css('navigator-toolbox'), toolbar: css('nav-bar'),
                    frameVar: getComputedStyle(document.documentElement).getPropertyValue('--lwt-accent-color')};''')
    print('browser window', window_colours)
    driver.get('https://example.com/'); time.sleep(3)
    page = driver.current_window_handle
    print('start', driver.execute_script(MODE))
    driver.switch_to.new_window('tab'); driver.get(f'moz-extension://{host}/popup.html'); time.sleep(1)
    popup = driver.current_window_handle
    for label in ('off', 'on'):
        driver.switch_to.window(popup); driver.find_element(By.ID, 'enabled').click(); time.sleep(2)
        driver.switch_to.window(page); print(label, driver.execute_script(MODE))
    driver.switch_to.window(popup); driver.find_element(By.ID, 'enabled').click(); time.sleep(1)
    driver.switch_to.window(page); driver.refresh(); time.sleep(3)
    print('off after reload', driver.execute_script(MODE))
finally:
    driver.quit()
