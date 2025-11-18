// Utilities and core data access for JSON-based pseudo-backend
// Data lives in /ecom/db/*.json and is fetched with GET. Writes are simulated
// by persisting to localStorage and returning merged results.

const DB = {
  products: '/ecom/db/products.json',
  users: '/ecom/db/users.json',
  cart: '/ecom/db/cart.json',
  orders: '/ecom/db/orders.json'
};

// LocalStorage keys
const LS = {
  cart: 'ec_cart',
  wishlist: 'ec_wishlist',
  user: 'ec_user',
  users: 'ec_users_override',
  orders: 'ec_orders_override',
  reviews: 'ec_reviews' // { [productId]: [{userId, rating, text, date}] }
};

export async function fetchJSON(path){
  const res = await fetch(path, { cache: 'no-store' });
  if(!res.ok) throw new Error('Failed to load '+path);
  return res.json();
}

export async function getProducts(){
  const base = await fetchJSON(DB.products);
  // Merge ratings from reviews local store
  const reviews = JSON.parse(localStorage.getItem(LS.reviews) || '{}');
  return base.map(p=>{
    const list = reviews[p.id] || [];
    if(list.length){
      const avg = list.reduce((a,b)=>a+b.rating,0)/list.length;
      return { ...p, rating: Math.round(avg*10)/10, reviewsCount: (p.reviewsCount||0)+list.length };
    }
    return p;
  });
}

export async function getProductById(id){
  const all = await getProducts();
  return all.find(p=>p.id===id);
}

export function searchProducts(all, q){
  if(!q) return [];
  const s = q.toLowerCase();
  return all.filter(p => p.title.toLowerCase().includes(s) || p.tags?.some(t=>t.toLowerCase().includes(s))).slice(0,6);
}

// Users (JSON + local overrides)
export async function getUsers(){
  const base = await fetchJSON(DB.users).catch(()=>[]);
  const override = JSON.parse(localStorage.getItem(LS.users) || '[]');
  // Merge unique by email
  const map = new Map();
  [...base, ...override].forEach(u=>map.set(u.email, u));
  return Array.from(map.values());
}

export async function registerUser(payload){
  const users = await getUsers();
  if(users.some(u=>u.email===payload.email)){
    throw new Error('Email already registered');
  }
  const newUser = { id: 'u'+Date.now(), role:'customer', createdAt: new Date().toISOString(), ...payload };
  const override = JSON.parse(localStorage.getItem(LS.users) || '[]');
  override.push(newUser);
  localStorage.setItem(LS.users, JSON.stringify(override));
  localStorage.setItem(LS.user, JSON.stringify({ id:newUser.id, email:newUser.email, name:newUser.name, role:newUser.role }));
  return newUser;
}

export async function loginUser(email, password){
  const users = await getUsers();
  const found = users.find(u=>u.email===email && u.password===password);
  if(!found) throw new Error('Invalid credentials');
  localStorage.setItem(LS.user, JSON.stringify({ id:found.id, email:found.email, name:found.name, role:found.role }));
  return found;
}

export function logoutUser(){ localStorage.removeItem(LS.user); }
export function getCurrentUser(){ try{ return JSON.parse(localStorage.getItem(LS.user)||'null'); }catch{return null;}}

// Cart
export function readCart(){ try{ return JSON.parse(localStorage.getItem(LS.cart)||'[]'); }catch{return [];} }
export function writeCart(cart){ localStorage.setItem(LS.cart, JSON.stringify(cart)); }
export function addToCart(item){ const cart = readCart(); const i = cart.findIndex(c=>c.id===item.id); if(i>-1){ cart[i].qty += item.qty||1; } else { cart.push({ ...item, qty:item.qty||1 }); } writeCart(cart); return cart; }
export function updateQty(id, qty){ const cart = readCart().map(c => c.id===id?{...c, qty:Math.max(1, qty)}:c); writeCart(cart); return cart; }
export function removeFromCart(id){ const cart = readCart().filter(c=>c.id!==id); writeCart(cart); return cart; }
export function clearCart(){ writeCart([]); }

// Wishlist
export function readWishlist(){ try{ return JSON.parse(localStorage.getItem(LS.wishlist)||'[]'); }catch{return [];} }
export function toggleWishlist(id){ const list = readWishlist(); const i = list.indexOf(id); if(i>-1) list.splice(i,1); else list.push(id); localStorage.setItem(LS.wishlist, JSON.stringify(list)); return list; }
export function inWishlist(id){ return readWishlist().includes(id); }

// Reviews (stored locally)
export function addReview(productId, review){
  const map = JSON.parse(localStorage.getItem(LS.reviews) || '{}');
  map[productId] = map[productId] || [];
  map[productId].push({ ...review, id:'r'+Date.now(), date:new Date().toISOString() });
  localStorage.setItem(LS.reviews, JSON.stringify(map));
  return map[productId];
}
export function getReviews(productId){ const map = JSON.parse(localStorage.getItem(LS.reviews) || '{}'); return map[productId]||[]; }

// Orders (JSON + overrides)
export async function getOrders(){
  const base = await fetchJSON(DB.orders).catch(()=>[]);
  const override = JSON.parse(localStorage.getItem(LS.orders) || '[]');
  return [...base, ...override];
}

export async function placeOrder(order){
  const newOrder = { id:'o'+Date.now(), createdAt: new Date().toISOString(), status:'processing', ...order };
  const override = JSON.parse(localStorage.getItem(LS.orders) || '[]');
  override.push(newOrder);
  localStorage.setItem(LS.orders, JSON.stringify(override));
  return newOrder;
}

// Admin: CRUD products (override layer only)
const LS_PRODUCTS = 'ec_products_override';
export async function getAllProductsMerged(){
  const base = await fetchJSON(DB.products);
  const override = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
  const map = new Map();
  base.forEach(p=>map.set(p.id,p));
  override.forEach(p=>map.set(p.id,p));
  return Array.from(map.values());
}
export function adminSaveProduct(product){
  const list = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
  let idx = list.findIndex(p=>p.id===product.id);
  if(idx===-1){ list.push(product.id?product:{...product, id:'p'+Date.now()}); }
  else { list[idx] = product; }
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
  return product;
}
export function adminDeleteProduct(id){
  const list = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]').filter(p=>p.id!==id);
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
}

// Formatters
export const fmt = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' });

export function el(tag, cls, children){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(typeof children === 'string') e.textContent = children;
  else if(Array.isArray(children)) children.forEach(c=> e.appendChild(c));
  return e;
}

export function ratingStars(r){
  const full = Math.floor(r);
  const half = r - full >= .5;
  let out = '';
  for(let i=0;i<full;i++) out += '★';
  if(half) out += '☆';
  for(let i=out.length;i<5;i++) out += '✩';
  return out;
}

export function toast(msg){
  const t = el('div','toast',msg);
  Object.assign(t.style,{position:'fixed',bottom:'20px',right:'20px',background:'rgba(15,23,42,.9)',color:'#fff',padding:'10px 14px',borderRadius:'10px',zIndex:9999});
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}

export function toggleTheme(){
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('ec_theme', dark?'dark':'light');
}
export function loadTheme(){
  const t = localStorage.getItem('ec_theme');
  if(t==='dark') document.documentElement.classList.add('dark');
}
