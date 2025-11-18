import { getProducts, getProductById, searchProducts, fmt, ratingStars, addToCart, readCart, updateQty, removeFromCart, clearCart, readWishlist, toggleWishlist, inWishlist, addReview, getReviews, getUsers, registerUser, loginUser, logoutUser, getCurrentUser, placeOrder, getOrders, getAllProductsMerged, adminSaveProduct, adminDeleteProduct, fetchJSON, loadTheme, toggleTheme } from './utils.js';

// Router (hash-based)
const routes = {
  '': renderHome,
  '#/': renderHome,
  '#/products': renderProducts,
  '#/product': renderProductDetail,
  '#/cart': renderCart,
  '#/checkout': renderCheckout,
  '#/order': renderOrderSummary,
  '#/auth': renderAuth,
  '#/dashboard': renderDashboard,
  '#/admin': renderAdmin
};

window.addEventListener('hashchange', () => mount());
window.addEventListener('DOMContentLoaded', () => { loadTheme(); mount(); });

function mount(){
  const hash = window.location.hash || '#/' ;
  const base = hash.split('?')[0];
  const view = routes[base] || renderNotFound;
  renderLayout(view);
}

function renderLayout(view){
  document.body.innerHTML = '';
  document.body.appendChild(header());
  const main = document.createElement('main');
  main.className = 'container';
  view(main);
  document.body.appendChild(main);
  document.body.appendChild(footer());
}

function header(){
  const wrap = document.createElement('header');
  wrap.className = 'header';
  wrap.innerHTML = `
    <div class="container nav">
      <a href="#/" class="logo" aria-label="Home">
        <span class="brand-mark"></span>
        <span>VistaStore</span>
        <span class="badge">Beta</span>
      </a>
      <div class="search">
        <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input id="searchInput" placeholder="Search products, brands and more" aria-label="Search" />
        <ul id="searchSuggest" class="search-suggest" role="listbox"></ul>
      </div>
      <div class="actions">
        <button id="themeToggle" class="icon-btn" title="Toggle dark mode">🌓</button>
        <a href="#/wishlist" class="icon-btn" title="Wishlist">❤</a>
        <a href="#/cart" class="icon-btn" title="Cart">🛒<span id="cartCount" class="badge" style="position:relative; left:-6px; top:-10px">0</span></a>
        <a href="#/auth" class="icon-btn" title="Account">👤</a>
      </div>
    </div>
    <div class="container" style="padding-bottom:.75rem;">
      <nav style="display:flex; gap:.75rem; flex-wrap:wrap;">
        <a href="#/products?cat=All" class="badge">All</a>
        <a href="#/products?cat=Audio" class="badge">Audio</a>
        <a href="#/products?cat=Mobile" class="badge">Mobile</a>
        <a href="#/products?cat=Wearables" class="badge">Wearables</a>
        <a href="#/products?cat=PC%20Accessories" class="badge">PC Accessories</a>
        <a href="#/products?cat=TV%20&%20Home%20Theater" class="badge">TV & Home Theater</a>
      </nav>
    </div>
  `;

  // Search behavior
  (async ()=>{
    const all = await getProducts();
    const input = wrap.querySelector('#searchInput');
    const list = wrap.querySelector('#searchSuggest');
    input.addEventListener('input', ()=>{
      const s = searchProducts(all, input.value);
      list.innerHTML = s.map(p=>`<li role="option" data-id="${p.id}">${p.title}</li>`).join('');
      list.classList.toggle('active', s.length>0);
    });
    list.addEventListener('click', (e)=>{
      const id = e.target.getAttribute('data-id');
      if(id){ window.location.hash = `#/product?id=${id}`; list.classList.remove('active'); input.value=''; }
    });
  })();

  wrap.querySelector('#themeToggle').addEventListener('click', ()=>{ toggleTheme(); });

  // Cart count
  const count = readCart().reduce((a,b)=>a+b.qty,0);
  wrap.querySelector('#cartCount').textContent = count;

  return wrap;
}

function footer(){
  const f = document.createElement('footer');
  f.className = 'footer';
  f.innerHTML = `<div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
    <div>© ${new Date().getFullYear()} VistaStore</div>
    <div style="display:flex; gap:.75rem;">
      <a class="badge" href="#/admin">Admin</a>
      <a class="badge" href="#/dashboard">Dashboard</a>
    </div>
  </div>`;
  return f;
}

