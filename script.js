/* =========================================================
   VELOX Cycles — script.js
   Sections:
     1.  Configuration
     2.  Product data
     3.  Helpers
     4.  Storage (accounts, guest data, persistence)
     5.  App state
     6.  Pricing
     7.  Artwork (SVG illustrations and photos)
     8.  Page views (return HTML strings)
     9.  Router (hash-based pages)
     10. Actions (click handling)
     11. Cart, wishlist and checkout
     12. Authentication (username/password and Google)
     13. Order progress
     14. Navigation, floating cart and animations
     15. Start-up
   ========================================================= */

/* ---------- 1. Configuration ---------- */

// Your Google OAuth Web client ID. It is public and safe in front-end code.
// The site's origin must be listed under "Authorised JavaScript origins".
const GOOGLE_CLIENT_ID = "686082766723-88lr77kn4fbk1lc4igqgf75ffmn8dm35.apps.googleusercontent.com";

const STORAGE_KEY = "velox-store-v3";
const GST_RATE = 0.05;
const COUPONS = { VELOX10: 0.1 };          // code -> discount rate
const ORDER_STEP_MS = 25000;               // demo only: each delivery stage lasts 25 seconds
const ORDER_STAGES = ["Placed", "Packed", "Shipped", "Delivered"];
const TYPES = ["All", "Road", "Mountain", "City", "E-Bike", "Parts"];
const PART_CATEGORIES = ["All", "Brakes", "Tyres", "Drivetrain", "Lights", "Accessories"];
const SIZES = ["S", "M", "L", "XL"];
const PRICE_RANGES = [
  ["all", "Any price"],
  ["u2k", "Under ₹2,000"],
  ["u30", "Under ₹30k"],
  ["30-80", "₹30k – ₹80k"],
  ["o80", "Over ₹80k"]
];
const PRICE_TESTS = {
  all: () => true,
  u2k: price => price < 2000,
  u30: price => price < 30000,
  "30-80": price => price >= 30000 && price <= 80000,
  o80: price => price > 80000
};
const SORT_OPTIONS = [
  ["featured", "Featured"],
  ["low", "Price: low to high"],
  ["high", "Price: high to low"],
  ["rating", "Top rated"]
];
const MARQUEE_ITEMS = ["Hand-built frames", "Free delivery over ₹50,000", "2-year warranty", "E-bike service included", "Test rides in 38 cities"];

const COLOUR_HEX = {
  forest: "#1f7a50",
  crimson: "#a1262f",
  jet: "#2b2b2b",
  ivory: "#e9e2d0",
  bottle: "#0c4a33",
  oxblood: "#5c0f17"
};

const TYPE_DESCRIPTIONS = {
  Road: "Race-tuned geometry, featherlight frame, crisp shifting.",
  Mountain: "Confident grip, trail-ready brakes, long-ride comfort.",
  City: "Upright comfort, practical fittings, everyday reliability.",
  "E-Bike": "Smooth torque-sensor assist with a long-range battery.",
  Parts: "Genuine-quality replacement part, tested for daily riding."
};

// Keywords for the category photos (used when a product has no keyword of its own)
const TYPE_KEYWORDS = {
  Road: "road,bicycle",
  Mountain: "mountain,bike",
  City: "city,bicycle",
  "E-Bike": "electric,bicycle",
  Parts: "bicycle,parts"
};

const REVIEWS = [
  ["Kavya S.", "Feels fast from the first pedal stroke. Brakes are superb."],
  ["Rohan M.", "Assembled in under an hour. The finish looks stunning."],
  ["Sana K.", "Comfortable on long rides and very well balanced."]
];

/* ---------- 2. Product data ---------- */

// Bikes: [name, type, price (₹), tag, colours]
const BIKE_ROWS = [
  ["Apex R9", "Road", 84999, "Bestseller", ["crimson", "ivory"]],
  ["Gravel Nomad", "Road", 57400, "Adventure", ["forest", "jet"]],
  ["Peloton Pro", "Road", 72500, "New", ["ivory", "oxblood"]],
  ["Velocity Sprint", "Road", 45999, "Value", ["bottle", "crimson"]],
  ["Tandem Duo", "Road", 139000, "Limited", ["jet", "forest"]],
  ["Ridge Carbon", "Road", 118000, "Premium", ["ivory", "jet"]],
  ["Terra Gravel Pro", "Road", 64900, "Pro", ["oxblood", "ivory"]],
  ["Trailblazer X", "Mountain", 62500, "New", ["forest", "ivory"]],
  ["Shadow Hardtail", "Mountain", 38999, "Value", ["jet", "crimson"]],
  ["Summit Enduro", "Mountain", 91500, "Bestseller", ["oxblood", "jet"]],
  ["Rocky Trail", "Mountain", 29999, "Popular", ["bottle", "ivory"]],
  ["Kids Trail", "Mountain", 16999, "Junior", ["crimson", "forest"]],
  ["Storm GT", "Mountain", 74900, "New", ["jet", "crimson"]],
  ["Alpine Climber", "Mountain", 48500, "Value", ["bottle", "jet"]],
  ["Vanguard Fat", "Mountain", 55900, "Fat Tyre", ["crimson", "jet"]],
  ["Metro Glide", "City", 28999, "Commuter", ["ivory", "jet"]],
  ["Fixie Ember", "City", 26999, "Minimal", ["oxblood", "ivory"]],
  ["Urban Step", "City", 22500, "Easy Step", ["forest", "ivory"]],
  ["Harbor Cruiser", "City", 19999, "Classic", ["bottle", "jet"]],
  ["Fold-X", "City", 33500, "Compact", ["jet", "crimson"]],
  ["Kids Spark", "City", 14999, "Junior", ["crimson", "ivory"]],
  ["Harbor Hybrid", "City", 24500, "Hybrid", ["forest", "jet"]],
  ["Boulevard Cruiser", "City", 31500, "Comfort", ["ivory", "crimson"]],
  ["Swift Commuter Pro", "City", 35900, "Pro", ["jet", "forest"]],
  ["Volt E-Sport", "E-Bike", 129900, "Electric", ["crimson", "jet"]],
  ["City Volt", "E-Bike", 99900, "Urban", ["forest", "ivory"]],
  ["Trail Volt", "E-Bike", 115000, "Electric", ["jet", "bottle"]],
  ["Cargo Hauler", "E-Bike", 109500, "Utility", ["oxblood", "ivory"]],
  ["Volt Hybrid Lite", "E-Bike", 79900, "Lightweight", ["ivory", "bottle"]],
  ["Rush Speed-Pedelec", "E-Bike", 149900, "Fast", ["oxblood", "jet"]]
];

