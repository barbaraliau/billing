const httpMocks = require('node-mocks-http');
const sinon = require('sinon');
var sinonStubPromise = require('sinon-stub-promise');
sinonStubPromise(sinon);
const storj = require('storj-lib');
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;
const CreditsRouter = require('../../../lib/server/routes/credits');
const errors = require('storj-service-error-types');
// const log = require('../../../lib/logger');
const routerOpts = require('../../_fixtures/router-opts');
const mongoose = require('mongoose');

describe('Credits Router', function() {

  // var promise;
  //
  // beforeEach(function() {
  //   promise = sinon.stub().returnsPromise();
  // });

  const creditsRouter = new CreditsRouter(routerOpts);
  var marketingDoc;

  var sender = {
    _id: 'sender@example.com',
    hashpass: storj.utils.sha256('password')
  };

  before(function(done) {
    marketingDoc = new creditsRouter.models.Marketing({
      user: 'sender@example.com',
      referralLink: 'abc-123'
    });

    var sender = new creditsRouter.models.User({
      _id: 'sender@example.com',
      hashpass: storj.utils.sha256('password')
    });
    done();
  });

  describe('#handleSignups', function() {

    describe('#handleReferralSignups', function() {

      it('return create referral with valid props', function() {
        var request = httpMocks.createRequest({
          method: 'POST',
          url: '/signups',
          body: {
            email: 'recipient@example.com',
            referralLink: 'abc-123'
          }
        });

        var response = httpMocks.createResponse({
          req: request,
          eventEmitter: EventEmitter
        });


        var _referralCreate = sinon.stub(
          creditsRouter.storage.models.Referral,
          'create'
        ).returnsPromise()

        response.on('end', function() {
          console.log('hai hahiahiahai');
          _referralCreate.restore();
          console.log('blah b lah blah');
        })

        creditsRouter.handleSignups(request, response);
        // referral
      });

    });

  });

});
// // Test
// describe('stubbing a promise', function() {
//   var promise;
//
//   beforeEach(function() {
//     promise = sinon.stub().returnsPromise();
//   });
//
//   it('can resolve', function() {
//     promise.resolves('resolve value')
//
//     var testObject = {};
//     doSomethingWithAPromise(promise, testObject);
//     expect(testObject.resolved).to.eql('resolve value');
//   });
//
//   it('can reject', function() {
//     promise.rejects('reject value')
//
//     var testObject = {};
//     doSomethingWithAPromise(promise, testObject);
//     expect(testObject.rejected).to.eql('reject value');
//   });
// }
