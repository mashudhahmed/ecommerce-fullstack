import { Body, Controller, Delete, Get, Param, UseGuards, Post,   } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guards';
import { AuthService } from 'src/auth/auth.service';
import { ParseIntPipe } from '@nestjs/common';


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
  deleteUser(@Param('id') id: number) {
    return this.auth.deleteUser(id);
  }
}