// Spare parts: [name, category, price (₹), tag, photo keyword]
const PART_ROWS = [
  ["Hydraulic Disc Brake Set", "Brakes", 6499, "Bestseller", "bicycle disc brake"],
  ["Rim Brake Pads (Pair)", "Brakes", 799, "Value", "bicycle brake pads"],
  ["Alloy Brake Levers", "Brakes", 1299, "Pro", "bicycle brake lever"],
  ["Puncture-Proof Road Tyres", "Tyres", 2499, "Popular", "road bicycle tyre"],
  ["29er Knobby MTB Tyre", "Tyres", 1699, "Trail", "mountain bike tyre"],
  ["Inner Tube 700c", "Tyres", 299, "Essential", "bicycle inner tube"],
  ["12-Speed Chain", "Drivetrain", 1299, "New", "bicycle chain"],
  ["11-42T Cassette", "Drivetrain", 3199, "Upgrade", "bicycle cassette"],
  ["170mm Crankset", "Drivetrain", 4299, "Pro", "bicycle crankset"],
  ["USB LED Front Light", "Lights", 1299, "Bestseller", "bicycle front light"],
  ["Rear LED Light Set", "Lights", 699, "Safety", "bicycle rear light"],
  ["Carbon Seat Post", "Accessories", 2899, "Lightweight", "bicycle seatpost"],
  ["Ergonomic Saddle", "Accessories", 1899, "Comfort", "bicycle saddle"],
  ["Bike Helmet Pro", "Accessories", 2499, "Safety", "bicycle helmet"]
];

// Build one list of products. Every product gets the same fields so the
// rest of the code can treat bikes and parts the same way.
const PRODUCTS = [
  ...BIKE_ROWS.map(([name, type, price, tag, colours], i) => ({
    id: i + 1,
    name,
    type,
    sub: type,
    price,
    tag,
    colours,
    rating: +(4.3 + ((i + 1) % 6) / 10).toFixed(1),
    reviews: 20 + ((i + 1) * 13) % 150,
    description: TYPE_DESCRIPTIONS[type]
  })),
  ...PART_ROWS.map(([name, sub, price, tag, keyword], i) => ({
    id: BIKE_ROWS.length + i + 1,
    name,
    type: "Parts",
    sub,
    price,
    tag,
    keyword,
    colours: [],
    rating: +(4.5 + (i % 5) / 10).toFixed(1),
    reviews: 15 + ((i + 5) * 17) % 120,
    description: TYPE_DESCRIPTIONS.Parts
  }))
];

/* ---------- 3. Helpers ---------- */

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

/** Format a number as Indian rupees, e.g. ₹84,999 */
const money = amount => "₹" + Math.round(amount).toLocaleString("en-IN");

/** Escape text before inserting it into HTML, to protect against injected markup */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

const productById = id => PRODUCTS.find(product => product.id === Number(id));

/** Build <option> tags, marking the selected one */
const optionTags = (list, selectedValue) =>
  list.map(([value, label]) =>
    `<option value="${value}"${value === selectedValue ? " selected" : ""}>${label}</option>`
  ).join("");

/** Build a filter/size chip button */
const chip = (label, isActive, action, value) =>
  `<button class="chip${isActive ? " is-on" : ""}" data-action="${action}" data-value="${escapeHtml(value)}" aria-pressed="${isActive}">${escapeHtml(label)}</button>`;

/* ---------- 4. Storage ---------- */

function emptyGuestData() {
  return { cart: [], wishlist: [], orders: [] };
}

/** Load saved data from this browser, or start fresh */
function loadDatabase() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.users) return saved;
  } catch (error) {
    // Corrupt or blocked storage: start with an empty database
  }
  return { users: {}, session: null, guest: emptyGuestData() };
}

let db = loadDatabase();

function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    // Storage may be full or blocked (for example in private mode)
  }
}

function isSignedIn() {
  return Boolean(db.session && db.users[db.session]);
}

/** The signed-in user's data, or the guest data when nobody is signed in */
function currentAccount() {
  return isSignedIn() ? db.users[db.session] : db.guest;
}

/* ---------- 5. App state ---------- */

const state = {
  route: "home",
  selectedId: 1,        // product shown on the product page
  colourIndex: {},      // product id -> chosen colour index
  size: "M",            // size chosen on the product page
  typeFilter: "All",
  partFilter: "All",
  search: "",
  priceFilter: "all",
  sort: "featured",
  authMode: "signin",   // "signin" or "signup"
  couponApplied: false,
  pendingRoute: null,   // page to open after signing in
  lastCartCount: 0
};

/* ---------- 6. Pricing ---------- */

/** Subtotal, discount, GST and total for a list of cart lines */
function cartTotals(lines) {
  const subtotal = lines.reduce((sum, line) => sum + productById(line.productId).price * line.qty, 0);
  const discountRate = state.couponApplied ? COUPONS.VELOX10 : 0;
  const discount = Math.round(subtotal * discountRate);
  const taxable = subtotal - discount;
  const gst = Math.round(taxable * GST_RATE);
  return { subtotal, discount, gst, total: taxable + gst };
}

function cartCount() {
  return currentAccount().cart.reduce((sum, line) => sum + line.qty, 0);
}

/* ---------- 7. Artwork ---------- */

