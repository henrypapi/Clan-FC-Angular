// src/core/services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  productoId: number;
  cantidad: number;
  nombre: string;
  sku: string;
  precioBase: number;
  emoji: string;
  stockMax: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly CART_KEY = 'tm_carrito';

  readonly items = signal<CartItem[]>(this.loadCart());
  
  // Estos valores se recalculan solos cuando 'items' cambia
  readonly totalUnits = computed(() => this.items().reduce((acc, item) => acc + item.cantidad, 0));
  readonly subtotalBase = computed(() => this.items().reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0));

// ... (resto del código del CartService)

  private loadCart(): CartItem[] {
    // FIX: Previene la ejecución en SSR
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(this.CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveCart(newItems: CartItem[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CART_KEY, JSON.stringify(newItems));
    }
    this.items.set(newItems);
  }

  add(producto: any, cantidad = 1) {
    const current = this.items();
    const existing = current.find(i => i.productoId === producto.idProducto);
    const stockMax = Number(producto.stock) || 0;

    if (existing) {
      if (existing.cantidad >= stockMax) {
        throw new Error(`Solo hay ${stockMax} unidad(es) de "${producto.nombre}"`);
      }
      existing.cantidad = Math.min(existing.cantidad + cantidad, stockMax);
      this.saveCart([...current]);
    } else {
      if (stockMax < 1) throw new Error(`"${producto.nombre}" está agotado`);
      this.saveCart([...current, {
        productoId: producto.idProducto,
        cantidad: Math.min(cantidad, stockMax),
        nombre: producto.nombre,
        sku: producto.sku,
        precioBase: Number(producto.precioBase),
        emoji: producto._emoji ?? '🛍️',
        stockMax
      }]);
    }
  }

  changeQuantity(productoId: number, qty: number) {
    let current = this.items();
    const item = current.find(i => i.productoId === productoId);
    if (!item) return;

    if (qty <= 0) {
      this.remove(productoId);
    } else {
      item.cantidad = Math.min(qty, item.stockMax ?? 99);
      this.saveCart([...current]);
    }
  }

  remove(productoId: number) {
    this.saveCart(this.items().filter(i => i.productoId !== productoId));
  }

  clear() {
    this.saveCart([]);
  }
}