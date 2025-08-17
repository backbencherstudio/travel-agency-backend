import { Module } from '@nestjs/common';
import { WishListService } from './wishlist.service';
import { WishListController } from './wishlist.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WishListController],
    providers: [WishListService],
    exports: [WishListService],
})
export class WishListModule { } 