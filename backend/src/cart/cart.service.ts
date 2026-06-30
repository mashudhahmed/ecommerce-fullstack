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

  async addToCart(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<CartItem> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Only ${product.stock} items available`,
      );
    }

    let cartItem = await this.cartRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
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

  async getCart(userId: number): Promise<CartItem[]> {
    return this.cartRepository.find({
      where: { user: { id: userId } },
      order: { id: 'ASC' },
    });
  }

  async updateQuantity(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<CartItem | null> {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
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

  async clearCart(userId: number): Promise<void> {
    await this.cartRepository.delete({
      user: { id: userId },
    });
    this.logger.log(`Cart cleared for user ${userId}`);
  }

  async getCartTotal(userId: number): Promise<{
    total: number;
    itemCount: number;
    items: any[];
  }> {
    const cartItems = await this.getCart(userId);

    let total = 0;
    const items = cartItems.map((item) => {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      return {
        id: item.id,
        product: {
          id: item.product.id,
          title: item.product.title,
          price: item.product.price,
        },
        quantity: item.quantity,
        subtotal,
      };
    });

    return {
      total: Math.round(total * 100) / 100,
      itemCount: cartItems.length,
      items,
    };
  }

  async getCartItemCount(userId: number): Promise<{ count: number }> {
    const count = await this.cartRepository.count({
      where: { user: { id: userId } },
    });
    return { count };
  }

  async getCartSummary(userId: number): Promise<{
    items: CartItem[];
    total: number;
    itemCount: number;
  }> {
    const cartItems = await this.getCart(userId);
    const total = cartItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return {
      items: cartItems,
      total: Math.round(total * 100) / 100,
      itemCount: cartItems.length,
    };
  }
}