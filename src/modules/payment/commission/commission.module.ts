import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommissionService } from './commission.service';

@Module({
    imports: [PrismaModule],
    providers: [CommissionService],
    exports: [CommissionService],
})
export class CommissionModule { }

