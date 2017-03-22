'use strict';

const graphql = require('graphql');

const DebitType = new graphql.GraphQLObjectType({
  name: 'Debit',
  fields: {
    id: {type: graphql.GraphQLString},
    amount: {type: graphql.GraphQLFloat},
    created: {type: graphql.GraphQLString},
    type: {type: graphql.GraphQLString},
    storage: {type: graphql.GraphQLFloat},
    bandwidth: {type: graphql.GraphQLFloat}
  }
});

module.exports = DebitType;
