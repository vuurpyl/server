import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityAdapter } from './activity.adapter';
import { SubscriptionPublishServiceModule } from '@services/subscriptions/subscription-publish-service';
import { Community } from '@domain/community/community/community.entity';

@Module({
  imports: [
    ActivityModule,
    SubscriptionPublishServiceModule,
    TypeOrmModule.forFeature([Collaboration, Community, Callout]),
  ],
  providers: [ActivityAdapter],
  exports: [ActivityAdapter],
})
export class ActivityAdapterModule {}
