'use strict';
import { storage, toast } from './utils.js';

const CART_KEY = 'cart_items';
const WISHLIST_KEY = 'wishlist_items';

function getCart(){ return storage.get(CART_KEY, []) }
function saveCart(items){ storage.set(CART_KEY, items) }
function addToCart(item){ const items=getCart(); const idx=items.findIndex(i=>i.id===item.id); if(idx>-1){ items[idx].qty+=item.qty||1 } else { items.push({...item, qty:item.qty||1}) } saveCart(items); toast('Added to cart') }
function removeFromCart(id){ saveCart(getCart().filter(i=>i.id!==id)); toast('Removed from cart') }
function updateQty(id, qty){ const items=getCart().map(i=> i.id===id? {...i, qty:Math.max(1, qty)} : i ); saveCart(items) }
function clearCart(){ storage.remove(CART_KEY) }

function getWishlist(){ return storage.get(WISHLIST_KEY, []) }
function toggleWishlist(id){ let wl=getWishlist(); if(wl.includes(id)){ wl=wl.filter(x=>x!==id); toast('Removed from wishlist') } else { wl=[id, ...wl]; toast('Saved to wishlist') } storage.set(WISHLIST_KEY, wl); return wl }
function inWishlist(id){ return getWishlist().includes(id) }

export { getCart, saveCart, addToCart, removeFromCart, updateQty, clearCart, getWishlist, toggleWishlist, inWishlist };
