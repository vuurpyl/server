import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationVerifiedCredential,
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
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private baseChallengeService: BaseChallengeService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
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
    // Also update the verified credential rules
    challenge.authorization.verifiedCredentialRules =
      await this.appendVerifiedCredentialRules(challenge.id);

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      this.challengeRepository
    );
    challenge.childChallenges = await this.challengeService.getChildChallenges(
      challenge
    );
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationPolicy(
          childChallenge,
          challenge.authorization
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

    const challengeAdmin = {
      type: AuthorizationCredential.CHALLENGE_ADMIN,
      resourceID: challengeID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
    };
    rules.push(challengeAdmin);

    const challengeMember = {
      type: AuthorizationCredential.CHALLENGE_MEMBER,
      resourceID: challengeID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(challengeMember);

    return rules;
  }

  async appendVerifiedCredentialRules(challengeID: string): Promise<string> {
    const rules: AuthorizationPolicyRuleVerifiedCredential[] = [];
    const agent = await this.challengeService.getAgent(challengeID);

    const stateChange = {
      type: AuthorizationVerifiedCredential.STATE_MODIFICATION_CREDENTIAL,
      resourceID: agent.did,
      grantedPrivileges: [AuthorizationPrivilege.UPDATE],
    };
    rules.push(stateChange);

    return JSON.stringify(rules);
  }
}
