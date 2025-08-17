import { Test, TestingModule } from '@nestjs/testing';
import { JumioVerificationController } from './jumio-verification.controller';
import { JumioVerificationService } from './jumio-verification.service';

describe('JumioVerificationController', () => {
  let controller: JumioVerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JumioVerificationController],
      providers: [JumioVerificationService],
    }).compile();

    controller = module.get<JumioVerificationController>(JumioVerificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