/** Hand-drawn bike illustration, used as a fallback under each photo */
function bikeSVG(frameColour) {
  return `
<svg class="art-svg" viewBox="0 0 200 130" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g class="wheel">
    <circle cx="45" cy="95" r="31" stroke="#e8e8ec" stroke-width="3"/>
    <circle cx="45" cy="95" r="3" fill="#e8e8ec"/>
    <path d="M45 64V126M14 95H76M22 72L68 118M68 72L22 118" stroke="#ffffff28"/>
  </g>
  <g class="wheel">
    <circle cx="155" cy="95" r="31" stroke="#e8e8ec" stroke-width="3"/>
    <circle cx="155" cy="95" r="3" fill="#e8e8ec"/>
    <path d="M155 64V126M124 95H186M132 72L178 118M178 72L132 118" stroke="#ffffff28"/>
  </g>
  <path d="M45 95L100 95L80 45L45 95M80 45L125 45L100 95M125 45L155 95" stroke="${frameColour}" stroke-width="6"/>
  <path d="M125 45L134 30L148 32M70 38H90" stroke="#e8e8ec" stroke-width="4"/>
</svg>`;
}

/** Simple gear icon used for spare parts */
const PART_SVG = `
<svg class="art-svg part" viewBox="0 0 120 120" fill="none" stroke="#e8e8ec" stroke-width="4" stroke-linecap="round" aria-hidden="true">
  <circle cx="60" cy="60" r="28"/>
  <circle cx="60" cy="60" r="10"/>
  <path d="M60 14v18M60 88v18M14 60h18M88 60h18M29 29l13 13M78 78l13 13M91 29L78 42M42 78L29 91"/>
</svg>`;

/** Web address of a real photo for a product (keyword-based, changes per product) */
function photoUrl(product) {
  const keywords = product.keyword || `${TYPE_KEYWORDS[product.type]},${product.name.split(" ")[0].toLowerCase()}`;
  return `https://loremflickr.com/800/600/${keywords}?lock=${product.id}`;
}

/** Product image: illustration underneath, photo on top (if the photo fails, the illustration shows) */
function productArt(product, colourIndex = 0) {
  const illustration = product.type === "Parts"
    ? PART_SVG
    : bikeSVG(COLOUR_HEX[product.colours[colourIndex]] || COLOUR_HEX.ivory);
  return `
<div class="art">
  ${illustration}
  <img class="art-photo" src="${photoUrl(product)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.remove()">
</div>`;
}

/* ---------- 8. Page views ---------- */
// Each view function returns an HTML string for one page.

function renderHome() {
  const featured = [1, 8, 13, 11].map(productById);
  return `
  <section class="hero">
    <div>
      <p class="eyebrow">Winter 2027 · Aurora Collection</p>
      <h1>
        <span>Ride in</span>
        <span class="shimmer">the dark.</span>
        <span>Own the road.</span>
      </h1>
      <p class="lead">Hand-built frames, featherweight components and electric assist that disappears into the ride. Thirty machines and every part to keep them rolling.</p>
      <div class="actions">
        <a class="btn" href="#shop">Shop bikes &amp; parts →</a>
        <a class="btn btn-ghost" href="#account">Your account</a>
      </div>
    </div>
    <div class="hero-art">${bikeSVG(COLOUR_HEX.crimson)}</div>
  </section>

  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">${[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(item => `${escapeHtml(item)}<span>✦</span>`).join("")}</div>
  </div>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Categories</p><h2>Choose your terrain</h2></div></div>
    <div class="categories reveal">
      ${[["Road", "Speed & precision"], ["Mountain", "Grip & suspension"], ["City", "Commute & comfort"], ["E-Bike", "Assist & range"], ["Parts", "Spares & upgrades"]]
        .map(([type, text]) => `<button class="category" data-action="choose-category" data-value="${type}"><strong>${type}</strong><small>${text}</small></button>`).join("")}
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <div><p class="eyebrow">Featured</p><h2>Most wanted</h2></div>
      <a class="btn btn-ghost" href="#shop">View all</a>
    </div>
    <div class="grid">${featured.map(productCard).join("")}</div>
  </section>

  <section class="section">
    <div class="newsletter reveal">
      <div>
        <p class="eyebrow">Drops &amp; offers</p>
        <h2>First access to every drop.</h2>
        <p class="lead-sm muted">Limited editions and early pricing for subscribers. No spam.</p>
      </div>
      <form class="actions" data-form="subscribe">
        <input type="email" id="subscribeEmail" placeholder="you@email.com" aria-label="Email address" required>
        <button class="btn" type="submit">Subscribe</button>
      </form>
    </div>
  </section>`;
}

function renderShop() {
  return `
  <header class="section-head">
    <div><p class="eyebrow">Collection</p><h1>All bikes &amp; parts</h1></div>
    <p class="muted" id="resultCount"></p>
  </header>

  <div class="toolbar">
    <input type="search" id="searchInput" placeholder="Search bikes &amp; parts…" value="${escapeHtml(state.search)}" aria-label="Search products">
    <select id="priceSelect" aria-label="Filter by price">${optionTags(PRICE_RANGES, state.priceFilter)}</select>
    <select id="sortSelect" aria-label="Sort products">${optionTags(SORT_OPTIONS, state.sort)}</select>
  </div>

  <div class="chips" role="group" aria-label="Category">
    ${TYPES.map(type => chip(type, state.typeFilter === type, "set-type", type)).join("")}
  </div>

  ${state.typeFilter === "Parts" ? `
  <div class="chips sub-chips" role="group" aria-label="Part category">
    ${PART_CATEGORIES.map(category => chip(category, state.partFilter === category, "set-part-category", category)).join("")}
  </div>` : ""}

  <div class="grid" id="productGrid" style="margin-top:28px"></div>`;
}

