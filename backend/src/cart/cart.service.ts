// src/cart/cart.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart.entity';
import { Product } from '../products/products.entity';
import { User } from '../user/user.entity';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================================
  // ADD TO CART
  // ============================================================
  async addToCart(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<CartItem> {
    // Validate quantity
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (quantity > 99) {
      throw new BadRequestException('Maximum quantity per item is 99');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find product
    const product = await this.productRepository.findOne({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Only ${product.stock} items available`,
      );
    }

    // Check if item already in cart
    let cartItem = await this.cartRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      if (newQuantity > 99) {
        throw new BadRequestException(
          `Cannot add more than 99 items. Current: ${cartItem.quantity}`,
        );
      }
      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. You can only add ${product.stock - cartItem.quantity} more items`,
        );
      }
      cartItem.quantity = newQuantity;
    } else {
      cartItem = this.cartRepository.create({
        user,
        product,
        quantity,
      });
    }

    const savedItem = await this.cartRepository.save(cartItem);
    this.logger.log(
      `${quantity} of product ${productId} added to cart for user ${userId}`,
    );
    return savedItem;
  }

  // ============================================================
  // GET CART
  // ============================================================
  async getCart(userId: number): Promise<CartItem[]> {
    return this.cartRepository.find({
      where: { user: { id: userId } },
      order: { id: 'ASC' },
    });
  }

  // ============================================================
  // UPDATE QUANTITY
  // ============================================================
  async updateQuantity(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<CartItem | null> {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    if (quantity > 99) {
      throw new BadRequestException('Maximum quantity per item is 99');
    }

    if (quantity === 0) {
      await this.removeItem(userId, productId);
      return null;
    }

    const cartItem = await this.cartRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (product && product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Only ${product.stock} items available`,
      );
    }

    cartItem.quantity = quantity;
    const updatedItem = await this.cartRepository.save(cartItem);
    this.logger.log(
      `Cart item ${cartItem.id} quantity updated to ${quantity} for user ${userId}`,
    );
    return updatedItem;
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================
  async removeItem(userId: number, productId: number): Promise<void> {
    const result = await this.cartRepository.delete({
      user: { id: userId },
      product: { id: productId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Cart item not found');
    }

    this.logger.log(`Cart item removed for user ${userId}, product ${productId}`);
  }

  // ============================================================
  // CLEAR CART
  // ============================================================
  async clearCart(userId: number): Promise<void> {
    await this.cartRepository.delete({
      user: { id: userId },
    });
    this.logger.log(`Cart cleared for user ${userId}`);
  }

  // ============================================================
  // GET CART TOTAL
  // ============================================================
  async getCartTotal(userId: number): Promise<{
    total: number;
    itemCount: number;
    items: any[];
  }> {
    const cartItems = await this.getCart(userId);

    let total = 0;
    const items = cartItems.map((item) => {
      const subtotal = Number(item.product.price) * item.quantity;
      total += subtotal;
      return {
        id: item.id,
        product: {
          id: item.product.id,
          title: item.product.title,
          price: Number(item.product.price),
          imageUrl: item.product.imageUrl,
        },
        quantity: item.quantity,
        subtotal: Math.round(subtotal * 100) / 100,
      };
    });

    return {
      total: Math.round(total * 100) / 100,
      itemCount: cartItems.length,
      items,
    };
  }

  // ============================================================
  // GET CART ITEM COUNT
  // ============================================================
  async getCartItemCount(userId: number): Promise<{ count: number }> {
    const count = await this.cartRepository.count({
      where: { user: { id: userId } },
    });
    return { count };
  }

  // ============================================================
  // GET CART SUMMARY
  // ============================================================
  async getCartSummary(userId: number): Promise<{
    items: CartItem[];
    total: number;
    itemCount: number;
  }> {
    const cartItems = await this.getCart(userId);
    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return {
      items: cartItems,
      total: Math.round(total * 100) / 100,
      itemCount: cartItems.length,
    };
  }

  // ============================================================
  // CHECKOUT - Convert cart to order
  // ============================================================
  async checkout(userId: number): Promise<any> {
    const cartItems = await this.getCart(userId);

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Check stock for all items
    for (const item of cartItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.product.id },
      });

      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product "${item.product.title}". Available: ${product?.stock || 0}`,
        );
      }
    }

    // Return cart items for order creation
    const items = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: Number(item.product.price),
    }));

    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return {
      items,
      total: Math.round(total * 100) / 100,
      itemCount: cartItems.length,
    };
  }

  // ============================================================
  // MERGE CART - Merge guest cart with user cart
  // ============================================================
  async mergeCart(
    userId: number,
    guestCartItems: { productId: number; quantity: number }[],
  ): Promise<{ merged: number; added: number; failed: number }> {
    let merged = 0;
    let added = 0;
    let failed = 0;

    for (const guestItem of guestCartItems) {
      try {
        // Check if item exists in user's cart
        const existingItem = await this.cartRepository.findOne({
          where: {
            user: { id: userId },
            product: { id: guestItem.productId },
          },
        });

        if (existingItem) {
          // Merge quantities
          const newQuantity = existingItem.quantity + guestItem.quantity;
          if (newQuantity > 99) {
            failed++;
            continue;
          }
          await this.updateQuantity(userId, guestItem.productId, newQuantity);
          merged++;
        } else {
          // Add new item
          await this.addToCart(userId, guestItem.productId, guestItem.quantity);
          added++;
        }
      } catch (error) {
        failed++;
        this.logger.warn(
          `Failed to merge cart item ${guestItem.productId} for user ${userId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Cart merged for user ${userId}: ${merged} merged, ${added} added, ${failed} failed`,
    );

    return { merged, added, failed };
  }
}