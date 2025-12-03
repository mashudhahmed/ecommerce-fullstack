import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from 'src/products/products.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    
    @InjectRepository(OrderItem)
    private orderItemsRepo: Repository<OrderItem>,
    
    @InjectRepository(Product)
    private productsRepo: Repository<Product>,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    // Calculate total and validate products
    const { total, items }: { total: number; items: Array<{ productId: number; quantity: number; price: number }> } = await this.calculateOrderDetails(dto.items);
    
    // Create order
    const order = this.ordersRepo.create({
      user: { id: userId },
      total,
      status: 'pending',
    });
    
    const savedOrder = await this.ordersRepo.save(order);
    
    // Create order items
    const orderItems = items.map(item => 
      this.orderItemsRepo.create({
        order: savedOrder,
        product: { id: item.productId },
        quantity: item.quantity,
        price: item.price,
      })
    );
    
    await this.orderItemsRepo.save(orderItems);
    
    // Update product stock
    await this.updateProductStock(dto.items);
    
    // Return the complete order with relations (will apply @Exclude automatically)
    return this.findOne(savedOrder.id);
  }

  async findByUser(userId: number) {
    return this.ordersRepo.find({
      where: { user: { id: userId } },
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll() {
    return this.ordersRepo.find({
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  async updateStatus(id: number, status: string) {
    const order = await this.findOne(id);
    order.status = status;
    return this.ordersRepo.save(order);
  }

  private async calculateOrderDetails(items: Array<{ productId: number; quantity: number }>) {
    let total = 0;
    const orderItems: Array<{ productId: number; quantity: number; price: number }> = [];
    
    for (const item of items) {
      const product = await this.productsRepo.findOne({
        where: { id: item.productId }
      });
      
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.title}`);
      }
      
      const itemTotal = product.price * item.quantity;
      total += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }
    
    return { total, items: orderItems };
  }

  private async updateProductStock(items: Array<{ productId: number; quantity: number }>) {
    for (const item of items) {
      await this.productsRepo.decrement(
        { id: item.productId },
        'stock',
        item.quantity
      );
    }
  }
}