/** Card for one product in a grid */
function productCard(product) {
  const isSaved = currentAccount().wishlist.includes(product.id);
  return `
  <article class="card reveal">
    <span class="tag">${escapeHtml(product.tag)}</span>
    <button class="heart${isSaved ? " on" : ""}" data-action="toggle-wishlist" data-id="${product.id}" aria-label="Save ${escapeHtml(product.name)} to wishlist">${isSaved ? "♥" : "♡"}</button>
    <div class="card-art" data-action="open-product" data-id="${product.id}">${productArt(product)}</div>
    <h3 data-action="open-product" data-id="${product.id}">${escapeHtml(product.name)}</h3>
    <p>${escapeHtml(product.sub)} · ★ ${product.rating} (${product.reviews})</p>
    <div class="card-foot">
      <span class="price">${money(product.price)}</span>
      <button class="btn btn-sm" data-action="add-to-cart" data-id="${product.id}" data-colour="0" data-size="M">Add</button>
    </div>
  </article>`;
}

function renderProduct() {
  const product = productById(state.selectedId) || PRODUCTS[0];
  const colourIndex = state.colourIndex[product.id] || 0;
  const isSaved = currentAccount().wishlist.includes(product.id);
  const isPart = product.type === "Parts";
  const similar = PRODUCTS.filter(item => item.type === product.type && item.id !== product.id).slice(0, 3);

  const colourPicker = isPart ? "" : `
    <p class="field-label">Colour</p>
    <div class="swatches">
      ${product.colours.map((colour, index) => `
        <button class="swatch${index === colourIndex ? " is-on" : ""}" style="background:${COLOUR_HEX[colour]}"
          data-action="set-colour" data-id="${product.id}" data-value="${index}" aria-label="${colour}"></button>`).join("")}
    </div>
    <p class="field-label">Size</p>
    <div class="chips">${SIZES.map(size => chip(size, state.size === size, "set-size", size)).join("")}</div>`;

  return `
  <div class="product-layout">
    <div class="stage">${productArt(product, colourIndex)}</div>
    <div>
      <p class="eyebrow">${escapeHtml(product.type)} · ${escapeHtml(product.tag)}</p>
      <h1 class="product-title">${escapeHtml(product.name)}</h1>
      <p class="muted">★ ${product.rating} · ${product.reviews} reviews</p>
      <p class="lead-sm">${escapeHtml(product.description)}</p>
      <p class="price big">${money(product.price)}</p>
      ${colourPicker}
      <dl class="specs">
        <div><dt>${isPart ? "Category" : "Frame"}</dt><dd>${isPart ? escapeHtml(product.sub) : (product.type === "E-Bike" ? "Reinforced alloy" : "Aluminium")}</dd></div>
        <div><dt>${isPart ? "Fit" : "Weight"}</dt><dd>${isPart ? "Universal" : (product.type === "E-Bike" ? "23 kg" : "9–13 kg")}</dd></div>
        <div><dt>Warranty</dt><dd>2 years</dd></div>
        <div><dt>Delivery</dt><dd>3–5 days</dd></div>
      </dl>
      <div class="actions">
        <button class="btn" data-action="add-to-cart" data-id="${product.id}" data-colour="${colourIndex}" data-size="${isPart ? "M" : state.size}">Add to cart</button>
        <button class="btn btn-ghost" data-action="toggle-wishlist" data-id="${product.id}">${isSaved ? "♥ Wishlisted" : "♡ Wishlist"}</button>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="section-head"><h2>Reviews</h2></div>
    <div class="panel">
      ${REVIEWS.map(([name, text]) => `<div class="review"><strong>${name}</strong> <span>★★★★★</span><p>${text}</p></div>`).join("")}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Similar products</h2><a class="btn btn-ghost" href="#shop">Back to shop</a></div>
    <div class="grid">${similar.map(productCard).join("")}</div>
  </section>`;
}

function renderWishlist() {
  const saved = currentAccount().wishlist.map(productById);
  if (!saved.length) {
    return emptyState("Your wishlist is empty", "Tap the heart on any bike or part to save it here.", "#shop", "Browse products");
  }
  return `
  <header class="section-head">
    <div><p class="eyebrow">Saved</p><h1>Wishlist</h1></div>
    <p class="muted">${saved.length} saved</p>
  </header>
  <div class="grid">${saved.map(productCard).join("")}</div>`;
}

function cartLineHTML(line) {
  const product = productById(line.productId);
  return `
  <div class="cart-line">
    <div class="thumb">${productArt(product, line.colourIndex)}</div>
    <div class="cart-info">
      <strong>${escapeHtml(product.name)}</strong>
      <span class="muted small">${product.type === "Parts" ? escapeHtml(product.sub) : "Size " + escapeHtml(line.size)} · ${money(product.price)} each</span>
      <div class="row">
        <div class="qty">
          <button data-action="change-qty" data-key="${escapeHtml(line.key)}" data-value="-1" aria-label="Decrease quantity">−</button>
          <span>${line.qty}</span>
          <button data-action="change-qty" data-key="${escapeHtml(line.key)}" data-value="1" aria-label="Increase quantity">+</button>
        </div>
        <button class="link" data-action="remove-line" data-key="${escapeHtml(line.key)}">Remove</button>
      </div>
    </div>
    <strong class="line-total">${money(product.price * line.qty)}</strong>
  </div>`;
}

function renderCart() {
  const lines = currentAccount().cart;
  if (!lines.length) {
    return emptyState("Your cart is empty", "Explore the collection and add your first ride.", "#shop", "Shop now");
  }
  const totals = cartTotals(lines);
  return `
  <div class="two-col">
    <div class="panel">
      ${lines.map(cartLineHTML).join("")}
      <div style="margin-top:14px"><button class="link" data-action="clear-cart">Clear cart</button></div>
    </div>
    <aside class="panel">
      <h3>Summary</h3>
      <div style="margin-top:14px">
        <div class="summary-row"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
        ${totals.discount ? `<div class="summary-row"><span>Coupon VELOX10</span><span>−${money(totals.discount)}</span></div>` : ""}
        <div class="summary-row"><span>GST (5%)</span><span>${money(totals.gst)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(totals.total)}</span></div>
      </div>
      <div class="coupon-row">
        <input type="text" id="couponInput" placeholder="Coupon code (try VELOX10)" aria-label="Coupon code">
        <button class="btn btn-ghost btn-sm" data-action="apply-coupon">Apply</button>
      </div>
      <button class="btn btn-block" style="margin-top:18px" data-action="go-checkout">Checkout →</button>
    </aside>
  </div>`;
}

