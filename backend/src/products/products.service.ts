import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Product created: ${savedProduct.title}`);
    return savedProduct;
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${updatedProduct.title}`);
    return updatedProduct;
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    this.logger.log(`Product deleted: ${product.title}`);
  }

  async findInStock(): Promise<Product[]> {
    return this.productRepository.find({
      where: { stock: 0 },
      order: { createdAt: 'DESC' },
    });
  }

  async findLowStock(threshold: number = 10): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.stock < :threshold', { threshold })
      .andWhere('product.stock > 0')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  async checkStock(productId: number, quantity: number): Promise<boolean> {
    const product = await this.findOne(productId);
    return product.isInStock(quantity);
  }

  async reduceStock(productId: number, quantity: number): Promise<void> {
    const product = await this.findOne(productId);
    product.reduceStock(quantity);
    await this.productRepository.save(product);
  }

  async increaseStock(productId: number, quantity: number): Promise<void> {
    const product = await this.findOne(productId);
    product.stock += quantity;
    await this.productRepository.save(product);
  }
}