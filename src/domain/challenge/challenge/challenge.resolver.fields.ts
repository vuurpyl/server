import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { Community } from '@domain/community/community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizationRolesGlobal } from '@core/authorization/authorization.roles.global';
import { AuthorizationRulesGuard } from '@core/authorization/authorization.rules.guard';

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(private challengeService: ChallengeService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(@Parent() challenge: Challenge) {
    const community = await this.challengeService.getCommunity(challenge.id);
    return community;
  }

  @ResolveField('lifecycle', () => Lifecycle, {
    nullable: true,
    description: 'The lifeycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(@Parent() challenge: Challenge) {
    return await this.challengeService.getLifecycle(challenge.id);
  }

  @ResolveField('opportunities', () => [Opportunity], {
    nullable: true,
    description: 'The set of opportunities within this challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    const opportunities = await this.challengeService.getOpportunities(
      challenge
    );
    return opportunities;
  }
}
