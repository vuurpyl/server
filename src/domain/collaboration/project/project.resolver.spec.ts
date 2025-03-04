import { Test, TestingModule } from '@nestjs/testing';
import { ProjectResolverMutations } from './project.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ProjectResolver', () => {
  let resolver: ProjectResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ProjectResolverMutations>(ProjectResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
