import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { Type } from 'class-transformer';

@InputType()
export class CreateBaseChallengeInput extends CreateNameableInput {
  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContextInput)
  context?: CreateContextInput;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  lifecycleTemplate?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
