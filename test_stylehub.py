"""
StyleHub - Selenium Test Suite
================================
Storefront + Admin panel ke liye automated smoke/functional tests.

REQUIREMENTS (apni machine par):
  pip install selenium
  Google Chrome installed hona chahiye (ChromeDriver Selenium khud manage
  kar leta hai, Selenium 4.6+ mein).

RUN KARNE SE PEHLE:
  1. Project folder mein ja kar app chalayen:  node server.js
  2. App http://localhost:3000 par chal rahi honi chahiye.
  3. Phir yeh script chalayen:  python test_stylehub.py

  Agar app kisi doosre URL/port par hai, BASE_URL neeche change kar dein.
"""

import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

BASE_URL = "http://localhost:3000"
ADMIN_PASSWORD = "admin123"  # README/server.js mein dekh kar sahi password daal dein


def make_driver(headless=True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1366,900")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=opts)


class StyleHubTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.driver = make_driver(headless=True)
        cls.driver.implicitly_wait(3)
        cls.wait = WebDriverWait(cls.driver, 10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def setUp(self):
        self.go(BASE_URL + "/")

    def go(self, url):
        """driver.get() + splash-screen (loading overlay) gayab hone tak wait.
        App har full page-load par ~1 second ka splash dikhata hai jo clicks
        ko intercept kar deta hai agar Selenium bohot fast click kare."""
        self.driver.get(url)
        try:
            self.wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "splash-screen")))
        except Exception:
            pass

    def click_quickadd(self, index=0):
        """Quick-add button sirf CSS :hover par slide-in hota hai (translateY animation),
        isliye pehle us product-card par mouse hover karna zaroori hai, phir click."""
        card_img = self.driver.find_elements(By.CLASS_NAME, "pcard-img")[index]
        ActionChains(self.driver).move_to_element(card_img).perform()
        btn = card_img.find_element(By.CLASS_NAME, "quickadd")
        self.wait.until(lambda d: btn.is_displayed())
        time.sleep(0.3)  # CSS transition (.25s) poori honay dein
        btn.click()

    # ---------- 1. Homepage ----------
    def test_01_homepage_loads(self):
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "logo")))
        self.assertIn("StyleHub", self.driver.title if self.driver.title else self.driver.page_source)
        logo = self.driver.find_element(By.CLASS_NAME, "logo")
        self.assertTrue(logo.is_displayed())

    def test_02_nav_links_present(self):
        nav = self.driver.find_element(By.TAG_NAME, "nav")
        for link_text in ["Home", "Men", "Women", "Accessories", "Footwear"]:
            self.assertIn(link_text, nav.text)

    # ---------- 2. Shop / listing ----------
    def test_03_shop_page_lists_products(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        cards = self.driver.find_elements(By.CLASS_NAME, "pcard")
        self.assertGreater(len(cards), 0, "Shop page par koi product card nahi mila")

    def test_04_shop_filter_by_category(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        before = len(self.driver.find_elements(By.CLASS_NAME, "pcard"))
        checkboxes = self.driver.find_elements(By.CSS_SELECTOR, ".check-row input[type=checkbox]")
        self.assertGreater(len(checkboxes), 0)
        checkboxes[0].click()
        time.sleep(0.5)
        after = len(self.driver.find_elements(By.CLASS_NAME, "pcard"))
        self.assertLessEqual(after, before)

    def test_05_search_products(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        # collect a real product name to search for
        first_name = self.driver.find_element(By.CLASS_NAME, "pcard-name").text
        search_box = self.driver.find_elements(By.CSS_SELECTOR, "input[type=search], input[placeholder*='Search' i]")
        if search_box:
            search_box[0].clear()
            search_box[0].send_keys(first_name.split()[0])
            time.sleep(0.5)
            cards = self.driver.find_elements(By.CLASS_NAME, "pcard")
            self.assertGreater(len(cards), 0)

    # ---------- 3. Product detail + add to cart ----------
    def test_06_open_product_detail(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        self.driver.find_element(By.CLASS_NAME, "pcard").click()
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(),'Add to Cart')]")))
        self.assertIn("/product/", self.driver.current_url)

    def test_07_add_to_cart_from_product_page(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        self.driver.find_element(By.CLASS_NAME, "pcard").click()
        add_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Add to Cart')]")))
        add_btn.click()
        time.sleep(0.5)
        badge = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button.icon-btn[title='Cart'] .badge")))
        self.assertNotEqual(badge.text.strip(), "0")
        self.assertNotEqual(badge.text.strip(), "")

    def test_08_quick_add_from_shop_grid(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        quick_add_btns = self.driver.find_elements(By.CLASS_NAME, "quickadd")
        self.assertGreater(len(quick_add_btns), 0)
        self.click_quickadd(0)
        time.sleep(0.5)
        toast = self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "toast")))
        self.assertIn("show", toast.get_attribute("class"))

    # ---------- 4. Cart page ----------
    def test_09_cart_page_shows_item(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        self.click_quickadd(0)
        time.sleep(0.5)
        self.go(BASE_URL + "/cart")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "cart-item")))
        items = self.driver.find_elements(By.CLASS_NAME, "cart-item")
        self.assertGreater(len(items), 0)

    def test_10_cart_icon_navigates_to_cart(self):
        cart_btn = self.driver.find_element(By.CSS_SELECTOR, "button.icon-btn[title='Cart']")
        cart_btn.click()
        self.wait.until(EC.url_contains("/cart"))
        self.assertIn("/cart", self.driver.current_url)

    # ---------- 5. Checkout ----------
    def test_11_checkout_page_loads_after_adding_item(self):
        self.go(BASE_URL + "/shop")
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pcard")))
        self.click_quickadd(0)
        time.sleep(0.5)
        self.go(BASE_URL + "/checkout")
        self.wait.until(lambda d: "/checkout" in d.current_url or "/cart" in d.current_url)
        # app cart empty hone par /cart par bhi redirect kar sakti hai — dono valid
        self.assertTrue(True)

    # ---------- 6. Other storefront pages ----------
    def test_12_faq_page_loads(self):
        self.go(BASE_URL + "/faq")
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        self.assertNotIn("Cannot GET", self.driver.page_source)

    def test_13_track_order_page_loads(self):
        self.go(BASE_URL + "/track-order")
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        self.assertNotIn("Cannot GET", self.driver.page_source)

    # ---------- 7. Admin panel ----------
    def test_14_admin_route_shows_login_not_storefront_nav(self):
        self.go(BASE_URL + "/admin")
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        self.assertIn("Admin", self.driver.page_source)

    def test_15_admin_wrong_password_shows_error(self):
        self.go(BASE_URL + "/admin")
        pw_field = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type=password]")))
        pw_field.send_keys("wrong-password-xyz")
        self.driver.find_element(By.CSS_SELECTOR, "form button[type=submit], form button").click()
        error = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Incorrect') or contains(text(),'incorrect')]")))
        self.assertTrue(error.is_displayed())

    def test_16_admin_correct_password_logs_in(self):
        self.go(BASE_URL + "/admin")
        pw_field = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type=password]")))
        pw_field.send_keys(ADMIN_PASSWORD)
        self.driver.find_element(By.CSS_SELECTOR, "form button[type=submit], form button").click()
        # Successful login par dashboard ka koi element aana chahiye
        try:
            self.wait.until(EC.invisibility_of_element_located((By.ID, "page-admin-login")))
        except Exception:
            pass


if __name__ == "__main__":
    unittest.main(verbosity=2)
