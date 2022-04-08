import { INameable } from '@domain/common/entity/nameable-entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Aspect')
export abstract class IAspect extends INameable {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  typeDescription!: string;

  @Field(() => String)
  type!: string;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the Aspect',
  })
  tagset?: ITagset;

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  comments?: IComments;

  references?: IReference[];
}
