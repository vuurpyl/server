import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class VisualUploadImageInput {
  @Field({ nullable: false })
  visualID!: string;
}
