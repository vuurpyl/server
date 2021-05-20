import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { collaborationData, relationsData } from '@test/utils/common-params';

export const createRelationMutation = async (
  opportunityId: string,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateRelation($relationData: CreateRelationInput!) {
      createRelation(relationData: $relationData) {
          ${relationsData}
      }
    }`,
    variables: {
      relationData: {
        parentID: parseFloat(opportunityId),
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateRelationMutation = async (
  relationId: any,
  relationActorName: string,
  relationDescription?: string,
  relationType?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateRelation($relationData: RelationInput!, $ID: Float!) {
        updateRelation(relationData: $relationData, ID: $ID) {
          ${relationsData}
        }
      }`,
    variables: {
      ID: parseFloat(relationId),
      relationData: {
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeRelationMutation = async (relationId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteRelation($deleteData: DeleteRelationInput!) {
      deleteRelation(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: parseFloat(relationId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getRelationsPerOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse {challenge(ID: "${opportunityId}") {
      ${collaborationData}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