async function renderHome(root){
  const products = await getProducts();
  const featured = products.filter(p=>p.featured);
  root.innerHTML = `
    <section class="hero">
      <div class="hero-card">
        <span class="badge">New Season</span>
        <h1 style="font-size: clamp(28px, 3vw, 40px); margin:0;">Elevate your everyday tech</h1>
        <p style="color:var(--muted)">Discover curated gadgets that blend performance with beautiful design.</p>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <a href="#/products" class="btn">Shop now</a>
          <a href="#/products?sort=popular" class="btn outline">Trending</a>
        </div>
      </div>
      <div class="hero-large">
        <div class="placeholder"></div>
      </div>
    </section>

    <section style="margin-top: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: .75rem;">
        <h2>Featured</h2>
        <a class="btn ghost" href="#/products">View all →</a>
      </div>
      <div class="grid cols-4" id="featuredGrid"></div>
    </section>
  `;

  const grid = root.querySelector('#featuredGrid');
  featured.forEach(p => grid.appendChild(productCard(p)));
}

function productCard(p){
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="media"><div class="ph"></div></div>
    <div class="content">
      <div class="title">${p.title}</div>
      <div style="color:var(--muted); font-size:.9rem;">${ratingStars(p.rating)} <span>(${p.reviewsCount})</span></div>
      <div class="price"><strong>${fmt.format(p.price)}</strong> <span class="old">${p.compareAt?fmt.format(p.compareAt):''}</span></div>
    </div>
    <div class="footer">
      <a class="btn" href="#/product?id=${p.id}">View</a>
      <button class="btn outline add">Add to cart</button>
      <button class="icon-btn wish" title="Wishlist">${inWishlist(p.id)?'❤':'♡'}</button>
    </div>
  `;
  card.querySelector('.add').addEventListener('click', ()=>{ addToCart({ id:p.id, title:p.title, price:p.price }); toast('Added to cart'); mount(); });
  card.querySelector('.wish').addEventListener('click', (e)=>{ toggleWishlist(p.id); e.currentTarget.textContent = inWishlist(p.id)?'❤':'♡'; });
  return card;
}

async function renderProducts(root){
  const url = new URL(window.location.href);
  const cat = url.searchParams.get('cat') || 'All';
  const sort = url.searchParams.get('sort') || 'popular';
  const min = parseFloat(url.searchParams.get('min')||'0');
  const max = parseFloat(url.searchParams.get('max')||'9999');
  const rating = parseFloat(url.searchParams.get('rating')||'0');

  const all = await getProducts();
  let list = all.filter(p => (cat==='All'||p.category===cat) && p.price>=min && p.price<=max && p.rating>=rating);
  if(sort==='lth') list.sort((a,b)=>a.price-b.price);
  else if(sort==='htl') list.sort((a,b)=>b.price-a.price);
  else if(sort==='popular') list.sort((a,b)=>b.reviewsCount-a.reviewsCount);

  root.innerHTML = `
    <section class="controls">
      <div class="filters">
        <select id="cat" class="select">
          ${['All','Audio','Mobile','Wearables','PC Accessories','TV & Home Theater'].map(c=>`<option ${c===cat?'selected':''}>${c}</option>`).join('')}
        </select>
        <div class="range">
          <label>Min</label><input id="min" class="input" type="number" value="${isNaN(min)?0:min}" style="width:100px">
          <label>Max</label><input id="max" class="input" type="number" value="${isNaN(max)?9999:max}" style="width:100px">
          <label>Rating</label>
          <select id="rat" class="select">
            ${[0,3,4,4.5].map(r=>`<option value="${r}" ${r===rating?'selected':''}>${r}+</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <select id="sort" class="select">
          <option value="popular" ${sort==='popular'?'selected':''}>Popularity</option>
          <option value="lth" ${sort==='lth'?'selected':''}>Price: Low → High</option>
          <option value="htl" ${sort==='htl'?'selected':''}>Price: High → Low</option>
        </select>
      </div>
    </section>
    <div class="grid cols-4" id="grid"></div>
  `;

  const grid = root.querySelector('#grid');
  list.forEach(p=> grid.appendChild(productCard(p)));

  root.querySelector('#cat').addEventListener('change', e=> updateQuery({cat:e.target.value}));
  root.querySelector('#sort').addEventListener('change', e=> updateQuery({sort:e.target.value}));
  root.querySelector('#min').addEventListener('change', e=> updateQuery({min:e.target.value}));
  root.querySelector('#max').addEventListener('change', e=> updateQuery({max:e.target.value}));
  root.querySelector('#rat').addEventListener('change', e=> updateQuery({rating:e.target.value}));
}

function updateQuery(obj){
  const url = new URL(window.location.href);
  Object.entries(obj).forEach(([k,v])=> url.searchParams.set(k,v));
  window.location.hash = url.hash;
}

async function renderProductDetail(root){
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');
  const p = await getProductById(id);
  if(!p){ root.innerHTML = '<p>Product not found.</p>'; return; }

  root.innerHTML = `
    <section class="grid cols-2" style="margin-top:1rem; align-items:start;">
      <div class="card">
        <div class="media" style="height:340px"><div class="ph"></div></div>
        <div style="display:flex; gap:.5rem; padding: .75rem;">
          ${p.images.map(()=>'<div class="media" style="height:60px; flex:1"><div class="ph"></div></div>').join('')}
        </div>
      </div>
      <div class="card" style="padding:1rem; gap:.75rem;">
        <div class="title" style="font-size:1.4rem;">${p.title}</div>
        <div style="color:var(--muted)">${ratingStars(p.rating)} <span>(${p.reviewsCount})</span></div>
        <div class="price"><strong style="font-size:1.2rem;">${fmt.format(p.price)}</strong> <span class="old">${p.compareAt?fmt.format(p.compareAt):''}</span></div>
        <p style="color:var(--muted)">${p.description}</p>
        <div style="display:flex; gap:.5rem;">
          <button id="addCart" class="btn">Add to cart</button>
          <button id="wish" class="btn outline">${inWishlist(p.id)?'♥ In wishlist':'♡ Add to wishlist'}</button>
        </div>
      </div>
    </section>

    <section style="margin-top:1rem;" class="card">
      <div style="padding:1rem; border-bottom:1px solid rgba(15,23,42,.08); display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Reviews</h3>
        <button id="addReviewBtn" class="btn outline">Write a review</button>
      </div>
      <div id="reviews" style="padding:1rem;"></div>
    </section>
  `;

  root.querySelector('#addCart').addEventListener('click', ()=>{ addToCart({id:p.id, title:p.title, price:p.price}); toast('Added to cart'); mount();});
  root.querySelector('#wish').addEventListener('click', (e)=>{ toggleWishlist(p.id); e.currentTarget.textContent = inWishlist(p.id)?'♥ In wishlist':'♡ Add to wishlist'; });

  const list = getReviews(p.id);
  renderReviews(list);

  root.querySelector('#addReviewBtn').addEventListener('click', ()=>{
    const name = prompt('Your name');
    const rating = parseFloat(prompt('Rating (1-5)'));
    const text = prompt('Your review');
    if(!name || !rating || !text) return;
    const items = addReview(p.id, { user:name, rating, text });
    renderReviews(items);
  });

  function renderReviews(items){
    const box = root.querySelector('#reviews');
    if(!items.length){ box.innerHTML = '<p>No reviews yet.</p>'; return; }
    box.innerHTML = items.map(r=>`<div style="padding:.75rem 0; border-bottom:1px dashed rgba(15,23,42,.08);">
      <div style="font-weight:700">${r.user}</div>
      <div style="color:var(--muted)">${ratingStars(r.rating)}</div>
      <p>${r.text}</p>
    </div>`).join('');
  }
}

async function renderCart(root){
  const cart = readCart();
  const products = await getProducts();
  const items = cart.map(c=> ({ ...c, product: products.find(p=>p.id===c.id) })).filter(i=>!!i.product);
  const total = items.reduce((a,b)=>a + b.qty * b.product.price, 0);

  root.innerHTML = `
    <h2>Shopping Cart</h2>
    <div class="grid cols-3" style="align-items:start;">
      <div class="card" style="grid-column: span 2;">
        <div style="padding:1rem; display:grid; gap:1rem;" id="list"></div>
      </div>
      <div class="card" style="padding:1rem;">
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>Total</span><span>${fmt.format(total)}</span>
        </div>
        <a class="btn block" href="#/checkout" style="margin-top:1rem;">Proceed to checkout</a>
        <button id="clear" class="btn ghost" style="margin-top:.5rem;">Clear cart</button>
      </div>
    </div>
  `;

  const list = root.querySelector('#list');
  if(!items.length){ list.innerHTML = '<p style="padding:1rem;">Your cart is empty.</p>'; return; }
  items.forEach(i=>{
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="media" style="height:120px"><div class="ph"></div></div>
      <div class="content">
        <div class="title">${i.product.title}</div>
        <div class="price">${fmt.format(i.product.price)}</div>
        <div style="display:flex; gap:.5rem; align-items:center;">
          <label>Qty</label>
          <input type="number" min="1" value="${i.qty}" style="width:70px" />
          <button class="btn outline rm">Remove</button>
        </div>
      </div>
    `;
    row.querySelector('input').addEventListener('change', e=>{ updateQty(i.id, parseInt(e.target.value||'1')); mount(); });
    row.querySelector('.rm').addEventListener('click', ()=>{ removeFromCart(i.id); mount(); });
    list.appendChild(row);
  });

  root.querySelector('#clear').addEventListener('click', ()=>{ clearCart(); mount(); });
}

function requireAuth(){
  const u = getCurrentUser();
  if(!u){ window.location.hash = '#/auth?next='+encodeURIComponent(window.location.hash); return null; }
  return u;
}

async function renderCheckout(root){
  const user = requireAuth(); if(!user) return;
  const cart = readCart(); if(!cart.length){ root.innerHTML='<p>Your cart is empty.</p>'; return; }

  root.innerHTML = `
    <h2>Checkout</h2>
    <div class="grid cols-2">
      <form id="form" class="card" style="padding:1rem; display:grid; gap:.75rem;">
        <div class="grid cols-2">
          <div><label>Name</label><input name="name" class="input" required value="${user.name||''}"></div>
          <div><label>Email</label><input name="email" type="email" class="input" required value="${user.email}"></div>
        </div>
        <div><label>Address</label><input name="address" class="input" required placeholder="123 Main St"></div>
        <div class="grid cols-3">
          <div><label>City</label><input name="city" class="input" required></div>
          <div><label>State</label><input name="state" class="input" required></div>
          <div><label>ZIP</label><input name="zip" class="input" pattern="\\d{5}" required></div>
        </div>
        <div class="grid cols-2">
          <div><label>Card number</label><input name="card" class="input" pattern="\\d{16}" required></div>
          <div><label>CVV</label><input name="cvv" class="input" pattern="\\d{3}" required></div>
        </div>
        <button class="btn">Place order</button>
      </form>
      <div class="card" style="padding:1rem;">
        <h3>Summary</h3>
        <div id="summary"></div>
      </div>
    </div>
  `;

  const products = await getProducts();
  const items = cart.map(c=> ({ ...c, product: products.find(p=>p.id===c.id) })).filter(i=>!!i.product);
  const total = items.reduce((a,b)=>a + b.qty * b.product.price, 0);
  const sum = root.querySelector('#summary');
  sum.innerHTML = items.map(i=>`<div style="display:flex; justify-content:space-between;"><span>${i.product.title} × ${i.qty}</span><span>${fmt.format(i.product.price*i.qty)}</span></div>`).join('') +
    `<div style="margin-top:.75rem; display:flex; justify-content:space-between; font-weight:700;"><span>Total</span><span>${fmt.format(total)}</span></div>`;

  root.querySelector('#form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const order = await placeOrder({ userId:user.id, items:cart, total, shipping:data });
    clearCart();
    window.location.hash = '#/order?id='+order.id;
  });
}

async function renderOrderSummary(root){
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');
  const all = await getOrders();
  const order = all.find(o=>o.id===id);
  if(!order){ root.innerHTML = '<p>Order not found.</p>'; return; }
  root.innerHTML = `
    <div class="card" style="padding:1rem; margin-top:1rem;">
      <h2>Thank you! 🎉</h2>
      <p>Your order <strong>${order.id}</strong> was placed successfully.</p>
      <div style="margin:.5rem 0;">Total: <strong>${fmt.format(order.total)}</strong></div>
      <a class="btn" href="#/">Continue shopping</a>
    </div>
  `;
}

async function renderAuth(root){
  const url = new URL(window.location.href);
  const next = url.searchParams.get('next') || '#/';
  const user = getCurrentUser();
  if(user){
    root.innerHTML = `<div class="card" style="padding:1rem; margin-top:1rem;">
      <p>Signed in as <strong>${user.email}</strong></p>
      <div style="display:flex; gap:.5rem;">
        <a class="btn" href="${next}">Continue</a>
        <button id="logout" class="btn outline">Logout</button>
      </div>
    </div>`;
    root.querySelector('#logout').addEventListener('click', ()=>{ logoutUser(); mount(); });
    return;
  }

  root.innerHTML = `
    <div class="grid cols-2" style="margin-top:1rem; align-items:start;">
      <form id="login" class="card" style="padding:1rem; display:grid; gap:.5rem;">
        <h3>Login</h3>
        <input name="email" class="input" type="email" placeholder="Email" required>
        <input name="password" class="input" type="password" placeholder="Password" required>
        <button class="btn">Login</button>
      </form>
      <form id="register" class="card" style="padding:1rem; display:grid; gap:.5rem;">
        <h3>Create account</h3>
        <input name="name" class="input" placeholder="Name" required>
        <input name="email" class="input" type="email" placeholder="Email" required>
        <input name="password" class="input" type="password" placeholder="Password" minlength="6" required>
        <button class="btn">Register</button>
      </form>
    </div>
  `;

  root.querySelector('#login').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try{ await loginUser(data.email, data.password); window.location.hash = next; }
    catch(err){ alert(err.message); }
  });

  root.querySelector('#register').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try{ await registerUser(data); window.location.hash = next; }
    catch(err){ alert(err.message); }
  });
}

async function renderDashboard(root){
  const user = requireAuth(); if(!user) return;
  const orders = (await getOrders()).filter(o=>o.userId===user.id);

  root.innerHTML = `
    <h2>Dashboard</h2>
    <div class="grid cols-2">
      <div class="card" style="padding:1rem;">
        <h3>Orders</h3>
        <div id="orders"></div>
      </div>
      <div class="card" style="padding:1rem;">
        <h3>Profile</h3>
        <p><strong>Name:</strong> ${user.name||'-'}</p>
        <p><strong>Email:</strong> ${user.email}</p>
      </div>
    </div>
  `;

  const box = root.querySelector('#orders');
  if(!orders.length){ box.innerHTML = '<p>No orders yet.</p>'; }
  else box.innerHTML = orders.map(o=>`<div class="card" style="padding:1rem; margin:.5rem 0;">
    <div style="display:flex; justify-content:space-between;"><span>${o.id}</span><span>${new Date(o.createdAt).toLocaleString()}</span></div>
    <div>Status: ${o.status}</div>
    <div>Total: <strong>${fmt.format(o.total)}</strong></div>
  </div>`).join('');
}

async function renderAdmin(root){
  const user = getCurrentUser();
  if(!user || user.role!=='admin'){
    root.innerHTML = `<div class="card" style="padding:1rem; margin-top:1rem;">
      <h3>Admin only</h3>
      <p>Sign in as admin. Tip: register and then set role to admin via localStorage for demo: localStorage.setItem('ec_user', JSON.stringify({...JSON.parse(localStorage.ec_user), role:'admin'}))</p>
      <a class="btn" href="#/auth?next=%23%2Fadmin">Sign in</a>
    </div>`;
    return;
  }

  const list = await getAllProductsMerged();
  root.innerHTML = `
    <h2>Admin Panel</h2>
    <div class="grid cols-2" style="align-items:start;">
      <div class="card" style="padding:1rem;">
        <h3>Products</h3>
        <div id="plist"></div>
      </div>
      <form id="pform" class="card" style="padding:1rem; display:grid; gap:.5rem;">
        <h3>Editor</h3>
        <input name="id" class="input" placeholder="ID (leave blank to create)">
        <input name="title" class="input" placeholder="Title" required>
        <input name="price" type="number" step="0.01" class="input" placeholder="Price" required>
        <input name="category" class="input" placeholder="Category">
        <textarea name="description" class="input" placeholder="Description"></textarea>
        <button class="btn">Save</button>
      </form>
    </div>
  `;

  const plist = root.querySelector('#plist');
  function render(){
    plist.innerHTML = list.map(p=>`<div class="card" style="padding:1rem; margin:.5rem 0;">
      <div style="font-weight:700">${p.title}</div>
      <div>${fmt.format(p.price)}</div>
      <div style="display:flex; gap:.5rem;">
        <button class="btn outline edit" data-id="${p.id}">Edit</button>
        <button class="btn outline del" data-id="${p.id}">Delete</button>
      </div>
    </div>`).join('');

    plist.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', ()=>{
      const p = list.find(i=>i.id===b.getAttribute('data-id'));
      const f = root.querySelector('#pform');
      f.id.value = p.id; f.title.value=p.title; f.price.value=p.price; f.category.value=p.category||''; f.description.value=p.description||'';
    }));
    plist.querySelectorAll('.del').forEach(b=>b.addEventListener('click', ()=>{
      if(confirm('Delete this product?')){ adminDeleteProduct(b.getAttribute('data-id')); toast('Deleted (override)'); mount(); }
    }));
  }
  render();

  root.querySelector('#pform').addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    data.price = parseFloat(data.price);
    if(!data.id) data.id = 'p'+Date.now();
    adminSaveProduct(data);
    toast('Saved (override)');
    mount();
  });
}

function renderNotFound(root){
  root.innerHTML = '<div class="card" style="padding:1rem; margin-top:1rem;">Page not found.</div>';
}
