import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from './products.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRole } from '../user/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // CREATE - Vendor can create products
  // ============================================================
  async create(createProductDto: CreateProductDto, userId: number): Promise<Product> {
    // findByIdOrFail already throws NotFoundException if the user doesn't
    // exist, so we don't need to duplicate that check here.
    const user = await this.userService.findByIdOrFail(userId);

    // Only vendors and admins can create products
    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Only vendors and admins can create products');
    }

    // If vendor, check if approved
    if (user.role === UserRole.VENDOR && !user.isVendorApproved) {
      throw new ForbiddenException('Your vendor account is pending approval');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      owner: user,
    });

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Product created: ${savedProduct.title} by user ${userId}`);
    return savedProduct;
  }

  // ============================================================
  // FIND ALL
  // ============================================================
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // FIND ALL (PAGINATED)
  // ============================================================
  async findAllPaginated(options: {
    page: number;
    limit: number;
  }): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await this.productRepository.findAndCount({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  // ============================================================
  // FIND IN STOCK
  // ============================================================
  async findInStock(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  // ============================================================
  // FIND OUT OF STOCK
  // ============================================================
  async findOutOfStock(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.stock = 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  // ============================================================
  // FIND LOW STOCK
  // ============================================================
  async findLowStock(threshold: number = 10): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.stock < :threshold', { threshold })
      .andWhere('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  // ============================================================
  // FIND BY VENDOR
  // ============================================================
  async findByVendor(vendorId: number): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        owner: { id: vendorId },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Check ownership or admin/superadmin
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${updatedProduct.title} by user ${userId}`);
    return updatedProduct;
  }

  // ============================================================
  // DELETE (Soft Delete)
  // ============================================================
  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership or admin/superadmin
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }

    // Soft delete
    product.isActive = false;
    await this.productRepository.save(product);
    this.logger.log(`Product deleted: ${product.title} by user ${userId}`);
  }

  // ============================================================
  // PERMANENT DELETE (Admin/SuperAdmin only)
  // ============================================================
  async permanentlyDelete(id: number, userRole: UserRole): Promise<void> {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      throw new ForbiddenException('Only admins can permanently delete products');
    }

    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
    this.logger.log(`Product permanently deleted: ${product.title}`);
  }

  // ============================================================
  // STOCK MANAGEMENT
  // ============================================================
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

  // ============================================================
  // BULK STOCK UPDATE (Vendor)
  // ============================================================
  async bulkUpdateStock(
    vendorId: number,
    updates: { productId: number; stock: number }[],
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: update.productId, owner: { id: vendorId } },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${update.productId} not found`);
        }

        if (update.stock < 0) {
          throw new BadRequestException(`Stock cannot be negative for product ${product.title}`);
        }

        product.stock = update.stock;
        await queryRunner.manager.save(product);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Bulk stock update completed for vendor ${vendorId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // GET VENDOR PRODUCT STATS
  // ============================================================
  async getVendorStats(vendorId: number): Promise<{
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      outOfStockCount,
    };
  }
}