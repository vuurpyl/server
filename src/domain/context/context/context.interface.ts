import { IReference } from '@domain/common/reference/reference.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IEcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { IVisual } from '@domain/common/visual/visual.interface';
import { ILocation } from '@domain/common/location/location.interface';

@ObjectType('Context')
export abstract class IContext extends IAuthorizable {
  @Field(() => String, {
    nullable: true,
    description: 'A one line description',
  })
  tagline?: string;

  @Field(() => String, {
    nullable: true,
    description: 'A detailed description of the current situation',
  })
  background?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  vision?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  impact?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  who?: string;

  @Field(() => ILocation, {
    nullable: true,
    description: 'Location of this entity',
  })
  location?: ILocation;

  references?: IReference[];

  ecosystemModel?: IEcosystemModel;

  visuals?: IVisual[];
}
