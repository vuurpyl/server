import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Updates } from '@domain/communication/updates/updates.entity';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { Communication } from '@domain/communication/communication/communication.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Updates]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [IdentityResolverService, CommunityResolverService],
  exports: [IdentityResolverService, CommunityResolverService],
})
export class EntityResolverModule {}
