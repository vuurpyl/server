import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const projectLifecycleConfigDefault: ILifecycleDefinition = {
  id: 'project-lifecycle-default',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: 'beingRefined',
        ABANDONED: 'abandoned',
      },
    },
    beingRefined: {
      on: {
        ACTIVE: 'inProgress',
        ABANDONED: 'abandoned',
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: 'complete',
        ABANDONED: 'abandoned',
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABANDONED: 'archived',
      },
    },
    abandoned: {
      on: {
        REOPEN: 'inProgress',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
