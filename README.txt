STYLEHUB — REACT STOREFRONT + ADMIN PANEL (Node.js backend)
=============================================================

WHAT CHANGED FROM THE LAST VERSION
--------------------------------------
The whole frontend (storefront AND admin panel) is now a real React
app, built with Vite and React Router. It talks to the exact same
Node.js backend as before (server.js + data.json) — nothing about
the API or how data is stored has changed. Only the way the pages
are built and rendered has changed: instead of plain HTML pages with
one big app.js file, everything is now split into React components
under client/src, with global state (cart, wishlist, products,
orders, admin data) managed through a single React Context
(client/src/context/AppContext.jsx).

The site is now a single-page app: the storefront and the admin
panel both live at the same domain, and React Router switches
between them client-side:
  /             Home
  /shop         Shop / product listing + filters
  /product/:id  Single product page
  /cart         Cart
  /checkout     Checkout
  /confirmation Order confirmation
  /account      Login / order history / wishlist / addresses
  /admin        Admin dashboard (Overview, Products, Orders,
                Customers, Settings)

Like before, the storefront navigation does NOT show a link to
/admin — it's reachable directly by typing the URL, same as
admin.html was before.

The Admin panel is now password-protected — see "ADMIN PANEL LOGIN"
below.


REQUIREMENTS
--------------
1. Node.js (for the backend, server.js) — nothing else, only built-in
   modules are used.
   Download it free from: https://nodejs.org (the "LTS" version)
2. Node.js + npm (for building the React frontend, one time, or
   whenever you change the frontend code).

To check if you already have them, open a terminal and run:
   node -v
   npm -v


HOW TO RUN IT
---------------
Just like the plain-HTML version before it: unzip this folder, then
run:
      node server.js

That's it — one command. The very first time you run it, it
automatically installs the frontend dependencies and builds the
React app for you (needs an internet connection, takes a minute or
two — you'll see npm's output in your terminal while it works).
Every time after that, it starts instantly, because the build
already exists.

You'll see:
      StyleHub is running:
      Storefront   ->  http://localhost:3000
      Admin panel  ->  http://localhost:3000/admin

Open http://localhost:3000 in your browser (Chrome, Edge, Firefox,
Safari all work). To stop the server, go back to the terminal and
press Ctrl+C.

If you ever change the code inside /client and want to see the
changes, delete the "dist" folder (client/dist doesn't exist by
default — it gets created on first run) and run `node server.js`
again — it'll detect it's missing and rebuild automatically.

(start.bat and start.sh also still work, if you prefer — they do
the same thing with a couple of extra friendly messages. And
`npm run dev` inside /client still works too, for live-reload while
actively editing code — see "DEVELOPING THE FRONTEND" below.)
not been built yet" message.


DEVELOPING THE FRONTEND (optional, for making changes)
------------------------------------------------------------
If you want to edit the React code and see changes live without
rebuilding every time:
  1. In one terminal: `node server.js` (from the project root) — this
     runs the backend/API on port 3000.
  2. In a second terminal: `cd client && npm run dev` — this starts
     Vite's dev server on http://localhost:5173, with hot-reload, and
     automatically proxies /api and /uploads calls to port 3000.
  3. Open http://localhost:5173 while developing. When you're happy
     with your changes, run `npm run build` inside /client to update
     the production build server.js actually serves on port 3000.


DEPLOYING IT LIVE (so anyone can visit it, not just your own PC)
------------------------------------------------------------------

