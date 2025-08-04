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
  HttpCode,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Express, Request } from 'express';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import appConfig from '../../../config/app.config';
import { LegalDocumentService } from './legal-document.service';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { QueryLegalDocumentDto } from './dto/query-legal-document.dto';
import { VerifyLegalDocumentDto } from './dto/verify-legal-document.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Admin - Legal Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('admin/legal-documents')
export class LegalDocumentController {
  constructor(private readonly legalDocumentService: LegalDocumentService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new legal document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Legal document created successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided'
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'legal_document_files' }],
      {
        storage: diskStorage({
          destination:
            appConfig().storageUrl.rootUrl +
            '/' +
            appConfig().storageUrl.legalDocuments,
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${file.originalname}`);
          },
        }),
      },
    ),
  )
  async create(
    @Body() createLegalDocumentDto: CreateLegalDocumentDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    files: {
      legal_document_files?: Express.Multer.File[];
    },
  ) {
    return this.legalDocumentService.create(createLegalDocumentDto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Get all legal documents with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'document_type', required: false, enum: ['passport', 'drivers_license', 'national_id', 'visa', 'other'], description: 'Filter by document type' })
  @ApiQuery({ name: 'verification_status', required: false, enum: ['pending', 'approved', 'rejected', 'expired'], description: 'Filter by verification status' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'is_active', required: false, type: String, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'Legal documents retrieved successfully',
  })
  async findAll(@Query() query: QueryLegalDocumentDto) {
    return this.legalDocumentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific legal document by ID' })
  @ApiParam({ name: 'id', description: 'Legal document ID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Legal document not found'
  })
  async findOne(@Param('id') id: string) {
    return this.legalDocumentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a legal document' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Legal document ID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document updated successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Legal document not found'
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'legal_document_files' }],
      {
        storage: diskStorage({
          destination:
            appConfig().storageUrl.rootUrl +
            '/' +
            appConfig().storageUrl.legalDocuments,
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${file.originalname}`);
          },
        }),
      },
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() updateLegalDocumentDto: UpdateLegalDocumentDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    files: {
      legal_document_files?: Express.Multer.File[];
    },
  ) {
    return this.legalDocumentService.update(id, updateLegalDocumentDto, files);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify a legal document (approve/reject)' })
  @ApiParam({ name: 'id', description: 'Legal document ID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document verified successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Legal document not found'
  })
  async verifyDocument(
    @Param('id') id: string,
    @Body() verifyDto: VerifyLegalDocumentDto,
    @Req() req: Request
  ) {
    const adminUserId = req.user.userId;
    return this.legalDocumentService.verifyDocument(id, verifyDto, adminUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a legal document (soft delete)' })
  @ApiParam({ name: 'id', description: 'Legal document ID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Legal document deleted successfully'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Legal document not found'
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.legalDocumentService.remove(id);
  }
}
