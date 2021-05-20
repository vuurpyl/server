import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ILifecycle } from '@domain/common/lifecycle';
import { IChallenge } from '@domain/challenge/challenge';
import { INVP } from '@domain/common/nvp';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(private challengeService: ChallengeService) {}

  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(@Parent() challenge: Challenge) {
    return await this.challengeService.getCommunity(challenge.id);
  }

  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the challenge.',
  })
  @Profiling.api
  async context(@Parent() challenge: Challenge) {
    return await this.challengeService.getContext(challenge.id);
  }

  @ResolveField('opportunites', () => [IOpportunity], {
    nullable: true,
    description: 'The Opportunities for the challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    return await this.challengeService.getOpportunities(challenge.id);
  }

  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifeycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(@Parent() challenge: Challenge) {
    return await this.challengeService.getLifecycle(challenge.id);
  }

  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The set of child Challenges within this challenge.',
  })
  @Profiling.api
  async challenges(@Parent() challenge: Challenge) {
    return await this.challengeService.getChildChallenges(challenge);
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Challenge.',
  })
  @Profiling.api
  async activity(@Parent() challenge: Challenge) {
    return await this.challengeService.getActivity(challenge);
  }
}
