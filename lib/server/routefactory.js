'use strict';

module.exports = function RouteFactory(options) {
  return ([
    require('./routes/credits'),
    require('./routes/debits'),
    require('./routes/users'),
    require('./routes/graphql'),
    require('./routes/referrals')
  ]).map(function(Router) {
    return Router({
      config: options.config,
      network: options.network,
      storage: options.storage,
      mailer: options.mailer,
      contracts: options.contracts
    }).getEndpointDefinitions();
  }).reduce(function(set1, set2) {
    return set1.concat(set2);
  }, []);
};
