import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductPromotionDto } from './dto/update-product-promotion.dto';
import { UpdateProductAvailabilityDto } from './dto/update-product-availability.dto';
import { RolesGuard } from 'src/roles/roles.guard';
import { Role } from 'src/constants/roles';
import { BusinessOwnerGuard } from './guards/business-owner.guard';

@Controller('business/:businessId/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(RolesGuard(Role.BUSINESS), BusinessOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria um produto para o business' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso.' })
  create(
    @Param('businessId') businessId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productService.create(businessId, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista o cardapio do business' })
  @ApiResponse({ status: 200, description: 'Lista de produtos do business.' })
  findByBusiness(@Param('businessId') businessId: string) {
    return this.productService.findByBusiness(businessId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Lista apenas produtos disponíveis do business' })
  @ApiResponse({ status: 200, description: 'Lista de produtos disponíveis.' })
  findAvailableByBusiness(@Param('businessId') businessId: string) {
    return this.productService.findAvailableByBusiness(businessId);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Obtém um produto do business' })
  @ApiResponse({ status: 200, description: 'Produto retornado com sucesso.' })
  findOne(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.findOne(businessId, productId);
  }

  @Patch(':productId')
  @UseGuards(RolesGuard(Role.BUSINESS), BusinessOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza um produto do business' })
  @ApiResponse({ status: 200, description: 'Produto atualizado com sucesso.' })
  update(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(businessId, productId, updateProductDto);
  }

  @Patch(':productId/availability')
  @UseGuards(RolesGuard(Role.BUSINESS), BusinessOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativa/desativa disponibilidade do produto' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidade atualizada com sucesso.',
  })
  updateAvailability(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductAvailabilityDto,
  ) {
    return this.productService.updateAvailability(
      businessId,
      productId,
      dto.available,
    );
  }

  @Patch(':productId/promotion')
  @UseGuards(RolesGuard(Role.BUSINESS), BusinessOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativa/desativa ou ajusta promoção de um produto' })
  @ApiResponse({ status: 200, description: 'Promoção atualizada com sucesso.' })
  updatePromotion(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() updatePromotionDto: UpdateProductPromotionDto,
  ) {
    return this.productService.updatePromotion(
      businessId,
      productId,
      updatePromotionDto,
    );
  }

  @Delete(':productId')
  @UseGuards(RolesGuard(Role.BUSINESS), BusinessOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove um produto do business' })
  @ApiResponse({ status: 200, description: 'Produto removido com sucesso.' })
  remove(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.remove(businessId, productId);
  }
}