function renderCheckout() {
  const lines = currentAccount().cart;
  if (!lines.length) {
    return emptyState("Nothing to check out", "Add a bike or part to your cart first.", "#shop", "Shop now");
  }
  const totals = cartTotals(lines);
  return `
  <div class="two-col">
    <div class="panel">
      <h2>Delivery</h2>
      <form class="form-grid" style="margin-top:18px" data-form="checkout" novalidate>
        <div class="field full"><label for="checkoutName">Full name</label><input id="checkoutName" value="${escapeHtml(currentAccount().name || "")}"></div>
        <div class="field full"><label for="checkoutAddress">Address</label><input id="checkoutAddress" placeholder="Flat, street, area"></div>
        <div class="field"><label for="checkoutCity">City</label><input id="checkoutCity"></div>
        <div class="field"><label for="checkoutPin">PIN code</label><input id="checkoutPin" maxlength="6" inputmode="numeric"></div>
      </form>
      <h3 style="margin:22px 0 12px">Payment</h3>
      <div class="pay-options">
        ${[["card", "Card"], ["upi", "UPI"], ["cod", "Cash on delivery"]].map(([value, label], index) =>
          `<label class="pay-option"><input type="radio" name="payment" value="${value}"${index === 0 ? " checked" : ""}>${label}</label>`).join("")}
      </div>
    </div>
    <aside class="panel">
      <h3>Order summary</h3>
      <div style="margin-top:12px">
        ${lines.map(line => {
          const product = productById(line.productId);
          return `<div class="summary-row"><span>${line.qty}× ${escapeHtml(product.name)}</span><span>${money(product.price * line.qty)}</span></div>`;
        }).join("")}
        ${totals.discount ? `<div class="summary-row"><span>Coupon VELOX10</span><span>−${money(totals.discount)}</span></div>` : ""}
        <div class="summary-row"><span>GST (5%)</span><span>${money(totals.gst)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(totals.total)}</span></div>
      </div>
      <button class="btn btn-block" style="margin-top:18px" data-action="place-order">Place order</button>
    </aside>
  </div>`;
}

