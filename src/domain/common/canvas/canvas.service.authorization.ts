import { Injectable } from '@nestjs/common';
import { AuthorizationCredential } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { CanvasService } from './canvas.service';
import { ICanvas } from './canvas.interface';
import { CanvasCheckoutAuthorizationService } from '../canvas-checkout/canvas.checkout.service.authorization';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Injectable()
export class CanvasAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasService: CanvasService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    canvas: ICanvas,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICanvas> {
    canvas.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        canvas.authorization,
        parentAuthorization
      );

    canvas.authorization = this.appendPrivilegeRules(canvas.authorization);

    if (canvas.checkout) {
      canvas.checkout =
        await this.canvasCheckoutAuthorizationService.applyAuthorizationPolicy(
          canvas.checkout,
          canvas.authorization
        );
    }
    return await this.canvasService.save(canvas);
  }

  private extendAuthorizationPolicyForCheckoutOwner(
    checkout: ICanvasCheckout
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    if (checkout.lockedBy && checkout.lockedBy.length > 0) {
      const lockedBy = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.UPDATE],
        AuthorizationCredential.USER_SELF_MANAGEMENT,
        checkout.lockedBy
      );

      newRules.push(lockedBy);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        checkout.authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_CANVAS],
      AuthorizationPrivilege.UPDATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
