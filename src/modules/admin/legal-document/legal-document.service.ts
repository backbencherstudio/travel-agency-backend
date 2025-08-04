import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { QueryLegalDocumentDto } from './dto/query-legal-document.dto';
import { VerifyLegalDocumentDto } from './dto/verify-legal-document.dto';

@Injectable()
export class LegalDocumentService {
    constructor(private readonly prisma: PrismaService) { }

    async create(
        createLegalDocumentDto: CreateLegalDocumentDto,
        files?: {
            legal_document_files?: Express.Multer.File[];
        }
    ) {
        // Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { id: createLegalDocumentDto.user_id }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const legalDocument = await this.prisma.legalDocument.create({
            data: {
                user_id: createLegalDocumentDto.user_id,
                document_type: createLegalDocumentDto.document_type,
                title: createLegalDocumentDto.title,
                description: createLegalDocumentDto.description,
                expires_at: createLegalDocumentDto.expires_at ? new Date(createLegalDocumentDto.expires_at) : null,
                is_active: createLegalDocumentDto.is_active ?? true,
                verification_status: 'pending'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_document_files: {
                    orderBy: {
                        sort_order: 'asc'
                    }
                }
            }
        });

        // Add legal document files
        if (files?.legal_document_files && files.legal_document_files.length > 0) {
            const legal_document_files_data = files.legal_document_files.map((file, index) => ({
                file: file.filename,
                file_alt: file.originalname,
                legal_document_id: legalDocument.id,
                type: createLegalDocumentDto.document_type,
                sort_order: index
            }));

            await this.prisma.legalDocumentFile.createMany({
                data: legal_document_files_data,
            });
        }

        return { success: true, message: 'Legal document created successfully' };
    }

    async findAll(query: QueryLegalDocumentDto) {
        const { page = 1, limit = 10, search, document_type, verification_status, user_id, is_active } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            deleted_at: null
        };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (document_type) {
            where.document_type = document_type;
        }

        if (verification_status) {
            where.verification_status = verification_status;
        }

        if (user_id) {
            where.user_id = user_id;
        }

        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        // Get total count
        const total = await this.prisma.legalDocument.count({ where });

        // Get documents with pagination
        const documents = await this.prisma.legalDocument.findMany({
            where,
            skip,
            take: limit,
            select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                status: true,
                document_type: true,
                title: true,
                description: true,
                expires_at: true,
                is_active: true,
                verification_status: true,
                legal_document_files: {
                    select: {
                        id: true,
                        file: true,
                        file_alt: true,
                        type: true,
                        sort_order: true
                    }
                },
            },
            orderBy: {
                created_at: 'desc'
            }
        });

         // add file url legal_document_files
         if (documents && documents.length > 0) {
            for (const record of documents) {
              // Add file URLs
              if (record.legal_document_files) {
                for (const file of record.legal_document_files) {
                  file['file_url'] = SojebStorage.url(
                    appConfig().storageUrl.legalDocuments + file.file,
                  );
                }
              }
            }
        }

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

      return {
        success: true,
        data: documents,
       pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage
       }
      };
    }

    async findOne(id: string) {
        const legalDocument = await this.prisma.legalDocument.findFirst({
            where: {
                id,
                deleted_at: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_document_files: {
                    select: {
                        id: true,
                        file: true,
                        file_alt: true,
                        type: true,
                        sort_order: true
                    },
                    orderBy: {
                        sort_order: 'asc'
                    }
                }
            }
        });

        // add file url legal_document_files
        if (legalDocument && legalDocument.legal_document_files.length > 0) {
            for (const file of legalDocument.legal_document_files) {
                file['file_url'] = SojebStorage.url(
                    appConfig().storageUrl.legalDocuments + file.file,
                );
            }
        }

        if (!legalDocument) {
            throw new NotFoundException('Legal document not found');
        }

        return { success: true,  data: legalDocument };
    }

    async update(
        id: string,
        updateLegalDocumentDto: UpdateLegalDocumentDto,
        files?: {
            legal_document_files?: Express.Multer.File[];
        }
    ) {
        // Check if document exists
        const existingDocument = await this.prisma.legalDocument.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!existingDocument) {
            throw new NotFoundException('Legal document not found');
        }

        // If user_id is being updated, check if user exists
        if (updateLegalDocumentDto.user_id) {
            const user = await this.prisma.user.findUnique({
                where: { id: updateLegalDocumentDto.user_id }
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }
        }

        const updateData: any = { ...updateLegalDocumentDto };

        // Convert expires_at string to Date if provided
        if (updateLegalDocumentDto.expires_at) {
            updateData.expires_at = new Date(updateLegalDocumentDto.expires_at);
        }

        await this.prisma.legalDocument.update({
            where: { id },
            data: updateData
        });

        // Handle file updates if provided
        if (files?.legal_document_files && files.legal_document_files.length > 0) {
            // Delete existing files from storage and database
            const existingFiles = await this.prisma.legalDocumentFile.findMany({
                where: { legal_document_id: id }
            });

            for (const file of existingFiles) {
                await SojebStorage.delete(
                    appConfig().storageUrl.legalDocuments + file.file
                );
            }

            await this.prisma.legalDocumentFile.deleteMany({
                where: { legal_document_id: id }
            });

            // Add new files
            const legal_document_files_data = files.legal_document_files.map((file, index) => ({
                file: file.filename,
                file_alt: file.originalname,
                legal_document_id: id,
                type: updateLegalDocumentDto.document_type || existingDocument.document_type,
                sort_order: index
            }));

            await this.prisma.legalDocumentFile.createMany({
                data: legal_document_files_data,
            });
        }

        // Fetch updated document with files
        const updatedDocument = await this.prisma.legalDocument.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_document_files: {
                    orderBy: {
                        sort_order: 'asc'
                    }
                }
            }
        });

        return { success: true,  data: updatedDocument };
    }

    async remove(id: string) {
        const legalDocument = await this.prisma.legalDocument.findFirst({
            where: {
                id,
                deleted_at: null
            },
            include: {
                legal_document_files: true
            }
        });

        if (!legalDocument) {
            throw new NotFoundException('Legal document not found');
        }

        // Delete files from storage
        for (const file of legalDocument.legal_document_files) {
            await SojebStorage.delete(
                appConfig().storageUrl.legalDocuments + file.file
            );
        }

        // Soft delete
        await this.prisma.legalDocument.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        return { success: true, message: 'Legal document deleted successfully' };
    }

    async verifyDocument(id: string, verifyDto: VerifyLegalDocumentDto, adminUserId: string) {
        const legalDocument = await this.prisma.legalDocument.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!legalDocument) {
            throw new NotFoundException('Legal document not found');
        }

        const updateData: any = {
            verification_status: verifyDto.verification_status,
            verified_at: new Date(),
            verified_by: adminUserId
        };

        if (verifyDto.admin_notes) {
            updateData.admin_notes = verifyDto.admin_notes;
        }

        if (verifyDto.verification_score !== undefined) {
            updateData.verification_score = verifyDto.verification_score;
        }

        const updatedDocument = await this.prisma.legalDocument.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_document_files: {
                    orderBy: {
                        sort_order: 'asc'
                    }
                }
            }
        });

        return { success: true,  data: updatedDocument };
    }

}
