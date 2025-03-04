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
import { ScalarsModule } from '@domain/common/scalars/scalars.module';
import { CacheModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AdminCommunicationModule } from '@platform/admin/communication/admin.communication.module';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { WinstonConfigService } from '@src/config/winston.config';
import { MetadataModule } from '@src/platform/metadata/metadata.module';
import { SearchModule } from '@services/api/search/search.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { print } from 'graphql/language/printer';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import {
  ConnectionContext,
  SubscriptionsTransportWsWebsocket,
  WebsocketContext,
} from '@src/types';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { RolesModule } from '@services/api/roles/roles.module';
import { DataloaderService } from '@core/dataloader/dataloader.service';
import { DataloaderModule } from '@core/dataloader/dataloader.module';
import * as redisStore from 'cache-manager-redis-store';
import { RedisLockModule } from '@core/caching/redis/redis.lock.module';
import { ConversionModule } from '@services/api/conversion/conversion.module';
import { SessionExtendMiddleware } from '@src/core/middleware';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { MessageModule } from '@domain/communication/message/message.module';
import { LibraryModule } from '@library/library/library.module';
import { AspectMoveModule } from '@domain/collaboration/aspect/aspect.move.module';
import { FileManagerModule } from '@domain/common/file-manager/file.manager.module';
import { GeoLocationModule } from '@services/external/geo-location';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get(ConfigurationTypes.STORAGE)?.redis?.host,
        port: configService.get(ConfigurationTypes.STORAGE)?.redis?.port,
      }),
      inject: [ConfigService],
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
        charset: configService.get(ConfigurationTypes.STORAGE)?.database
          ?.charset,
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
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule, DataloaderModule],
      inject: [ConfigService, DataloaderService],
      useFactory: async (
        configService: ConfigService,
        dataloaderService: DataloaderService
      ) => ({
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
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/private/graphql`,
              query: print(meQuery),
            },
            {
              name: 'Hubs',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/private/graphql`,
              query: print(hubsQuery),
            },
            {
              name: 'Configuration',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/public/graphql`,
              query: print(configQuery),
            },
            {
              name: 'Server Metadata',
              endpoint: `${
                configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
              }/api/public/graphql`,
              query: print(serverMetadataQuery),
            },
          ],
        },
        fieldResolverEnhancers: ['guards'],
        sortSchema: true,
        /***
         * graphql-ws requires passing the request object through the context method
         * !!! this is graphql-ws ONLY
         */
        context: (ctx: ConnectionContext) => {
          if (isWebsocketContext(ctx)) {
            return {
              req: {
                ...ctx.extra.request,
                headers: {
                  ...ctx.extra.request.headers,
                  ...ctx.connectionParams?.headers,
                },
                connectionParams: ctx.connectionParams,
              },
              loaders: dataloaderService.createLoaders(),
            };
          }

          return { req: ctx.req, loaders: dataloaderService.createLoaders() };
        },
        subscriptions: {
          'subscriptions-transport-ws': {
            /***
             * subscriptions-transport-ws required passing the request object
             * through the onConnect method
             */
            onConnect: (
              connectionParams: Record<string, any>,
              websocket: SubscriptionsTransportWsWebsocket // couldn't find a better type
            ) => {
              return {
                req: { headers: websocket?.upgradeReq?.headers },
                loaders: dataloaderService.createLoaders(),
              };
            },
          },
          'graphql-ws': true,
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
    ActivityLogModule,
    RolesModule,
    KonfigModule,
    IpfsModule,
    AdminCommunicationModule,
    AgentModule,
    MessageModule,
    RegistrationModule,
    RedisLockModule,
    ConversionModule,
    LibraryModule,
    AspectMoveModule,
    FileManagerModule,
    GeoLocationModule,
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
    consumer
      .apply(RequestLoggerMiddleware, SessionExtendMiddleware)
      .forRoutes('/');
  }
}

const isWebsocketContext = (context: unknown): context is WebsocketContext =>
  !!(context as WebsocketContext)?.extra;
