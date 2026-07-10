// src/superadmin/superadmin.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Between, MoreThan, LessThan } from 'typeorm';
import { User, UserRole } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { VendorService } from '../vendor/vendor.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly vendorService: VendorService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================================
  // ADMIN MANAGEMENT
  // ============================================================

  /**
   * Create a new admin
   */
  async createAdmin(dto: CreateAdminDto) {
    this.logger.log(`📝 Creating new admin: ${dto.email}`);
    return this.authService.createAdmin({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });
  }

  /**
   * Get all admins with pagination
   */
  async getAdmins(page: number = 1, limit: number = 20) {
    this.logger.log(`📋 Fetching admins - Page: ${page}, Limit: ${limit}`);
    
    const admins = await this.userService.findByRole(UserRole.ADMIN);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: admins.slice(start, end).map((u) => this.userService.getPublicProfile(u)),
      meta: {
        total: admins.length,
        page,
        limit,
        totalPages: Math.ceil(admins.length / limit),
      },
    };
  }

  /**
   * Get admin by ID
   */
  async getAdmin(id: number) {
    this.logger.log(`📋 Fetching admin: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    
    return this.userService.getPublicProfile(user);
  }

  /**
   * Update admin details
   */
  async updateAdmin(id: number, dto: UpdateUserDto) {
    this.logger.log(`📝 Updating admin: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    
    const updated = await this.userService.update(id, dto);
    return this.userService.getPublicProfile(updated);
  }

  /**
   * Delete an admin
   */
  async deleteAdmin(id: number) {
    this.logger.log(`🗑️ Deleting admin: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }

    // Prevent deleting the last admin
    const adminCount = await this.userService.countByRole(UserRole.ADMIN);
    if (adminCount <= 1) {
      throw new BadRequestException('Cannot delete the last admin');
    }

    await this.userService.delete(id);
    return { message: 'Admin deleted successfully' };
  }

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  /**
   * Get all users with filters
   */
  async getUsers(filters: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
    isVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, role, search, isVerified, sortBy, sortOrder } = filters;

    this.logger.log(`📋 Fetching users - Page: ${page}, Limit: ${limit}`);

    let users: User[];

    if (search && search.length >= 2) {
      users = await this.userService.searchUsers(search);
    } else {
      const dbFilters: any = {};
      if (role) dbFilters.role = role;
      if (isVerified !== undefined) dbFilters.isVerified = isVerified;
      users = await this.userService.findAll(dbFilters);
    }

    // Sort
    if (sortBy) {
      users = users.sort((a, b) => {
        const aVal = a[sortBy as keyof User] ?? '';
        const bVal = b[sortBy as keyof User] ?? '';
        if (aVal < bVal) return sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: users.slice(start, end).map((u) => this.userService.getPublicProfile(u)),
      meta: {
        total: users.length,
        page,
        limit,
        totalPages: Math.ceil(users.length / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUser(id: number) {
    this.logger.log(`📋 Fetching user: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    return this.userService.getPublicProfile(user);
  }

  /**
   * Update any user
   */
  async updateUser(id: number, dto: UpdateUserDto) {
    this.logger.log(`📝 Updating user: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    
    const updated = await this.userService.update(id, dto);
    return this.userService.getPublicProfile(updated);
  }

  /**
   * Delete any user
   */
  async deleteUser(id: number) {
    this.logger.log(`🗑️ Deleting user: ${id}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete Super Admin');
    }
    
    return this.authService.deleteUser(id);
  }

  /**
   * Update user verification status
   */
  async updateUserStatus(id: number, isVerified: boolean) {
    this.logger.log(`📝 Updating user status: ${id} -> ${isVerified}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    
    await this.userService.update(id, { isVerified });
    const updated = await this.userService.findByIdOrFail(id);
    
    return {
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      user: this.userService.getPublicProfile(updated),
    };
  }

  /**
   * Change user role
   */
  async changeUserRole(id: number, role: UserRole) {
    this.logger.log(`📝 Changing user role: ${id} -> ${role}`);
    const user = await this.userService.findByIdOrFail(id);
    
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    
    if (role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot assign Super Admin role');
    }
    
    await this.userService.update(id, { role });
    const updated = await this.userService.findByIdOrFail(id);
    
    return {
      message: `User role changed to ${role}`,
      user: this.userService.getPublicProfile(updated),
    };
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: number[]) {
    this.logger.log(`🗑️ Bulk deleting ${userIds.length} users`);
    
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of userIds) {
      try {
        const user = await this.userService.findByIdOrFail(id);
        if (user.role === UserRole.SUPER_ADMIN) {
          results.failed.push({ id, error: 'Cannot delete Super Admin' });
          continue;
        }
        await this.userService.delete(id);
        results.success.push(id);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id, error: message });
      }
    }

    return {
      message: `Deleted ${results.success.length} users, ${results.failed.length} failed`,
      results,
    };
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get comprehensive user statistics
   */
  async getStatistics() {
    this.logger.log('📊 Fetching comprehensive statistics');
    
    const [
      totalUsers,
      totalVendors,
      totalAdmins,
      totalSuperAdmins,
      verifiedUsers,
      pendingVendors,
      approvedVendors,
      recentUsers,
    ] = await Promise.all([
      this.userService.countUsers(),
      this.userService.countByRole(UserRole.VENDOR),
      this.userService.countByRole(UserRole.ADMIN),
      this.userService.countByRole(UserRole.SUPER_ADMIN),
      this.userService.countVerifiedUsers(),
      this.userService.countPendingVendors(),
      this.userService.countByRole(UserRole.VENDOR).then((count) =>
        this.userService.findApprovedVendors().then((vendors) => vendors.length),
      ),
      this.userService.getRecentUsers(10),
    ]);

    return {
      total: {
        users: totalUsers,
        vendors: totalVendors,
        admins: totalAdmins,
        superAdmins: totalSuperAdmins,
      },
      verification: {
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        pendingVendors,
        approvedVendors,
      },
      recentUsers: recentUsers.map((u) => this.userService.getPublicProfile(u)),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    this.logger.log('📊 Fetching system status');
    
    const [totalUsers, verifiedUsers] = await Promise.all([
      this.userService.countUsers(),
      this.userService.countVerifiedUsers(),
    ]);

    return {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      stats: {
        totalUsers,
        activeUsers: verifiedUsers,
        inactiveUsers: totalUsers - verifiedUsers,
      },
    };
  }

  // ============================================================
  // VENDOR MANAGEMENT (SUPERADMIN)
  // ============================================================

  /**
   * Get vendor performance overview
   */
  async getVendorPerformance(period: string = 'month', limit: number = 20) {
    this.logger.log(`📊 Fetching vendor performance - Period: ${period}`);
    const stats = await this.vendorService.getAdminVendorStats();
    
    return {
      ...stats,
      period,
      limit,
      topVendors: stats.topVendors?.slice(0, limit) || [],
    };
  }

  /**
   * Get vendor orders
   */
  async getVendorOrders(vendorId: number, status?: string, page: number = 1, limit: number = 20) {
    this.logger.log(`📋 Fetching vendor orders: ${vendorId}`);
    const vendor = await this.userService.findByIdOrFail(vendorId);
    
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    
    return this.vendorService.getVendorOrders(vendorId, status, page, limit);
  }

  /**
   * Get vendor products
   */
  async getVendorProducts(vendorId: number, page: number = 1, limit: number = 20, inStock?: boolean) {
    this.logger.log(`📋 Fetching vendor products: ${vendorId}`);
    const vendor = await this.userService.findByIdOrFail(vendorId);
    
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }
    
    return this.vendorService.getVendorProducts(vendorId, page, limit, inStock);
  }

  /**
   * Get vendor ranking
   */
  async getVendorRanking(metric: string = 'revenue', limit: number = 20) {
    this.logger.log(`📊 Fetching vendor ranking - Metric: ${metric}`);
    const stats = await this.vendorService.getAdminVendorStats();
    const topVendors = stats.topVendors || [];
    
    const sortedVendors = [...topVendors].sort((a, b) => {
      if (metric === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
      if (metric === 'orders') return (b.orders || 0) - (a.orders || 0);
      return (b.revenue || 0) - (a.revenue || 0);
    });

    return {
      metric,
      vendors: sortedVendors.slice(0, limit),
      totalVendors: stats.totalVendors || 0,
    };
  }

  /**
   * Get vendor growth report
   */
  async getVendorGrowthReport(period: string = 'month') {
    this.logger.log(`📊 Fetching vendor growth report - Period: ${period}`);
    const stats = await this.vendorService.getAdminVendorStats();
    
    return {
      period,
      totalVendors: stats.totalVendors,
      activeVendors: stats.activeVendors,
      pendingVendors: stats.pendingVendors,
      rejectedVendors: stats.rejectedVendors,
      suspendedVendors: stats.suspendedVendors,
      growthData: stats.vendorGrowth || [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export vendor report
   */
  async exportVendorReport(format: string = 'csv') {
    this.logger.log(`📊 Exporting vendor report - Format: ${format}`);
    const stats = await this.vendorService.getAdminVendorStats();
    
    const reportData = {
      summary: {
        totalVendors: stats.totalVendors,
        activeVendors: stats.activeVendors,
        pendingVendors: stats.pendingVendors,
        rejectedVendors: stats.rejectedVendors,
        suspendedVendors: stats.suspendedVendors,
      },
      topVendors: stats.topVendors || [],
      growthData: stats.vendorGrowth || [],
      generatedAt: new Date().toISOString(),
    };

    const filename = `vendor_report_${new Date().toISOString().split('T')[0]}.json`;

    return {
      data: reportData,
      filename,
      format,
      contentType: 'application/json',
    };
  }

  // ============================================================
  // SYSTEM MANAGEMENT
  // ============================================================

  /**
   * Get system health
   */
  async getSystemHealth() {
    this.logger.log('📊 Checking system health');
    
    // Check database connection
    let databaseStatus = 'healthy';
    let databaseError: string | null = null;
    
    try {
      await this.userRepository.query('SELECT 1');
    } catch (error: unknown) {
      databaseStatus = 'unhealthy';
      databaseError = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      status: databaseStatus === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: databaseStatus,
          error: databaseError,
        },
        uptime: {
          status: 'healthy',
          value: process.uptime(),
        },
        memory: {
          status: 'healthy',
          value: process.memoryUsage(),
        },
      },
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10) {
    this.logger.log(`📋 Fetching recent activity - Limit: ${limit}`);
    
    // Get recent users
    const recentUsers = await this.userService.getRecentUsers(limit);
    
    // Get recent vendor applications
    const pendingVendors = await this.userService.findPendingVendors();
    
    return {
      recentUsers: recentUsers.map((u) => this.userService.getPublicProfile(u)),
      pendingVendors: pendingVendors.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        businessName: v.vendorBusinessName,
        registeredAt: v.createdAt,
      })),
      totalPendingVendors: pendingVendors.length,
      timestamp: new Date().toISOString(),
    };
  }
}