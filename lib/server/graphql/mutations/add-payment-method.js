'use strict';

const graphql = require('graphql');
const graphqlService = require('../index');
const paymentProcessorType = require('../types/payment-processor');
const paymentProcessorEnum = require('../types/payment-processor-enum');

const addPaymentMethod = {
  type: paymentProcessorType,
  args: {
    name: {
      type: paymentProcessorEnum
    },
    data: {
      type: graphql.GraphQLString
    }
  },
  resolve: function(_, args) {
    return graphqlService.defaultPaymentProcessor
      .then((paymentProcessor) => {
        const data = JSON.parse(args.data);

        return graphqlService.currentUser.then((user) => {
          console.log('graphql service current user: ', user);
          if (!paymentProcessor) {
            return graphqlService.addPaymentProcessor(args.name, data);
          }

          if (paymentProcessor.paymentMethods > 1) {
            throw new Error('Multiple card support not available at this time.');
          }

          return new Promise((resolve, reject) => {
            paymentProcessor
              .addPaymentMethod(data)
              .then((paymentProcessor) => {
                if (user.isFreeTier) {
                  user.isFreeTier = false;
                  console.log('user isFreeTier should be false: %j', user.isFreeTier);
                  return user.save()
                    .then((paymentProcessor) => resolve(paymentProcessor))
                    .catch((err) => reject(err));
                }
                return resolve(paymentProcessor)
              })
              .catch((err) => reject(err));
          });
        })
      }).catch((err) => {
        console.error(err);
        return { error: new Error(err) };
    });
  }
};

module.exports = addPaymentMethod;
