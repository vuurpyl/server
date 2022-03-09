import { ConfigurationTypes } from '@common/enums';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import configuration from '@config/configuration';
import {
  configQuery,
  hubsQuery,
  meQuery,
  serverMetadataQuery,
} from '@config/graphql';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';
import { HttpExceptionsFilter } from '@core/error-handling/http.exceptions.filter';
import { RequestLoggerMiddleware } from '@core/middleware/request.logger.middleware';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { Opportunity } from '@domain/collaboration';
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCommunicationModule } from '@services/admin/communication/admin.communication.module';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { WinstonConfigService } from '@src/config/winston.config';
import { MembershipModule } from '@src/services/domain/membership/membership.module';
import { MetadataModule } from '@src/services/domain/metadata/metadata.module';
import { SearchModule } from '@src/services/domain/search/search.module';
import { KonfigModule } from '@src/services/platform/configuration/config/config.module';
import { IpfsModule } from '@src/services/platform/ipfs/ipfs.module';
import { print } from 'graphql/language/printer';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';

// Todo: nasty hack to affect the JS definitions loading order to avoid issues with migration failing
// due to objects being undefined.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const opportunity: Opportunity | undefined = undefined;
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        insecureAuth: true,
        synchronize: false,
        cache: true,
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        host: configService.get(ConfigurationTypes.STORAGE)?.database?.host,
        port: configService.get(ConfigurationTypes.STORAGE)?.database?.port,
        username: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.username,
        password: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.password,
        database: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.schema,
        logging: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.logging,
      }),
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        cors: false, // this is to avoid a duplicate cors origin header being created when behind the oathkeeper reverse proxy
        uploads: false,
        autoSchemaFile: true,
        introspection: true,
        playground: {
          settings: {
            'request.credentials': 'include',
          },
          tabs: [
            {
              name: 'Me',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(meQuery),
            },
            {
              name: 'Hubs',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/private/graphql`,
              query: print(hubsQuery),
            },
            {
              name: 'Configuration',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/public/graphql`,
              query: print(configQuery),
            },
            {
              name: 'Server Metadata',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint
              }/api/public/graphql`,
              query: print(serverMetadataQuery),
            },
          ],
        },
        fieldResolverEnhancers: ['guards'],
        sortSchema: true,
        installSubscriptionHandlers: true,
        context: ({ req, connection }) =>
          // once the connection is established in onConnect, the context will have the user populated
          connection ? { req: connection.context } : { req },
        subscriptions: {
          'subscriptions-transport-ws': {
            keepAlive: 5000,
            onConnect: async (
              _: { [key: string]: any },
              __: { [key: string]: any },
              context: any
            ) => {
              const authHeader: string =
                context.request.headers.authorization || '';
              const msg = `[Websocket] Opening for user with token: ${authHeader.substring(
                0,
                20
              )}`;

              // dummy code to not trigger warnings
              if (msg.length === 0) {
                return; // console.log(msg);
              }
              // Note: passing through headers so can leverage http authentication setup
              // Details in https://github.com/nestjs/docs.nestjs.com/issues/394
              return { headers: { authorization: `${authHeader}` } };
            },
            onDisconnect: async (_: any, context: any) => {
              const authHeader: string = context.request.headers.authorization;
              const msg = `[Websocket] Closing for user with token: ${authHeader.substring(
                0,
                20
              )}`;
              // dummy code to not trigger warnings
              if (msg.length === 0) {
                return; // console.log(msg);
              }
            },
          },
        },
      }),
    }),
    ScalarsModule,
    AuthenticationModule,
    AuthorizationModule,
    HubModule,
    MetadataModule,
    BootstrapModule,
    SearchModule,
    MembershipModule,
    KonfigModule,
    IpfsModule,
    AdminCommunicationModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('/');
  }
}
