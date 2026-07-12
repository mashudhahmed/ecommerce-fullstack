// src/reviews/reviews.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { ReviewAnalyticsService } from './review-analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilesService } from '../files/files.service';
import { UserRole } from '../user/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// ✅ Define Multer file type locally
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewAnalyticsService: ReviewAnalyticsService,
    private readonly filesService: FilesService,
  ) {}

  // ============================================================
  // PUBLIC ENDPOINTS
  // ============================================================

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('rating') rating?: number,
  ) {
    return this.reviewsService.findByProduct(productId, page, limit, rating);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get product review stats' })
  @ApiResponse({ status: 200, description: 'Review stats retrieved' })
  async getProductReviewStats(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewAnalyticsService.getProductReviewStats(productId);
  }

  // ============================================================
  // AUTHENTICATED ENDPOINTS - WITH IMAGE UPLOAD
  // ============================================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review with images' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'number', example: 1 },
        rating: { type: 'number', example: 5, minimum: 1, maximum: 5 },
        title: { type: 'string', example: 'Great product!' },
        comment: { type: 'string', example: 'I really loved this product!' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Review images (max 5)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 5 }], {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async createReview(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateReviewDto,
    @UploadedFiles() files: { images?: MulterFile[] },
  ) {
    let imageUrls: string[] = [];

    if (files?.images && files.images.length > 0) {
      try {
        const uploadPromises = files.images.map((file) =>
          this.filesService.uploadFile(file as any, { folder: 'reviews' }),
        );
        const uploadResults = await Promise.all(uploadPromises);
        imageUrls = uploadResults.map((result) => result.url);
      } catch (error: any) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    return this.reviewsService.create(req.user.id, {
      ...dto,
      images: imageUrls,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'number', minimum: 1, maximum: 5 },
        title: { type: 'string' },
        comment: { type: 'string' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Review images (max 5)',
        },
        existingImages: {
          type: 'array',
          items: { type: 'string' },
          description: 'URLs of existing images to keep',
        },
        isApproved: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 5 }], {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
    @Body() dto: UpdateReviewDto,
    @UploadedFiles() files: { images?: MulterFile[] },
  ) {
    const existingReview = await this.reviewsService.findOne(id);
    
    // ✅ Use dto.existingImages or fallback to existing images
    let imageUrls: string[] = dto.existingImages || existingReview.images || [];

    if (files?.images && files.images.length > 0) {
      try {
        const uploadPromises = files.images.map((file) =>
          this.filesService.uploadFile(file as any, { folder: 'reviews' }),
        );
        const uploadResults = await Promise.all(uploadPromises);
        const newUrls = uploadResults.map((result) => result.url);
        imageUrls = [...imageUrls, ...newUrls];
      } catch (error: any) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    if (imageUrls.length > 5) {
      imageUrls = imageUrls.slice(0, 5);
    }

    const updateData = {
      ...dto,
      images: imageUrls,
    };

    return this.reviewsService.update(id, req.user.id, updateData, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    await this.reviewsService.delete(id, req.user.id, req.user.role);
    return { message: 'Review deleted' };
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200, description: 'Marked as helpful' })
  async markHelpful(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    await this.reviewsService.markHelpful(id, req.user.id);
    return { message: 'Marked as helpful' };
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200, description: 'Review reported' })
  async reportReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    await this.reviewsService.reportReview(id, req.user.id);
    return { message: 'Review reported' };
  }

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews (Admin)' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
  async adminGetAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('isApproved') isApproved?: boolean,
    @Query('isDeleted') isDeleted?: boolean,
    @Query('rating') rating?: number,
  ) {
    return this.reviewsService.adminGetAll(page, limit, {
      isApproved,
      isDeleted,
      rating,
    });
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a review (Admin)' })
  @ApiResponse({ status: 200, description: 'Review approved' })
  async adminApprove(@Param('id', ParseIntPipe) id: number) {
    await this.reviewsService.adminApprove(id);
    return { message: 'Review approved' };
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a review (Admin)' })
  @ApiResponse({ status: 200, description: 'Review rejected' })
  async adminReject(@Param('id', ParseIntPipe) id: number) {
    await this.reviewsService.adminReject(id);
    return { message: 'Review rejected' };
  }
}