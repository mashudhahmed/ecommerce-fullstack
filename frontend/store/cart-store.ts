import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isSynced: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncWithServer: (serverItems: CartItem[]) => void;
  setSynced: () => void;
  resetSync: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isSynced: false,

      // ✅ Authoritative server sync for authenticated sessions
      syncWithServer: (serverItems: CartItem[]) => {
        set({ items: Array.isArray(serverItems) ? serverItems : [], isSynced: true });
      },

      setSynced: () => set({ isSynced: true }),
      resetSync: () => set({ isSynced: false }),

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product.id === product.id);
        const price = Number(product.price) || 0;

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          if (product.stock !== undefined && newQuantity > product.stock) {
            throw new Error('Not enough stock available');
          }
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: newQuantity, subtotal: price * newQuantity }
                : item
            ),
          });
        } else {
          if (product.stock !== undefined && quantity > product.stock) {
            throw new Error('Not enough stock available');
          }
          set({
            items: [
              ...items,
              {
                id: Date.now(),
                product,
                quantity,
                subtotal: price * quantity,
              },
            ],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const item = get().items.find((i) => i.product.id === productId);
        if (!item) return;

        if (item.product?.stock !== undefined && quantity > item.product.stock) {
          throw new Error('Not enough stock available');
        }

        const price = Number(item.product?.price) || 0;

        set({
          items: get().items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, subtotal: price * quantity }
              : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return (
          Math.round(
            get().items.reduce((total, item) => {
              const itemPrice = Number(item.product?.price) || 0;
              const subtotal = item.subtotal !== undefined ? item.subtotal : itemPrice * item.quantity;
              return total + subtotal;
            }, 0) * 100
          ) / 100
        );
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        isSynced: state.isSynced,
      }),
    }
  )
);