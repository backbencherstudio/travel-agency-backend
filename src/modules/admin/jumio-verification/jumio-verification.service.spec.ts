import { Test, TestingModule } from '@nestjs/testing';
import { JumioVerificationService } from './jumio-verification.service';

describe('JumioVerificationService', () => {
  let service: JumioVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JumioVerificationService],
    }).compile();

    service = module.get<JumioVerificationService>(JumioVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
