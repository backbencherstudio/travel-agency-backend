import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LegalDocumentService } from './legal-document.service';
import { LegalDocumentController } from './legal-document.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LegalDocumentController],
  providers: [LegalDocumentService],
  exports: [LegalDocumentService],
})
export class LegalDocumentModule { }
