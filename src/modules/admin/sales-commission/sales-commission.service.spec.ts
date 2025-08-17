import { Test, TestingModule } from '@nestjs/testing';
import { SalesCommissionService } from './sales-commission.service';

describe('SalesCommissionService', () => {
  let service: SalesCommissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesCommissionService],
    }).compile();

    service = module.get<SalesCommissionService>(SalesCommissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
