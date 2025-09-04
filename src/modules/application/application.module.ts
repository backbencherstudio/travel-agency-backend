import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { FooterModule } from './footer/footer.module';
import { PackageModule } from './package/package.module';
import { BookingModule } from './booking/booking.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CancellationPolicyModule } from './cancellation-policy/cancellation-policy.module';
import { LanguageModule } from './language/language.module';
import { PageModule } from './page/page.module';
import { CouponModule } from './coupon/coupon.module';
import { WishListModule } from './wishlist/wishlist.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GiftCardModule } from './gift-card/gift-card.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    BlogModule,
    FaqModule,
    FooterModule,
    PackageModule,
    BookingModule,
    CheckoutModule,
    CancellationPolicyModule,
    LanguageModule,
    PageModule,
    CouponModule,
    WishListModule,
    DashboardModule,
    GiftCardModule,
  ],
})
export class ApplicationModule {}
