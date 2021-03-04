import { Application } from '@domain/application/application.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { UserGroup } from '@domain/user-group/user-group.entity';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { User } from '@domain/user/user.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { GroupNotInitializedException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private challengeService: ChallengeService
  ) {}

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a challenge.',
  })
  @Profiling.api
  async groups(@Parent() challenge: Challenge) {
    const groups = await this.challengeService.loadGroups(challenge);
    return groups;
  }

  @ResolveField('opportunities', () => [Opportunity], {
    nullable: true,
    description: 'The set of opportunities within this challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    const opportunities = await this.challengeService.loadOpportunities(
      challenge
    );
    return opportunities;
  }

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('contributors', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this challenge.',
  })
  @Profiling.api
  async contributors(@Parent() challenge: Challenge) {
    const group = await this.challengeService.getMembersGroup(challenge);
    const members = group.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised on challenge: ${challenge.name}`,
        LogContext.CHALLENGES
      );
    return members;
  }

  @Roles(
    AuthorisationRoles.GlobalAdmins,
    AuthorisationRoles.EcoverseAdmins,
    AuthorisationRoles.CommunityAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('applications', () => [Application], {
    nullable: false,
    description: 'Application available for this ecoverese.',
  })
  @Profiling.api
  async applications(@Parent() challenge: Challenge) {
    const apps = await this.challengeService.getApplications(challenge);
    return apps || [];
  }
}
