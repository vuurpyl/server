import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { ContextService } from './context.service';
import { Context, IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '../ecosystem-model/ecosystem-model.service.authorization';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';

@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationEngine: AuthorizationEngineService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationRules(context: IContext): Promise<IContext> {
    // cascade
    const ecosystemModel = await this.contextService.getEcosystemModel(context);
    ecosystemModel.authorization = await this.authorizationEngine.inheritParentAuthorization(
      ecosystemModel.authorization,
      context.authorization
    );
    context.ecosystemModel = await this.ecosysteModelAuthorizationService.applyAuthorizationRules(
      ecosystemModel
    );

    context.aspects = await this.contextService.getAspects(context);
    for (const aspect of context.aspects) {
      aspect.authorization = await this.authorizationEngine.inheritParentAuthorization(
        aspect.authorization,
        context.authorization
      );
    }

    context.references = await this.contextService.getReferences(context);
    for (const reference of context.references) {
      if (!reference.authorization)
        reference.authorization = new AuthorizationDefinition();
      reference.authorization = await this.authorizationEngine.inheritParentAuthorization(
        reference.authorization,
        context.authorization
      );
    }

    return await this.contextRepository.save(context);
  }
}
