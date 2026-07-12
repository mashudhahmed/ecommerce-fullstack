// store/wishlist-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface WishlistState {
  items: Product[];
  isSynced: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
  isInWishlist: (productId: number) => boolean;
  getTotal: () => number;
  syncWithServer: (serverItems: Product[]) => void;
  setSynced: () => void;
}

// ✅ Mirrors cart-store.ts: local-first store for instant reads/writes.
// The server (via wishlistService) remains the source of truth for
// persistence — this store just avoids a network round-trip for every
// "is this in my wishlist" check across a page of product cards.
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isSynced: false,

      syncWithServer: (serverItems) => {
        set({ items: serverItems, isSynced: true });
      },

      setSynced: () => set({ isSynced: true }),

      addItem: (product) => {
        const { items } = get();
        if (items.some((item) => item.id === product.id)) return;
        set({ items: [...items, product] });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },

      clear: () => set({ items: [] }),

      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      getTotal: () => get().items.length,
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({
        items: state.items,
        isSynced: state.isSynced,
      }),
    }
  )
);