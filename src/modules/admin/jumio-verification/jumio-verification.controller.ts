import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { JumioVerificationService } from './jumio-verification.service';
import { CreateJumioVerificationDto } from './dto/create-jumio-verification.dto';
import { UpdateJumioVerificationDto } from './dto/update-jumio-verification.dto';
import { QueryJumioVerificationDto } from './dto/query-jumio-verification.dto';
import { ReviewJumioVerificationDto } from './dto/review-jumio-verification.dto';


@ApiTags('Admin - Jumio Verifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('admin/jumio-verifications')
export class JumioVerificationController {
  constructor(private readonly jumioVerificationService: JumioVerificationService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new Jumio verification' })
  @ApiResponse({
    status: 201,
    description: 'Jumio verification created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided'
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  async create(@Body() createJumioVerificationDto: CreateJumioVerificationDto) {
    return this.jumioVerificationService.create(createJumioVerificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Jumio verifications with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'verification_type', required: false, enum: ['id_verification', 'face_verification', 'document_verification'], description: 'Filter by verification type' })
  @ApiQuery({ name: 'jumio_status', required: false, enum: ['pending', 'approved', 'denied', 'error', 'expired'], description: 'Filter by Jumio status' })
  @ApiQuery({ name: 'is_completed', required: false, type: String, description: 'Filter by completion status' })
  @ApiQuery({ name: 'manually_reviewed', required: false, type: String, description: 'Filter by manual review status' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'attempt_number', required: false, type: Number, description: 'Filter by attempt number' })
  @ApiResponse({
    status: 200,
    description: 'Jumio verifications retrieved successfully',
  })
  async findAll(@Query() query: QueryJumioVerificationDto) {
    return this.jumioVerificationService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get Jumio verification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Verification statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 100 },
        pending: { type: 'number', example: 25 },
        approved: { type: 'number', example: 50 },
        denied: { type: 'number', example: 15 },
        error: { type: 'number', example: 5 },
        expired: { type: 'number', example: 3 },
        completed: { type: 'number', example: 75 },
        manually_reviewed: { type: 'number', example: 10 }
      }
    }
  })
  async getStats() {
    return this.jumioVerificationService.getVerificationStats();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all Jumio verifications for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User verifications retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  async getVerificationsByUser(@Param('userId') userId: string) {
    return this.jumioVerificationService.getVerificationsByUser(userId);
  }



  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Jumio verification by ID' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Jumio verification retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Jumio verification not found'
  })
  async findOne(@Param('id') id: string) {
    return this.jumioVerificationService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get verification status from Jumio API' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found'
  })
  @ApiResponse({
    status: 400,
    description: 'No Jumio reference ID found'
  })
  async getVerificationStatus(@Param('id') id: string) {
    return this.jumioVerificationService.getVerificationStatus(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get detailed verification data from Jumio API' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found'
  })
  @ApiResponse({
    status: 400,
    description: 'No Jumio reference ID found'
  })
  async getVerificationDetails(@Param('id') id: string) {
    return this.jumioVerificationService.getVerificationDetails(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Jumio verification' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Jumio verification updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Jumio verification not found'
  })
  async update(
    @Param('id') id: string,
    @Body() updateJumioVerificationDto: UpdateJumioVerificationDto
  ) {
    return this.jumioVerificationService.update(id, updateJumioVerificationDto);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review a Jumio verification (approve/reject)' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Jumio verification reviewed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Jumio verification not found'
  })
  async reviewVerification(
    @Param('id') id: string,
    @Body() reviewDto: ReviewJumioVerificationDto,
    @Req() req: Request
  ) {
    const adminUserId = req.user.userId;
    return this.jumioVerificationService.reviewVerification(id, reviewDto, adminUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a Jumio verification (soft delete)' })
  @ApiParam({ name: 'id', description: 'Jumio verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Jumio verification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Jumio verification deleted successfully'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Jumio verification not found'
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.jumioVerificationService.remove(id);
  }
}
