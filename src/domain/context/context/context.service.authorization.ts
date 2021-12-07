import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ContextService } from './context.service';
import { Context, IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { ICanvas } from '@domain/common/canvas/canvas.interface';

@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationPolicy(context: IContext): Promise<IContext> {
    // cascade
    const ecosystemModel = await this.contextService.getEcosystemModel(context);
    ecosystemModel.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        ecosystemModel.authorization,
        context.authorization
      );
    context.ecosystemModel =
      await this.ecosysteModelAuthorizationService.applyAuthorizationPolicy(
        ecosystemModel
      );

    context.aspects = await this.contextService.getAspects(context);
    for (const aspect of context.aspects) {
      aspect.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          aspect.authorization,
          context.authorization
        );
    }

    const canvases = await this.contextService.getCanvases(context);
    const updatedCanvases: ICanvas[] = [];
    for (const canvas of canvases) {
      const updatedCanvas =
        await this.canvasAuthorizationService.applyAuthorizationPolicy(
          canvas,
          context.authorization
        );
      updatedCanvases.push(updatedCanvas);
    }
    context.canvases = updatedCanvases;

    context.references = await this.contextService.getReferences(context);
    for (const reference of context.references) {
      if (!reference.authorization) {
        reference.authorization = new AuthorizationPolicy();
      }
      reference.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          context.authorization
        );
    }

    return await this.contextRepository.save(context);
  }
}
