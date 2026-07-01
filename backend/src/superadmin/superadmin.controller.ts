import { Body, Controller, Delete, Get, Param, UseGuards, Post, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guards';
import { AuthService } from '../auth/auth.service';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class SuperadminController {
  constructor(private auth: AuthService) {}

  @Post('create-admin')
  createAdmin(@Body() dto: { name: string; email: string; password: string }) {
    return this.auth.createAdmin(dto);
  }

  @Get('users')
  listUsers() {
    return this.auth.listAllUsers();
  }

  @Delete('user/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.auth.deleteUser(id);
  }
}