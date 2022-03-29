import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotInitializedException } from '@common/exceptions';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { OpportunityAuthorizationService } from '@domain/collaboration/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { BaseChallengeService } from '../base-challenge/base.challenge.service';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private baseChallengeService: BaseChallengeService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined,
    parentCommunityCredential: ICredential
  ): Promise<IChallenge> {
    challenge.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        challenge.authorization,
        parentAuthorization
      );
    challenge.authorization = this.appendCredentialRules(
      challenge.authorization,
      challenge.id
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      this.challengeRepository
    );

    challenge.community = await this.challengeService.getCommunity(
      challenge.id
    );
    challenge.community.authorization =
      await this.extendMembershipAuthorizationPolicy(
        challenge.community.authorization,
        parentCommunityCredential
      );

    // Cascade
    const challengeCommunityCredential =
      await this.challengeService.getCommunityCredential(challenge.id);
    challenge.childChallenges = await this.challengeService.getChildChallenges(
      challenge
    );
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationPolicy(
          childChallenge,
          challenge.authorization,
          challengeCommunityCredential
        );
      }
    }
    challenge.opportunities = await this.challengeService.getOpportunities(
      challenge.id
    );
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        await this.opportunityAuthorizationService.applyAuthorizationPolicy(
          opportunity,
          challenge.authorization
        );
      }
    }

    if (!challenge.community?.credential) {
      challenge.community =
        await this.baseChallengeService.setMembershipCredential(
          challenge,
          AuthorizationCredential.CHALLENGE_MEMBER
        );
    }

    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );
    if (preferenceSet) {
      challenge.preferenceSet =
        await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
          preferenceSet,
          challenge.authorization
        );
    }

    return await this.challengeRepository.save(challenge);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    challengeID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${challengeID}`,
        LogContext.CHALLENGES
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(challengeID)
    );

    return authorization;
  }

  private createCredentialRules(
    challengeID: string
  ): AuthorizationPolicyRuleCredential[] {
    const rules: AuthorizationPolicyRuleCredential[] = [];

    const challengeAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.CHALLENGE_ADMIN,
      challengeID
    );
    rules.push(challengeAdmin);

    const challengeMember = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.COMMUNITY_CONTEXT_REVIEW,
      ],
      AuthorizationCredential.CHALLENGE_MEMBER,
      challengeID
    );
    rules.push(challengeMember);

    return rules;
  }

  private extendMembershipAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    parentCommunityCredential: ICredential
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.CHALLENGES
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Any member of the parent community can apply
    const anyUserCanApply = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.COMMUNITY_APPLY],
      parentCommunityCredential.type,
      parentCommunityCredential.resourceID
    );
    anyUserCanApply.inheritable = false;
    newRules.push(anyUserCanApply);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
