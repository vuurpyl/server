import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { EcoverseService } from './ecoverse.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import {
  AuthorizationRuleCredential,
  IAuthorizationPolicy,
  UpdateAuthorizationPolicyInput,
} from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IEcoverse } from './ecoverse.interface';
import { Ecoverse } from './ecoverse.entity';

@Injectable()
export class EcoverseAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private ecoverseService: EcoverseService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async applyAuthorizationPolicy(
    ecoverse: IEcoverse,
    authorizationPolicyData?: UpdateAuthorizationPolicyInput
  ): Promise<IEcoverse> {
    // Store the current value of anonymousReadAccess
    const anonymousReadAccessCache =
      ecoverse.authorization?.anonymousReadAccess;
    // Ensure always applying from a clean state
    ecoverse.authorization = await this.authorizationPolicyService.reset(
      ecoverse.authorization
    );
    ecoverse.authorization = this.extendAuthorizationPolicy(
      ecoverse.authorization,
      ecoverse.id
    );
    if (authorizationPolicyData) {
      ecoverse.authorization.anonymousReadAccess =
        authorizationPolicyData.anonymousReadAccess;
    } else if (anonymousReadAccessCache === false) {
      ecoverse.authorization.anonymousReadAccess = false;
    }

    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      ecoverse,
      this.ecoverseRepository
    );

    // propagate authorization rules for child entities
    const challenges = await this.ecoverseService.getChallenges(ecoverse);
    for (const challenge of challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        ecoverse.authorization
      );
      challenge.authorization =
        await this.authorizationPolicyService.appendCredentialAuthorizationRule(
          challenge.authorization,
          {
            type: AuthorizationCredential.EcoverseAdmin,
            resourceID: ecoverse.id,
          },
          [AuthorizationPrivilege.DELETE]
        );
    }

    return await this.ecoverseRepository.save(ecoverse);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    ecoverseID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    const newRules: AuthorizationRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GlobalAdminCommunity,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(communityAdmin);

    const ecoverseAdmin = {
      type: AuthorizationCredential.EcoverseAdmin,
      resourceID: ecoverseID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
    newRules.push(ecoverseAdmin);

    const ecoverseMember = {
      type: AuthorizationCredential.EcoverseMember,
      resourceID: ecoverseID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(ecoverseMember);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