This project ships with everything needed to deploy for free on Fly.io,
with a persistent volume so data.json and uploads/ survive restarts and
redeploys.

  1. Install the Fly.io CLI:
       - Mac/Linux: curl -L https://fly.io/install.sh | sh
       - Windows (PowerShell): pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

  2. Sign up / log in:
       fly auth signup     (or: fly auth login if you already have an account)

  3. From the project root (the folder with this README and Dockerfile),
     run:
       fly launch --no-deploy
     - When asked for an app name, pick something unique, e.g. stylehub-yourname
     - When asked for a region, pick "sin" (Singapore) — closest to Pakistan
     - Say NO to adding a Postgres or Redis database — this project
       doesn't need one
     This generates/updates fly.toml. A pre-filled fly.toml already ships
     with this project — if `fly launch` overwrites it, just make sure it
     still has the `[[mounts]]` and `DATA_DIR = "/data"` lines shown in
     the version that came with this zip (copy them back in if needed).

  4. Create the persistent volume (this is where your real data lives):
       fly volumes create stylehub_data --region sin --size 1
     (1GB is plenty; Fly's free allowance covers this.)

  5. Deploy:
       fly deploy

  6. Once it finishes, open your live site:
       fly open
     Your site is now live at something like:
       https://stylehub-yourname.fly.dev
     Admin panel: https://stylehub-yourname.fly.dev/admin

  To push updates later, just run `fly deploy` again from the project
  root — your data.json and uploads/ on the volume are untouched by
  redeploys.

ALTERNATIVE: Render.com (also free, simpler, but no persistent disk on
the free tier — admin changes reset on redeploy/restart). Good for a
quick demo: push this project to GitHub, create a Render Web Service,
set Build Command to `cd client && npm install && npm run build && cd ..`
and Start Command to `node server.js`.


FOLDER STRUCTURE
------------------
  stylehub-project/
  |-- server.js          <- the backend (run this with `node server.js`)
  |-- data.json           <- the "database" - products, orders, customers, settings
  |-- uploads/            <- product photos uploaded via the Admin panel land here
  |-- dist/                <- the built React app (generated by `npm run build`,
  |                            served by server.js — don't hand-edit this)
  `-- client/              <- the React source code
      |-- package.json
      |-- vite.config.js
      |-- index.html
      `-- src/
          |-- main.jsx             <- React entry point
          |-- App.jsx              <- routes + layout (nav, footer, toast, WhatsApp button)
          |-- index.css            <- all site styling (same design as before)
          |-- utils.js             <- small formatting helpers
          |-- data/staticData.js   <- static reference data (categories, promo
          |                           codes, city shipping rates, hero slides)
          |-- context/AppContext.jsx <- all global state + API calls (cart,
          |                              wishlist, products, orders, admin CRUD)
          |-- components/          <- Nav, Drawer, Footer, ProductCard, Toast, etc.
          `-- pages/                <- Home, Shop, ProductPage, Cart, Checkout,
                                        Confirmation, Account, and Admin/ (Overview,
                                        Products, Orders, Customers, Settings)


ADMIN PANEL LOGIN
------------------------------
The Admin panel now requires a password before it can be used — this
keeps random visitors who guess the /admin URL from touching your
products, orders, or settings.

  Default password: admin123

CHANGE THIS as soon as you set the site up for real — go to
Admin -> Settings -> "Change Admin Password" (you'll need to enter the
current password once to set a new one).

Notes on how the login works:
  - There's only one shared admin password (no separate accounts) —
    fine for a single shop owner/small team managing the store.
  - After logging in, your browser stays logged in (even after closing
    the tab) until you click "Log Out", or the server is restarted
    (session tokens live in the server's memory, not in data.json).
  - If you forget the password, you (or a developer) can reset it by
    opening data.json on the server, removing the "adminPassword" line
    from the "settings" section, and restarting the server — it will
    fall back to the default (admin123) again.


HOW TO USE THE ADMIN PANEL
------------------------------
Open http://localhost:3000/admin — you'll be asked for the admin
password first (see "ADMIN PANEL LOGIN" above), then you'll see 5 tabs:

  - Sales Overview   - revenue, order count, customers, a weekly chart
  - Products          - add a product with a real photo upload from
                         your computer (or click "Edit" on an
                         existing one to change its name, category,
                         price, stock, description, or swap its
                         photo) — everything is saved instantly to
                         data.json / uploads/
  - Orders            - every order placed at checkout shows up here;
                         change status via the dropdown (Processing /
                         Shipped / Delivered) - also saved for real
  - Customers          - auto-updates whenever an order comes in
  - Settings           - store name, tagline, top banner message,
                         contact phone/email/address, WhatsApp number
                         — saved to data.json and applied straight
                         away across the storefront (footer, top
                         banner, the WhatsApp chat button)

There's a "← View Storefront" link at the top of the admin sidebar
to jump back to the shopping site.

TEST IT YOURSELF:
  1. Open http://localhost:3000/admin in one browser tab
  2. Open http://localhost:3000 (the storefront) in a second tab
  3. In the storefront tab: add a product to cart, go to Checkout,
     fill the form, click "Place Order"
  4. Switch to the admin tab and click "Orders" - the new order is
     already there (refresh the admin tab if it was opened before
     the order was placed)
  5. Try adding a product in Admin > Products, then reload the
     storefront tab - the new product appears in Shop


WHAT'S STILL A DEMO (not wired to real-world services)
------------------------------------------------------------
- Payment: Cash on Delivery works as a real "choice"; JazzCash and
  EasyPaisa are shown as payment options but don't call their real
  APIs - that requires a merchant account and their SDK
- Login: the account login accepts any email/password (no real
  authentication or password checking)
- Shipping cost is a fixed table by city (Karachi/Lahore/Islamabad/
  Other) rather than a live courier-rate API
- Promo codes are hardcoded in client/src/data/staticData.js
  (STYLE10, WELCOME15) rather than managed from the admin panel

To take this fully live (a public website, not just localhost) you
would deploy server.js to a real host (e.g. a small VPS, Render,
Railway) with the pre-built /dist folder alongside it, swap
data.json for a proper database if you expect heavy traffic, and add
real JazzCash/EasyPaisa merchant integration.
