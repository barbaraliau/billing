'use strict';

const moment = require('moment');
const inherits = require('util').inherits;
const Router = require('./index');
const middleware = require('storj-service-middleware');
const errors = require('storj-service-error-types');
const Promise = require('bluebird');

function PaymentProcessorsRouter(options) {
  if (!(this instanceof PaymentProcessorsRouter)) {
    return new PaymentProcessorsRouter(options);
  }

  Router.apply(this, arguments);

  this.models = options.storage.models;
  this.authenticate = middleware.authenticate(options.storage);
}

inherits(PaymentProcessorsRouter, Router);

PaymentProcessorsRouter.prototype.addPaymentMethod = function(req, res, next) {
  console.log('hai', req.body);
  const PaymentProcessor = this.models.PaymentProcessor;

  PaymentProcessor.findOne({ user: req.user.id, default: true })
    .then((processor) => {
      console.log('processor', processor);
      if (!processor) {
        console.log('no processor, make one');
        const pp = new PaymentProcessor({
          user: req.user.id,
          name: req.body.processor.name,
          default: req.body.processor.default
        });

        pp.adapter
          .register(req.body.data, req.user.id)
          .then((result) => {
            console.log('result from pp', result);
            pp.data = result;
            pp.save()
              .then((pp) => {
                console.log('pppp', pp);
                const user = req.user;
                user.isFreeTier = false;
                user.save()
                  .then((user) => res.status(200).send({ pp: pp.toObject(), user }))
                  .catch((err) => res.status(err.message || 500).send(err));

              })
              .catch((err) => res.status(500).send(err));
          }).catch((err) => res.status(err.status || 500).send(err));
      } else {
        console.log('have procesor');
        processor.addPaymentMethod(req.body.data)
          .then((result) => {
            console.log('result from adding', result);
            const user = req.user;
            user.isFreeTier = false;
            user.save()
              .then((user) => {
                console.log('user', user);
                res.status(200).send({ pp: result.toObject(), user })
              })
              .catch((err) => {
                console.error('err awehklasdf', err)
                res.status(500).send(new errors.InternalError(err));
              });
          })
          .catch((err) => res.status(err.status || 500).send(err));
      }
  })

};

PaymentProcessorsRouter.prototype.removePaymentMethod = function(req, res, next) {
  const PaymentProcessor = this.models.PaymentProcessor;
  const User = this.models.User;
  const ppId = req.body.ppId;
  const methodId = req.body.methodId;

  Promise.coroutine(function* () {
    const pp = yield PaymentProcessor.findOne({ _id: ppId });

    if (pp.paymentMethods.length <= 0) {
      console.log('No payment methods to remove');
      return res.status(200).send(
        `No payment processor with ${ppId} id`
      );
    }

    yield pp.adapter.removePaymentMethod(methodId)

    const user = req.user;
    user.isFreeTier = true;
    const savedUser = yield user.save();
    const newPP = yield PaymentProcessor.findOne({ _id: ppId });

    res.status(200).send({ user, pp: newPP });
  })().catch((err) => {
    console.error('REMOVE PAYMENT METHOD err', err.message);
    res.status(err.status || 500).send(err)
  });
};

PaymentProcessorsRouter.prototype.getDefaultPP = function(req, res, next) {
  const PaymentProcessor = this.models.PaymentProcessor;

  PaymentProcessor
    .findOne({ user: req.user.id, default: true })
    .then((result) => res.status(200).send({ pp: result.toObject() }))
    .catch((err) => res.status(500).send(err));
};

/**
 * Export definitions
 * @private
 */
PaymentProcessorsRouter.prototype._definitions = function() {
  return [
    ['POST', '/pp/method/add',
      this.authenticate,
      this.addPaymentMethod
    ],
    ['POST','/pp/method/remove',
      this.authenticate,
      this.removePaymentMethod
    ],
    ['GET', '/pp/default',
      this.authenticate,
      this.getDefaultPP
    ]
  ];
};

module.exports = PaymentProcessorsRouter;