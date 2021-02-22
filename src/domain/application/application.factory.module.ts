import { ApplicationFactoryService } from '@domain/application/application.factory';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [UserModule],
  providers: [ApplicationFactoryService],
  exports: [ApplicationFactoryService],
})
export class ApplicationFactoryModule {}
