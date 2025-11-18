'use strict';
import { storage, uid, toast } from './utils.js';
import { saveUser, findUserByEmail } from './api.js';

const AUTH_KEY = 'auth_user';

function register({name, email, password}){
  if(findUserByEmail(email)) throw new Error('Email already registered');
  const user = { id: uid(), name, email, password, role:'user', createdAt: Date.now() };
  saveUser(user);
  storage.set(AUTH_KEY, {id:user.id, name:user.name, email:user.email, role:user.role});
  toast('Registration successful');
  return user;
}

function login({email, password}){
  const u = findUserByEmail(email);
  if(!u || u.password!==password) throw new Error('Invalid credentials');
  storage.set(AUTH_KEY, {id:u.id, name:u.name, email:u.email, role:u.role});
  toast('Welcome back, '+u.name.split(' ')[0]);
  return u;
}

function logout(){ storage.remove(AUTH_KEY); toast('Signed out') }
function currentUser(){ return storage.get(AUTH_KEY, null) }
function requireAdmin(){ const u=currentUser(); if(!u || u.role!=='admin') throw new Error('Admin only') }

export { register, login, logout, currentUser, requireAdmin };