function renderOrders() {
  const orders = currentAccount().orders;
  if (!orders.length) {
    return emptyState("No orders yet", "Placed orders and live delivery progress appear here.", "#shop", "Shop now");
  }
  return `
  <header class="section-head">
    <div><p class="eyebrow">History</p><h1>Your orders</h1></div>
  </header>
  ${orders.map(order => `
    <article class="order-card">
      <div class="order-head">
        <div>
          <p class="eyebrow">Order ${escapeHtml(order.id)}</p>
          <p class="muted small">${new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · ${escapeHtml(order.payment.toUpperCase())}</p>
        </div>
        <strong class="price">${money(order.total)}</strong>
      </div>
      <p class="muted" style="margin-top:10px">${order.items.map(item => `${item.qty}× ${escapeHtml(item.name)}`).join(" · ")}</p>
      <div class="order-progress" data-order-id="${escapeHtml(order.id)}">${progressHTML(order)}</div>
      <div class="order-head">
        <span class="muted small">${escapeHtml(order.address)}</span>
        ${orderStage(order) === 0 && !order.cancelled ? `<button class="link" data-action="cancel-order" data-id="${escapeHtml(order.id)}">Cancel order</button>` : ""}
      </div>
    </article>`).join("")}`;
}

function renderAccount() {
  const account = currentAccount();
  const completed = account.orders.filter(order => !order.cancelled);
  const totalSpent = completed.reduce((sum, order) => sum + order.total, 0);
  const initials = account.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const prefs = account.preferences || { news: true, orderUpdates: true };
  return `
  <div class="two-col">
    <div class="panel">
      <div class="account-head">
        <div class="avatar">${escapeHtml(initials)}</div>
        <div>
          <h2>${escapeHtml(account.name)}</h2>
          <p class="muted">${escapeHtml(account.email || account.username)}</p>
          <p class="eyebrow" style="margin-top:6px">${account.provider === "google" ? "Signed in with Google" : "Username &amp; password"}</p>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><span>Orders</span><strong>${completed.length}</strong></div>
        <div class="stat"><span>Spent</span><strong>${money(totalSpent)}</strong></div>
        <div class="stat"><span>Wishlist</span><strong>${account.wishlist.length}</strong></div>
      </div>
      <div class="actions">
        <a class="btn btn-ghost btn-sm" href="#orders">View orders</a>
        <a class="btn btn-ghost btn-sm" href="#wishlist">Wishlist</a>
        <button class="btn btn-sm" data-action="sign-out">Sign out</button>
      </div>
    </div>
    <aside class="panel">
      <h3>Preferences</h3>
      <div class="chips" style="flex-direction:column;margin-top:14px;align-items:stretch">
        <button class="chip${prefs.news ? " is-on" : ""}" data-action="toggle-pref" data-value="news">Drops &amp; offers: ${prefs.news ? "on" : "off"}</button>
        <button class="chip${prefs.orderUpdates ? " is-on" : ""}" data-action="toggle-pref" data-value="orderUpdates">Order updates: ${prefs.orderUpdates ? "on" : "off"}</button>
      </div>
    </aside>
  </div>`;
}

function renderSignIn() {
  const isSignUp = state.authMode === "signup";
  return `
  <div class="panel auth-card">
    <p class="eyebrow" style="text-align:center">Welcome to VELOX</p>
    <h2 style="text-align:center;margin:8px 0 20px">${isSignUp ? "Create account" : "Sign in"}</h2>
    <div class="tabs" role="tablist">
      <button class="${!isSignUp ? "is-on" : ""}" data-action="switch-auth-mode" data-value="signin" role="tab">Sign in</button>
      <button class="${isSignUp ? "is-on" : ""}" data-action="switch-auth-mode" data-value="signup" role="tab">Sign up</button>
    </div>
    <form data-form="auth" novalidate>
      ${isSignUp ? `<div class="field"><label for="authName">Full name</label><input id="authName" autocomplete="name"></div>` : ""}
      <div class="field"><label for="authUsername">Username</label><input id="authUsername" autocomplete="username"></div>
      <div class="field"><label for="authPassword">Password</label><input id="authPassword" type="password" autocomplete="${isSignUp ? "new-password" : "current-password"}"></div>
      <button class="btn btn-block" type="submit">${isSignUp ? "Create account" : "Sign in"}</button>
      <p class="form-error" id="authError" role="alert"></p>
    </form>
    <div class="or-divider">or</div>
    <div class="google-slot" id="googleSlot"></div>
    <button class="btn btn-google btn-block" id="googleFallback" data-action="google-demo" hidden>Continue with Google (demo)</button>
    <p class="small muted" style="text-align:center;margin-top:16px">Accounts are stored in this browser. Google sign-in works on your published site.</p>
  </div>`;
}

/** Message shown when a page has nothing to display yet */
function emptyState(title, text, href, buttonLabel) {
  return `
  <div class="panel empty-state">
    <h2>${title}</h2>
    <p>${text}</p>
    <a class="btn" href="${href}">${buttonLabel}</a>
  </div>`;
}

/* ---------- 9. Router ---------- */

const ROUTES = {
  home: renderHome,
  shop: renderShop,
  product: renderProduct,
  wishlist: renderWishlist,
  cart: renderCart,
  checkout: renderCheckout,
  orders: renderOrders,
  account: renderAccount,
  signin: renderSignIn
};

// Pages that need a signed-in user
const PROTECTED_ROUTES = ["checkout", "orders", "account"];

/** Read the page name from the URL hash, e.g. "#shop" -> "shop" */
function routeFromHash() {
  const name = location.hash.slice(1) || "home";
  return ROUTES[name] ? name : "home";
}

/** Change the page by updating the URL hash (this triggers render) */
function navigate(route) {
  if (location.hash.slice(1) === route) {
    render();
  } else {
    location.hash = route;
  }
}

/** Draw the current page, with the entry animation */
function render() {
  let route = routeFromHash();

  if (PROTECTED_ROUTES.includes(route) && !isSignedIn()) {
    state.pendingRoute = route;
    return navigate("signin");
  }
  if (route === "signin" && isSignedIn()) {
    return navigate("account");
  }

  state.route = route;
  const app = $("#app");
  app.classList.remove("page-enter");
  app.innerHTML = ROUTES[route]();
  void app.offsetWidth;            // restart the CSS animation
  app.classList.add("page-enter");
  afterRender();
}

/** Redraw the current page without the entry animation (used after small changes) */
function refresh() {
  $("#app").innerHTML = ROUTES[state.route]();
  afterRender();
}

function afterRender() {
  if (state.route === "shop") renderProductGrid();
  observeReveals();
  updateNavigation();
  updateFloatingCart();
  initGoogleButton();
}

/* ---------- 10. Actions (click and form handling) ---------- */

document.addEventListener("click", event => {
  const element = event.target.closest("[data-action]");
  if (!element) return;

  const { action, id, value, key, colour, size } = element.dataset;
  const productId = Number(id);

  switch (action) {
    case "open-product":
      state.selectedId = productId;
      state.size = "M";
      navigate("product");
      break;
    case "toggle-wishlist": toggleWishlist(productId); break;
    case "add-to-cart": addToCart(productId, Number(colour || 0), size || "M"); break;
    case "set-colour":
      state.colourIndex[productId] = Number(value);
      refresh();
      break;
    case "set-size":
      state.size = value;
      refresh();
      break;
    case "set-type":
      state.typeFilter = value;
      state.partFilter = "All";
      refresh();
      break;
    case "set-part-category":
      state.partFilter = value;
      refresh();
      break;
    case "choose-category":
      state.typeFilter = value;
      state.partFilter = "All";
      state.search = "";
      navigate("shop");
      break;
    case "change-qty": changeCartQuantity(key, Number(value)); break;
    case "remove-line":
      currentAccount().cart = currentAccount().cart.filter(line => line.key !== key);
      saveDatabase();
      refresh();
      updateFloatingCart();
      break;
    case "clear-cart":
      currentAccount().cart = [];
      saveDatabase();
      refresh();
      updateFloatingCart();
      showToast("Cart cleared");
      break;
    case "apply-coupon": applyCoupon(); break;
    case "go-checkout": navigate("checkout"); break;
    case "place-order": placeOrder(); break;
    case "cancel-order": cancelOrder(element.dataset.id); break;
    case "switch-auth-mode":
      state.authMode = value;
      refresh();
      break;
    case "google-demo": signInAsDemoUser(); break;
    case "toggle-pref": togglePreference(value); break;
    case "sign-out": signOut(); break;
    default: break;
  }
});

// Forms: sign-in/up, checkout and newsletter
document.addEventListener("submit", event => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  switch (form.dataset.form) {
    case "auth": submitAuth(); break;
    case "checkout": placeOrder(); break;
    case "subscribe": subscribe(); break;
    default: break;
  }
});

// Live search and filter changes on the shop page
document.addEventListener("input", event => {
  if (event.target.id === "searchInput") {
    state.search = event.target.value;
    renderProductGrid();
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "priceSelect") {
    state.priceFilter = event.target.value;
    renderProductGrid();
  }
  if (event.target.id === "sortSelect") {
    state.sort = event.target.value;
    renderProductGrid();
  }
});

/* ---------- 11. Cart, wishlist and checkout ---------- */

