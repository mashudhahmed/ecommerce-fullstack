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
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isSynced: false,

      // ✅ Sync with server
      syncWithServer: (serverItems: CartItem[]) => {
        const localItems = get().items;
        const mergedItems = [...serverItems];

        // Add local items that aren't on server
        localItems.forEach((localItem) => {
          const exists = serverItems.some(
            (item) => item.product.id === localItem.product.id
          );
          if (!exists) {
            mergedItems.push(localItem);
          }
        });

        set({ items: mergedItems, isSynced: true });
      },

      setSynced: () => set({ isSynced: true }),

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product.id === product.id);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          if (newQuantity > product.stock) {
            throw new Error('Not enough stock available');
          }
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: newQuantity, subtotal: product.price * newQuantity }
                : item
            ),
          });
        } else {
          if (quantity > product.stock) {
            throw new Error('Not enough stock available');
          }
          set({
            items: [
              ...items,
              {
                id: Date.now(),
                product,
                quantity,
                subtotal: product.price * quantity,
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

        if (quantity > item.product.stock) {
          throw new Error('Not enough stock available');
        }

        set({
          items: get().items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, subtotal: item.product.price * quantity }
              : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.subtotal, 0);
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