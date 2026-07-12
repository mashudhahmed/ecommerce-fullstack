// src/user/user.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Param,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserService } from './user.service';
import { UserRole } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { FilesService } from '../files/files.service';
import { MulterFile } from '../common/types/multer-file.type';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly filesService: FilesService,
  ) {}

  // ============================================================
  // PROFILE ENDPOINTS (Authenticated User)
  // ============================================================

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: { user: { id: number } }) {
    const user = await this.userService.findByIdOrFail(req.user.id);
    return this.userService.getPublicProfile(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: UpdateUserDto })
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe({ whitelist: true })) updateData: UpdateUserDto,
  ) {
    const user = await this.userService.update(req.user.id, updateData);
    return this.userService.getPublicProfile(user);
  }

  // ✅ NEW: Upload avatar endpoint
  @Patch('profile/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (PNG, JPG, WebP)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const uploadResult = await this.filesService.uploadFile(file, {
        folder: 'avatars',
      });

      const updatedUser = await this.userService.update(req.user.id, {
        avatar: uploadResult.url,
      });

      return {
        message: 'Avatar updated successfully',
        avatar: uploadResult.url,
        user: this.userService.getPublicProfile(updatedUser),
      };
    } catch (error: any) {
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }
  }

  // ✅ NEW: Remove avatar endpoint
  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Remove user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar removed successfully' })
  async removeAvatar(@Request() req: { user: { id: number } }) {
    const user = await this.userService.findByIdOrFail(req.user.id);
    
    // If there's an avatar URL, we could delete it from Cloudinary here
    // For now, just remove the avatar field
    await this.userService.update(req.user.id, { avatar: null });
    
    return { message: 'Avatar removed successfully' };
  }

  @Patch('profile/email')
  @ApiOperation({ summary: 'Change user email' })
  @ApiResponse({ status: 200, description: 'Email updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or already exists' })
  @ApiBody({ type: ChangeEmailDto })
  async changeEmail(
    @Request() req: { user: { id: number } },
    @Body() dto: ChangeEmailDto,
  ) {
    return this.userService.changeEmail(req.user.id, dto.newEmail, dto.password);
  }

  @Delete('profile')
  @ApiOperation({ summary: 'Delete current user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: { user: { id: number } }) {
    await this.userService.delete(req.user.id);
    return { message: 'Account deleted successfully' };
  }

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(
    @Request() req: { user: { role: UserRole } },
    @Query('role') role?: UserRole,
    @Query('isVerified') isVerified?: boolean,
  ) {
    if (req.user.role === UserRole.ADMIN) {
      return this.userService.findAll({
        excludeSuperAdmin: true,
        role,
        isVerified,
      });
    }
    return this.userService.findAll({ role, isVerified });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { role: UserRole } },
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (req.user.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot view SuperAdmin details');
    }
    return this.userService.getPublicProfile(user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateUserDto,
    @Request() req: { user: { role: UserRole } },
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (req.user.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot update SuperAdmin');
    }
    const updated = await this.userService.update(id, updateData);
    return this.userService.getPublicProfile(updated);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    const user = await this.userService.findByIdOrFail(id);

    if (user.id === req.user.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    if (req.user.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete SuperAdmin');
    }

    await this.userService.delete(id);
    return { message: 'User deleted successfully' };
  }

  // ============================================================
  // VENDOR ENDPOINTS
  // ============================================================

  @Get('vendors/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get pending vendors' })
  @ApiResponse({ status: 200, description: 'Pending vendors retrieved' })
  async getPendingVendors() {
    return this.userService.findPendingVendors();
  }

  @Get('vendors/approved')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get approved vendors' })
  async getApprovedVendors() {
    return this.userService.findApprovedVendors();
  }

  @Patch('vendors/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve vendor' })
  async approveVendor(@Param('id', ParseIntPipe) id: number) {
    return this.userService.approveVendor(id);
  }

  @Patch('vendors/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject vendor' })
  async rejectVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.userService.rejectVendor(id, reason);
  }

  // ============================================================
  // STATS ENDPOINTS
  // ============================================================

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return this.userService.getUserStats();
  }

  @Get('search')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search users' })
  async searchUsers(@Query('query') query: string) {
    if (!query || query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }
    return this.userService.searchUsers(query);
  }
}