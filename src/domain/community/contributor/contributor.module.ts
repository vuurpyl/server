import { Module } from '@nestjs/common';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { KonfigModule } from '@services/platform/configuration/config/config.module';
import { ConfigModule } from '@nestjs/config';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PreferenceModule } from '@domain/common/preference';
import { ContributorService } from './contributor.service';
import { ContributorAuthorizationService } from './contributor.service.authorization';

@Module({
  imports: [
    ProfileModule,
    AgentModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    PreferenceModule,
    PreferenceSetModule,
    KonfigModule,
    ConfigModule,
  ],
  providers: [ContributorService, ContributorAuthorizationService],
  exports: [ContributorService, ContributorAuthorizationService],
})
export class ContributorModule {}
