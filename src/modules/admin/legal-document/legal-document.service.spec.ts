import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentService } from './legal-document.service';

describe('LegalDocumentService', () => {
  let service: LegalDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegalDocumentService],
    }).compile();

    service = module.get<LegalDocumentService>(LegalDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
