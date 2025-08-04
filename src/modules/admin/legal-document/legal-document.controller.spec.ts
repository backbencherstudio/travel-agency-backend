import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentController } from './legal-document.controller';
import { LegalDocumentService } from './legal-document.service';

describe('LegalDocumentController', () => {
  let controller: LegalDocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalDocumentController],
      providers: [LegalDocumentService],
    }).compile();

    controller = module.get<LegalDocumentController>(LegalDocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
