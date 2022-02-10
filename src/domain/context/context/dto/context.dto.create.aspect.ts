import { UUID } from '@domain/common/scalars';
import { CreateAspectInput } from '@domain/context/aspect/dto/aspect.dto.create';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateAspectOnContextInput extends CreateAspectInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;
}
