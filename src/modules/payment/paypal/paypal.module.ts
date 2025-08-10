import { Module } from '@nestjs/common';
import { PayPalService } from './paypal.service';
import { PayPalController } from './paypal.controller';

@Module({
    imports: [],
    controllers: [PayPalController],
    providers: [PayPalService],
    exports: [PayPalService],
})
export class PayPalModule { }
