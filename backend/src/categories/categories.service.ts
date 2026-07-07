// src/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================
  
  async create(dto: CreateCategoryDto): Promise<Category> {
    // Check if category with this name exists
    const existing = await this.categoryRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    // Generate slug
    const slug = this.generateSlug(dto.name);

    // Check if slug is unique
    const slugExists = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (slugExists) {
      throw new ConflictException(`Category with slug "${slug}" already exists`);
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder || 0,
      isActive: dto.isActive ?? true,
    });

    // Handle parent category
    if (dto.parentId && dto.parentId > 0) {
      const parent = await this.categoryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
      }
      if (!parent.isActive) {
        throw new BadRequestException('Parent category is inactive');
      }
      category.parent = parent;
    }

    const saved = await this.categoryRepository.save(category);
    this.logger.log(`Category created: ${saved.name} (${saved.slug})`);
    return saved;
  }

  // ============================================================
  // FIND ALL
  // ============================================================
  
  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // ============================================================
  // FIND TREE (Hierarchical)
  // ============================================================
  
  async findTree(): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      relations: ['children', 'children.children'],
      order: { sortOrder: 'ASC' },
    });
    
    // Return only root categories (parent is null)
    return categories.filter((cat) => !cat.parent);
  }

  // ============================================================
  // FIND ONE BY ID
  // ============================================================
  
  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  // ============================================================
  // FIND BY SLUG
  // ============================================================
  
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  // ============================================================
  // UPDATE
  // ============================================================
  
  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    // Update name and slug
    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
      category.name = dto.name;
      category.slug = this.generateSlug(dto.name);
    }

    // Update other fields
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    // Update parent
    if (dto.parentId !== undefined) {
      if (dto.parentId === 0 || dto.parentId === null) {
        category.parent = null;
      } else {
        // Prevent circular reference
        if (dto.parentId === id) {
          throw new ConflictException('Cannot set a category as its own parent');
        }

        // Check if parent is a descendant
        const descendants = await this.getDescendantIds(id);
        if (descendants.includes(dto.parentId)) {
          throw new ConflictException('Cannot set a descendant as parent');
        }

        const parent = await this.categoryRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent category with ID ${dto.parentId} not found`,
          );
        }
        if (!parent.isActive) {
          throw new BadRequestException('Parent category is inactive');
        }
        category.parent = parent;
      }
    }

    const updated = await this.categoryRepository.save(category);
    this.logger.log(`Category updated: ${updated.name}`);
    return updated;
  }

  // ============================================================
  // DELETE (Soft Delete)
  // ============================================================
  
  async delete(id: number): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has children
    const children = await this.categoryRepository.find({
      where: { parent: { id } },
    });

    if (children.length > 0) {
      // Option 1: Move children to parent
      for (const child of children) {
        child.parent = category.parent || undefined;
        await this.categoryRepository.save(child);
      }
      this.logger.log(`Moved ${children.length} children to parent`);
    }

    // Check if category has products
    if (category.products && category.products.length > 0) {
      // Option: Unassign products from this category
      // Or prevent deletion
      this.logger.warn(
        `Category ${category.name} has ${category.products.length} products`,
      );
    }

    // Soft delete
    category.isActive = false;
    await this.categoryRepository.save(category);
    this.logger.log(`Category deleted: ${category.name}`);
  }

  // ============================================================
  // GET CATEGORY STATS
  // ============================================================
  
  async getCategoryStats(): Promise<{
    total: number;
    active: number;
    rootCategories: number;
    maxDepth: number;
    categoriesWithProducts: number;
  }> {
    const [total, active, rootCategories, categoriesWithProducts] = await Promise.all([
      this.categoryRepository.count(),
      this.categoryRepository.count({ where: { isActive: true } }),
      this.categoryRepository.count({ where: { parent: IsNull() } }),
      this.categoryRepository
        .createQueryBuilder('category')
        .where('category.products IS NOT NULL')
        .getCount(),
    ]);

    // Calculate max depth
    const allCategories = await this.categoryRepository.find({
      relations: ['parent'],
    });
    const maxDepth = this.calculateMaxDepth(allCategories);

    return {
      total,
      active,
      rootCategories,
      maxDepth,
      categoriesWithProducts,
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================
  
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async getDescendantIds(id: number): Promise<number[]> {
    const descendants: number[] = [];
    const children = await this.categoryRepository.find({
      where: { parent: { id } },
      relations: ['children'],
    });

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await this.getDescendantIds(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  private calculateMaxDepth(categories: Category[], depth: number = 0): number {
    const roots = categories.filter((c) => !c.parent);
    let maxDepth = depth;

    for (const root of roots) {
      const children = categories.filter((c) => c.parent?.id === root.id);
      if (children.length > 0) {
        const childDepth = this.calculateMaxDepth(children, depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }

    return maxDepth;
  }
}