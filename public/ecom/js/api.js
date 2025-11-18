'use strict';
/* JSON file based fake API. All writes update localStorage mirrors, since browser can't write files. */
import { storage, uid } from './utils.js';

const DB = {
  productsPath: '/ecom/db/products.json',
  usersKey: 'db_users',
  ordersKey: 'db_orders',
  reviewsKey: 'db_reviews'
};

async function getProducts(){
  // Load base products from JSON once, then overlay admin edits from localStorage
  const base = await fetch(DB.productsPath, {cache:'no-store'}).then(r=>r.json());
  const edits = storage.get('db_products_edits', []);
  // apply edits (create/update/delete)
  const map = new Map(base.map(p=>[p.id, p]));
  for(const e of edits){
    if(e.action==='delete') map.delete(e.id);
    if(e.action==='create') map.set(e.data.id, e.data);
    if(e.action==='update') map.set(e.data.id, {...(map.get(e.data.id)||{}), ...e.data});
  }
  return [...map.values()];
}

function saveProduct(data){
  const edits = storage.get('db_products_edits', []);
  if(!data.id){ data.id = uid() }
  edits.push({action:'create', data});
  storage.set('db_products_edits', edits);
  return data;
}
function updateProduct(id, patch){
  const edits = storage.get('db_products_edits', []);
  edits.push({action:'update', data:{id, ...patch}});
  storage.set('db_products_edits', edits);
}
function deleteProduct(id){
  const edits = storage.get('db_products_edits', []);
  edits.push({action:'delete', id});
  storage.set('db_products_edits', edits);
}

// Users
function getUsers(){ return storage.get(DB.usersKey, []) }
function saveUser(user){ const users=getUsers(); users.push(user); storage.set(DB.usersKey, users); }
function findUserByEmail(email){ return getUsers().find(u=>u.email===email) }

// Orders
function getOrders(){ return storage.get(DB.ordersKey, []) }
function saveOrder(order){ const orders=getOrders(); orders.push(order); storage.set(DB.ordersKey, orders); }

// Reviews keyed by productId
function getReviews(){ return storage.get(DB.reviewsKey, {}) }
function addReview(productId, review){ const all = getReviews(); all[productId]=[...(all[productId]||[]), review]; storage.set(DB.reviewsKey, all); }

export { getProducts, saveProduct, updateProduct, deleteProduct, getUsers, saveUser, findUserByEmail, getOrders, saveOrder, getReviews, addReview };
