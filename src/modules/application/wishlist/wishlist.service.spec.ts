import { Test, TestingModule } from '@nestjs/testing';
import { WishListService } from './wishlist.service';

describe('WishListService', () => {
    let service: WishListService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WishListService],
        }).compile();

        service = module.get<WishListService>(WishListService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
}); 