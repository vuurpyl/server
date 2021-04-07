import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateTagsetInput {
  @Field({ nullable: false })
  ID!: number;

  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
