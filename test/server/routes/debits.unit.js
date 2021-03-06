const httpMocks = require('node-mocks-http');
const sinon = require('sinon');
const stubPromise = require('sinon-stub-promise');
stubPromise(sinon);
const rewire = require('rewire');
const storj = require('storj-lib');
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;
const Config = require('../../../lib/config');
const DebitsRouter = require('../../../lib/server/routes/debits');
const ReadableStream = require('stream').Readable;
const errors = require('storj-service-error-types');
const routerOpts = require('../../_fixtures/router-opts');
const Mailer = require('storj-service-mailer');
const Storage = require('storj-service-storage-models');
const moment = require('moment');
const assert = require('assert');

let sandbox;

beforeEach(function() {
  sandbox = sinon.sandbox.create();
});

afterEach(function() {
  sandbox.restore();
});

describe('#debitsRouter', function() {
  const debitsRouter = new DebitsRouter(routerOpts);

  describe('smoke test', function() {
    it('debitsRouter should exist with proper configs', function(done) {
      expect(debitsRouter).to.be.instanceOf(DebitsRouter);
      expect(debitsRouter.models).to.be.ok;
      expect(debitsRouter.mailer).to.be.ok;
      expect(debitsRouter.contracts).to.be.ok;
      expect(debitsRouter.storage).to.be.instanceOf(Storage);
      expect(debitsRouter.mailer).to.be.instanceOf(Mailer);
      expect(debitsRouter.config).to.equal(routerOpts.config);
      expect(debitsRouter.config).to.be.instanceOf(Config);
      done();
    });
  });

  describe('_create', function() {
    it('should create a debit and return the debit object', function(done) {
      var mockDebit = new debitsRouter.storage.models.Debit({
        amount: 666,
        user: 'lott.dylan@gmail.com',
        type: 'bandwidth',
        created: Date.now()
      });

      var mockPaymentProcessor = new debitsRouter.storage.models.PaymentProcessor({
        user: "dylan@storj.io",
        name: "stripe",
        default: true
      });

      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: mockDebit
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      var _createDebit = sandbox
        .stub(debitsRouter.storage.models.Debit, 'create')
        .returnsPromise();
      _createDebit.resolves(mockDebit);

      var _findPaymentProc = sandbox
        .stub(debitsRouter.storage.models.PaymentProcessor, 'findOne')
        .returnsPromise();
      _findPaymentProc.resolves(mockPaymentProcessor);

      var _find = sandbox
        .stub(debitsRouter.storage.models.Debit, 'find')
        .returnsPromise();
      _find.resolves([mockDebit]);

      var _sync = sandbox
        .stub(mockPaymentProcessor.adapter, 'syncDebits')
        .returnsPromise();
      _sync.resolves();

      res.on('end', function() {
        const data = res._getData();
        expect(data).to.be.ok;
        expect(data).to.be.an('object');
        expect(data.debit).to.be.ok;
        expect(data.debit).to.be.an('object');
        expect(data.debit.amount).to.equal(mockDebit.amount);
        expect(data.debit.amount).to.be.a('number');
        expect(data.debit.storage).to.be.a('number');
        expect(data.debit.bandwidth).to.be.a('number');
        expect(data.debit.created).to.be.a('date');
        expect(data.debit.id).to.be.a('string');
        expect(data.debit.user).to.be.a('string');
      });

      debitsRouter.createDebit(req, res);

      expect(_createDebit.callCount).to.equal(1);
      expect(_findPaymentProc.callCount).to.equal(1);
      expect(_find.callCount).to.equal(1);
      expect(_sync.callCount).to.equal(1);
      done();
    });

  });

  describe('_error handling', function() {
    it('should return 400 error if no user', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: {
          type: "bandwidth",
          amount: 123456,
          created: new Date()
        }
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      const _createSpy = sandbox.spy(debitsRouter.storage.models.Debit, 'create');

      res.on('end', function() {
        const data = res._getData();
        expect(res.statusCode).to.equal(400);
        expect(data).to.equal('Bad Request');
        expect(_createSpy.callCount).to.equal(0);
      });

      debitsRouter.createDebit(req, res);

      expect(_createSpy.callCount).to.equal(0);
      done();
    });

    it('should return 400 error if no amount', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: {
          user: "dylan@storj.io",
          type: "bandwidth",
          created: new Date()
        }
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      const _createSpy = sandbox.spy(debitsRouter.storage.models.Debit, 'create');

      res.on('end', function() {
        const data = res._getData();
        expect(res.statusCode).to.equal(400);
        expect(data).to.equal('Bad Request');
        expect(_createSpy.callCount).to.equal(0);
      });

      debitsRouter.createDebit(req, res);

      expect(_createSpy.callCount).to.equal(0);
      done();
    });

    it('should return 500 if create debit fails', function(done) {
      var mockDebit = new debitsRouter.storage.models.Debit({
        amount: 666,
        user: 'lott.dylan@gmail.com',
        type: 'bandwidth',
        created: new Date()
      });

      var mockPaymentProcessor = new debitsRouter.storage.models.PaymentProcessor({
        user: "dylan@storj.io",
        name: "stripe",
        default: true
      });

      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: mockDebit
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      var _createDebit = sandbox
        .stub(debitsRouter.storage.models.Debit, 'create')
        .returnsPromise();

      const err = new errors.InternalError('Panic!');
      _createDebit.rejects(err);

      res.on('end', function(done){
        const data = res._getData();
        expect(data.error).to.equal(123);
        expect(data.error.statusCode).to.equal(500);
        expect(data.error.message).to.equal('Panic!');
        expect(_createDebit.callCount).to.equal(1);
        done();
      });

      debitsRouter.createDebit(req, res);
      expect(_createDebit.callCount).to.equal(1);
      done();
    });

    it('should return 500 if error syncing debits', function(done) {
      var mockDebit = new debitsRouter.storage.models.Debit({
        amount: 666,
        user: 'lott.dylan@gmail.com',
        type: 'bandwidth',
        created: new Date()
      });

      var mockPaymentProcessor = new debitsRouter.storage.models.PaymentProcessor({
        user: "dylan@storj.io",
        name: "stripe",
        default: true
      });

      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: mockDebit
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      var _createDebit = sandbox
        .stub(debitsRouter.storage.models.Debit, 'create')
        .returnsPromise();

      _createDebit.resolves(mockDebit);

      var _findPaymentProc = sandbox
        .stub(debitsRouter.storage.models.PaymentProcessor, 'findOne')
        .returnsPromise();

      _findPaymentProc.resolves(mockPaymentProcessor);

      var _find = sandbox
        .stub(debitsRouter.storage.models.Debit, 'find')
        .returnsPromise();
      _find.resolves([mockDebit]);

      var _sync = sandbox
        .stub(mockPaymentProcessor.adapter, 'syncDebits')
        .returnsPromise();
      _sync.rejects(new errors.InternalError('Panic Sync Debits!'));

      res.on('end', function() {
        const data = res._getData();
        expect(data).to.be.ok;
        expect(data.error).to.be.instanceOf(Error);
        expect(data.debit).to.equal(mockDebit);
        expect(data.error.message).to.equal('Panic Sync Debits!');
      });

      debitsRouter.createDebit(req, res);

      expect(_findPaymentProc.callCount).to.equal(1);
      expect(_createDebit.callCount).to.equal(1);
      expect(_find.callCount).to.equal(1);
      expect(_sync.callCount).to.equal(1);
      done();
    });

    it('should return 201 with new debit if no paymentProc', (done) => {
      var mockDebit = new debitsRouter.storage.models.Debit({
        amount: 666,
        user: 'lott.dylan@gmail.com',
        type: 'bandwidth',
        created: new Date()
      });

      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/debits',
        body: mockDebit
      });

      var res = httpMocks.createResponse({
        eventEmitter: EventEmitter,
        req: req
      });

      var _createDebit = sandbox
        .stub(debitsRouter.storage.models.Debit, 'create')
        .returnsPromise();

      _createDebit.resolves(mockDebit);

      var _findPaymentProc = sandbox
        .stub(debitsRouter.storage.models.PaymentProcessor, 'findOne')
        .returnsPromise();

      _findPaymentProc.resolves(null);

      var _find = sandbox
        .stub(debitsRouter.storage.models.Debit, 'find')
        .returnsPromise();
      _find.resolves([mockDebit]);

      res.on('end', function() {
        const data = res._getData();
        expect(data).to.be.ok;
        expect(data.debit).to.equal(mockDebit);
      });

      debitsRouter.createDebit(req, res);

      expect(_findPaymentProc.callCount).to.equal(1);
      expect(_createDebit.callCount).to.equal(1);
      expect(_find.callCount).to.equal(1);
      done();
    });

    it('#_getBillingPeriodFor', (done) => {
      const refMoment = moment.utc([2011, 3, 27])
      const billingDate = refMoment.date();
      const date = debitsRouter._getBillingPeriodFor(refMoment, billingDate);
      expect(date).to.be.an('object');
      expect(date.startMoment).to.be.instanceOf(moment);
      expect(date.endMoment).to.be.instanceOf(moment);
      expect(moment(date.endMoment) - moment(date.startMoment)).to.equal(2678400000);
      done();
    });

    it('#_getBillingPeriodFor with default params', (done) => {
      const date = debitsRouter._getBillingPeriodFor();
      expect(date).to.be.an('object');
      expect(date.startMoment).to.be.instanceOf(moment);
      expect(date.endMoment).to.be.instanceOf(moment);
      done();
    })
  });
});