function addToCart(productId, colourIndex, size) {
  const account = currentAccount();
  const key = `${productId}-${colourIndex}-${size}`;
  const existing = account.cart.find(line => line.key === key);

  if (existing) {
    existing.qty = Math.min(10, existing.qty + 1);
  } else {
    account.cart.push({ key, productId, colourIndex, size, qty: 1 });
  }

  saveDatabase();
  updateNavigation();
  updateFloatingCart();
  showToast(`${productById(productId).name} added to cart`);
}

function changeCartQuantity(key, change) {
  const line = currentAccount().cart.find(item => item.key === key);
  if (!line) return;
  line.qty = Math.max(1, Math.min(10, line.qty + change));
  saveDatabase();
  refresh();
  updateFloatingCart();
}

function toggleWishlist(productId) {
  const wishlist = currentAccount().wishlist;
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from wishlist");
  } else {
    wishlist.push(productId);
    showToast("Saved to wishlist ♥");
  }
  saveDatabase();
  refresh();
}

function applyCoupon() {
  const code = ($("#couponInput")?.value || "").trim().toUpperCase();
  if (COUPONS[code] !== undefined) {
    state.couponApplied = true;
    showToast("Coupon applied: 10% off");
  } else {
    showToast("That coupon isn't valid");
  }
  refresh();
}

function placeOrder() {
  const name = $("#checkoutName")?.value.trim();
  const address = $("#checkoutAddress")?.value.trim();
  const city = $("#checkoutCity")?.value.trim();
  const pin = $("#checkoutPin")?.value.trim();

  if (!name || !address || !city || !/^\d{6}$/.test(pin)) {
    showToast("Please complete the address with a 6-digit PIN");
    return;
  }

  const account = currentAccount();
  const totals = cartTotals(account.cart);
  const payment = document.querySelector('input[name="payment"]:checked')?.value || "card";

  account.orders.unshift({
    id: "VX" + Date.now().toString(36).toUpperCase().slice(-6),
    createdAt: Date.now(),
    items: account.cart.map(line => {
      const product = productById(line.productId);
      return { name: product.name, qty: line.qty, size: line.size, price: product.price };
    }),
    total: totals.total,
    payment,
    address: `${name}, ${address}, ${city} ${pin}`,
    cancelled: false
  });

  account.cart = [];
  state.couponApplied = false;
  saveDatabase();
  updateFloatingCart();
  showToast("Order placed ✓");
  navigate("orders");
}

function cancelOrder(orderId) {
  const order = currentAccount().orders.find(item => item.id === orderId);
  if (!order) return;
  order.cancelled = true;
  saveDatabase();
  showToast("Order cancelled");
  refresh();
}

function subscribe() {
  const email = ($("#subscribeEmail")?.value || "").trim();
  if (/^\S+@\S+\.\S+$/.test(email)) {
    showToast("You're on the list. Welcome to VELOX.");
    $("#subscribeEmail").value = "";
  } else {
    showToast("Please enter a valid email");
  }
}

function togglePreference(key) {
  const account = currentAccount();
  account.preferences = account.preferences || { news: true, orderUpdates: true };
  const keyName = key === "orderUpdates" ? "orderUpdates" : "news";
  account.preferences[keyName] = !account.preferences[keyName];
  saveDatabase();
  refresh();
}

/* ---------- 12. Authentication ---------- */

/** Hash the password with SHA-256 (salted with the username) before storing it */
async function hashPassword(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  try {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    // Very old browsers: a simple non-cryptographic fallback
    let hash = 0;
    for (const byte of bytes) hash = (hash * 31 + byte) | 0;
    return "fallback-" + hash;
  }
}

/** Save a signed-in user, move guest items into their account, then open the right page */
function logIn(username) {
  const user = db.users[username];

  // Move anything added as a guest into the account
  db.guest.cart.forEach(guestLine => {
    const existing = user.cart.find(line => line.key === guestLine.key);
    if (existing) existing.qty = Math.min(10, existing.qty + guestLine.qty);
    else user.cart.push(guestLine);
  });
  db.guest.wishlist.forEach(id => {
    if (!user.wishlist.includes(id)) user.wishlist.push(id);
  });
  db.guest = emptyGuestData();

  db.session = username;
  saveDatabase();
  showToast(`Welcome, ${user.name.split(" ")[0]}`);

  const destination = state.pendingRoute || "account";
  state.pendingRoute = null;
  navigate(destination);
}

function signOut() {
  db.session = null;
  saveDatabase();
  showToast("Signed out");
  navigate("home");
}

/** Username and password sign-in or sign-up */
async function submitAuth() {
  const username = ($("#authUsername")?.value || "").trim().toLowerCase();
  const password = $("#authPassword")?.value || "";
  const name = ($("#authName")?.value || "").trim();
  const errorBox = $("#authError");
  const showError = message => { if (errorBox) errorBox.textContent = message; };

  if (state.authMode === "signup") {
    if (name.length < 2) return showError("Please enter your name");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return showError("Username: 3–20 letters, numbers or underscores");
    if (password.length < 6) return showError("Password must be at least 6 characters");
    if (db.users[username]) return showError("That username is taken");

    db.users[username] = {
      username,
      name,
      email: "",
      provider: "password",
      passwordHash: await hashPassword(username, password),
      cart: [],
      wishlist: [],
      orders: [],
      preferences: { news: true, orderUpdates: true }
    };
    return logIn(username);
  }

  const user = db.users[username];
  if (!user) return showError("No account with that username");
  if (user.provider === "google") return showError("This account uses Google sign-in");
  if ((await hashPassword(username, password)) !== user.passwordHash) return showError("Incorrect password");
  logIn(username);
}

/** Decode the payload of a Google ID token (a base64url-encoded JSON object) */
function decodeGoogleToken(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64).split("").map(char => "%" + char.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
  return JSON.parse(json);
}

