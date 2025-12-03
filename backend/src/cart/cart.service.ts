import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart.entity';
import { Product } from 'src/products/products.entity';
import { User } from 'src/user/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private repo: Repository<CartItem>,
    @InjectRepository(Product) private prodRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>
  ) {}

  async addToCart(userId: number, productId: number, quantity: number) {
    // Validate quantity
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const product = await this.prodRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Check stock availability
    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${product.stock} items available`);
    }

    let item = await this.repo.findOne({ 
      where: { user: { id: userId }, product: { id: productId } },
      relations: ['product']
    });
    
    if (item) {
      // Check if updated quantity exceeds stock
      const newTotalQuantity = item.quantity + quantity;
      if (product.stock < newTotalQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Cannot add ${quantity} more items. ` +
          `You already have ${item.quantity} in cart, only ${product.stock - item.quantity} more available`
        );
      }
      item.quantity = newTotalQuantity;
      return this.repo.save(item);
    }
    
    item = this.repo.create({ user, product, quantity });
    return this.repo.save(item);
  }

  async getCart(userId: number) {
    return this.repo.find({ 
      where: { user: { id: userId } },
      relations: ['product'],
      select: {
        id: true,
        quantity: true,
        product: {
          id: true,
          title: true,
          price: true,
          description: true,
          stock: true
        }
      }
    });
  }

  async updateQuantity(userId: number, productId: number, quantity: number) {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    if (quantity === 0) {
      // If quantity is 0, remove the item
      return this.removeItem(userId, productId);
    }

    const item = await this.repo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
      relations: ['product']
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability
    if (item.product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${item.product.stock} items available`);
    }

    item.quantity = quantity;
    return this.repo.save(item);
  }

  async removeItem(userId: number, productId: number) {
    const result = await this.repo.delete({
      user: { id: userId },
      product: { id: productId }
    });

    if (result.affected === 0) {
      throw new NotFoundException('Cart item not found');
    }

    return { message: 'Item removed from cart successfully' };
  }

  async clearCart(userId: number) {
    const result = await this.repo.delete({
      user: { id: userId }
    });

    return { 
      message: 'Cart cleared successfully',
      itemsRemoved: result.affected 
    };
  }

  // Get cart total
  async getCartTotal(userId: number) {
    const cartItems = await this.repo.find({
      where: { user: { id: userId } },
      relations: ['product']
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + (item.quantity * parseFloat(item.product.price.toString()));
    }, 0);

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      itemCount: cartItems.length,
      currency: 'BDT' // You can make this dynamic
    };
  }

  // Get cart item count
  async getCartItemCount(userId: number) {
    const count = await this.repo.count({
      where: { user: { id: userId } }
    });

    return { count };
  }

  // Optional: Get cart summary (items + total)
  async getCartSummary(userId: number) {
    const cartItems = await this.getCart(userId);
    const total = await this.getCartTotal(userId);

    return {
      items: cartItems,
      summary: total
    };
  }
}