import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guards';
import { Roles } from 'src/common/decorator/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  getAll() { return this.svc.findAll(); }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  // admin or superadmin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post()
  create(@Body() dto: CreateProductDto) { return this.svc.create(dto); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateProductDto) { return this.svc.update(id, dto); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
