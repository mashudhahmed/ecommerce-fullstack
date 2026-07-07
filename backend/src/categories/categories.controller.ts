// src/categories/categories.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ============================================================
  // PUBLIC ROUTES
  // ============================================================
  
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree (hierarchical)' })
  @ApiResponse({ status: 200, description: 'Category tree retrieved successfully' })
  async getTree(): Promise<Category[]> {
    return this.categoriesService.findTree();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiResponse({ status: 200, description: 'Category stats retrieved successfully' })
  async getStats() {
    return this.categoriesService.getCategoryStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a category by slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoriesService.findBySlug(slug);
  }

  // ============================================================
  // ADMIN ROUTES
  // ============================================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  create(@Body() data: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoriesService.delete(id);
  }
}