import { Inject } from '@nestjs/common';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from './ecoverse.interface';
import { Ecoverse } from './ecoverse.entity';
import { Args, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Query(() => Ecoverse, {
    nullable: false,
    description:
      'An ecoverse. If no ID is specified then the first Ecoverse is returned.',
  })
  @Profiling.api
  async ecoverse(
    @Args('ID', { nullable: true }) ID?: number
  ): Promise<IEcoverse> {
    if (ID) return await this.ecoverseService.getEcoverseByIdOrFail(ID);
    return await this.ecoverseService.getFirstEcoverseOrFail();
  }
}
