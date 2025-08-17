import { Test, TestingModule } from '@nestjs/testing';
import { SalesCommissionController } from './sales-commission.controller';
import { SalesCommissionService } from './sales-commission.service';

describe('SalesCommissionController', () => {
  let controller: SalesCommissionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesCommissionController],
      providers: [SalesCommissionService],
    }).compile();

    controller = module.get<SalesCommissionController>(SalesCommissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