/** Called by Google after the user picks an account */
function handleGoogleCredential(response) {
  let profile;
  try {
    profile = decodeGoogleToken(response.credential);
  } catch (error) {
    return showToast("Google sign-in failed. Please try again.");
  }
  const email = (profile.email || "").toLowerCase();
  if (!email) return showToast("Google did not return an email address");

  if (!db.users[email]) {
    db.users[email] = {
      username: email,
      name: profile.name || email.split("@")[0],
      email,
      provider: "google",
      cart: [],
      wishlist: [],
      orders: [],
      preferences: { news: true, orderUpdates: true }
    };
  }
  logIn(email);
}

let googleAttempts = 0;

/**
 * Draw Google's official sign-in button into #googleSlot.
 * If Google's script has not loaded (for example, offline or in a blocked preview),
 * show the demo button instead.
 */
function initGoogleButton() {
  const slot = $("#googleSlot");
  const fallback = $("#googleFallback");
  if (!slot || slot.dataset.ready) return;

  const googleReady = window.google && google.accounts && google.accounts.id;
  if (!googleReady) {
    googleAttempts += 1;
    if (googleAttempts < 12) return setTimeout(initGoogleButton, 400);
    if (fallback) fallback.hidden = false;
    return;
  }

  slot.dataset.ready = "1";
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    ux_mode: "popup"
  });
  google.accounts.id.renderButton(slot, {
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 340
  });
  if (fallback) fallback.hidden = true;
}

/** Demo account used when Google's script cannot load */
function signInAsDemoUser() {
  const email = "demo@velox.test";
  if (!db.users[email]) {
    db.users[email] = {
      username: email,
      name: "Demo Rider",
      email,
      provider: "google",
      cart: [],
      wishlist: [],
      orders: [],
      preferences: { news: true, orderUpdates: true }
    };
  }
  logIn(email);
}

/* ---------- 13. Order progress ---------- */

/** 0 to 3 for the current stage, or -1 when cancelled */
function orderStage(order) {
  if (order.cancelled) return -1;
  return Math.min(ORDER_STAGES.length - 1, Math.floor((Date.now() - order.createdAt) / ORDER_STEP_MS));
}

function progressHTML(order) {
  if (order.cancelled) return `<p class="muted">Cancelled</p>`;
  const stage = orderStage(order);
  return `
  <div class="progress">
    ${ORDER_STAGES.map((label, index) => `
      <div class="step${index <= stage ? " done" : ""}">
        <span class="bar"></span>
        <span>${label}</span>
      </div>`).join("")}
  </div>`;
}

/** Update progress bars for orders on screen. Only changed bars are redrawn. */
function updateOrderProgress() {
  if (state.route !== "orders") return;
  const account = currentAccount();
  $$(".order-progress").forEach(container => {
    const order = account.orders.find(item => item.id === container.dataset.orderId);
    if (!order) return;
    const stage = String(orderStage(order));
    if (container.dataset.stage !== stage) {
      container.dataset.stage = stage;
      container.innerHTML = progressHTML(order);
    }
  });
}

/* ---------- 14. Navigation, floating cart and animations ---------- */

/** Redraw the product grid on the shop page (keeps the search box focused) */
function renderProductGrid() {
  const grid = $("#productGrid");
  if (!grid) return;

  const query = state.search.trim().toLowerCase();
  let products = PRODUCTS.filter(product =>
    (state.typeFilter === "All" || product.type === state.typeFilter) &&
    (state.typeFilter !== "Parts" || state.partFilter === "All" || product.sub === state.partFilter) &&
    PRICE_TESTS[state.priceFilter](product.price) &&
    (!query || [product.name, product.type, product.sub].join(" ").toLowerCase().includes(query))
  );

  const sorters = {
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating
  };
  products = products.sort(sorters[state.sort] || ((a, b) => a.id - b.id));

  grid.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<p class="muted" style="grid-column:1/-1;text-align:center;padding:40px 0">No products match those filters.</p>`;

  const count = $("#resultCount");
  if (count) count.textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  observeReveals();
}

/** Update the menu links and their counts */
function updateNavigation() {
  const nav = $("#siteNav");
  if (!nav) return;

  const links = [
    ["home", "Home"],
    ["shop", "Shop"],
    ["wishlist", "Wishlist", currentAccount().wishlist.length],
    ["cart", "Cart", cartCount()],
    ["orders", "Orders"]
  ];
  const accountLink = isSignedIn()
    ? ["account", escapeHtml(db.users[db.session].name.split(" ")[0])]
    : ["signin", "Sign in"];
  links.push(accountLink);

  nav.innerHTML = links.map(([route, label, count]) => `
    <a class="nav-link${state.route === route ? " is-active" : ""}" href="#${route}">
      ${label}${count ? `<span class="badge">${count}</span>` : ""}
    </a>`).join("");
}

/** Show or hide the floating cart, and bump it when items are added */
function updateFloatingCart() {
  const button = $("#fab");
  if (!button) return;

  const count = cartCount();
  $("#fabCount").textContent = count;
  button.classList.toggle("hide", state.route === "cart");

  if (count > state.lastCartCount) {
    button.classList.remove("is-bumping");
    void button.offsetWidth;
    button.classList.add("is-bumping");
  }
  state.lastCartCount = count;
}

let toastTimer;
/** Show a short message at the bottom of the screen */
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

/** Fade in elements with the .reveal class as they scroll into view */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

function observeReveals() {
  $$(".reveal:not(.is-visible)").forEach(element => revealObserver.observe(element));
}

/** Mobile menu open and close */
function setupMenu() {
  const toggle = $("#menuToggle");
  const nav = $("#siteNav");

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the menu after a link is tapped
  nav.addEventListener("click", event => {
    if (event.target.closest("a")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

/** Intro animation: hides after a few seconds, or immediately on click */
function setupIntro() {
  const intro = $("#intro");
  const hideIntro = () => intro.classList.add("is-hidden");
  intro.addEventListener("click", hideIntro);
  setTimeout(hideIntro, 3400);
}

/* ---------- 15. Start-up ---------- */

window.addEventListener("hashchange", () => {
  render();
  initGoogleButton();
});

setupMenu();
setupIntro();
setInterval(updateOrderProgress, 2000);
render();
