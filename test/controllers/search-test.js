const assert = require('assert');
const support = require('../support');
const simple = require('simple-mock');
const flightApi = require('../../app/flight-api');
const fixtures = require('../fixtures');

const fakeFetch = support.fakeFetch;
const fakeServer = support.fakeServer;

describe('Controllers - Search', () => {
  beforeEach(() => {
    simple.mock(global, 'fetch', fakeFetch);
  });

  afterEach(() => {
    simple.restore(global, 'fetch');
    fakeFetch.restore();
  });

  it('responds to /search', (done) => {
    fakeFetch.mockRequest(flightApi.urlFor('airlines'), {
      status: 200, body: fixtures.airlines
    });
    fakeFetch.mockRequest(
      flightApi.urlFor('flight_search/1?date=2017-01-01&from=a&to=b'),
      { status: 200, body: fixtures.flights['1']['2017-01-01'] }
    );
    fakeFetch.mockRequest(
      flightApi.urlFor('flight_search/1?date=2017-01-02&from=a&to=b'),
      { status: 200, body: fixtures.flights['1']['2017-01-02'] }
    );
    fakeFetch.mockRequest(
      flightApi.urlFor('flight_search/1?date=2016-01-01&from=a&to=b'),
      { status: 200, body: fixtures.flights['1']['2016-01-01'] }
    );
    fakeFetch.mockRequest(
      flightApi.urlFor('flight_search/2?date=2017-01-01&from=a&to=b'),
      { status: 200, body: fixtures.flights['2']['2017-01-01'] }
    );
    fakeServer()
    .get('/search')
    .query({ from: 'a', to: 'b', dates: '2017-01-01,2017-01-02' })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, resp) => {
      assert.equal(err, null);
      assert.deepEqual(resp.body, {
        '2017-01-01': [
          { key: 1, price: 100 },
          { key: 2, price: 200 },
          { key: 5, price: 100 }
        ],
        '2017-01-02': [
          { key: 3, price: 50 }
        ]
      });
      done();
    });
  });

  it("handles flight-api's errors correctly", (done) => {
    fakeFetch.mockRequest(flightApi.urlFor('airlines'), {
      status: 500,
      body: 'Server error'
    });
    fakeServer()
    .get('/search')
    .query({ from: 'a', to: 'b', dates: '2017-01-01,2017-01-02' })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(500)
    .end(done);
  });

  it('returns 404 when no flights are found', (done) => {
    fakeFetch.mockRequest(flightApi.urlFor('airlines'), {
      status: 200, body: fixtures.airlines
    });
    fakeServer()
    .get('/search')
    .query({ from: 'a', to: 'b', dates: '2017-01-01,2017-01-02' })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(404)
    .end(done);
  });

  it('returns 400 when parameters are missing', (done) => {
    const doRequest = (params) => {
      return fakeServer()
      .get('/search')
      .query(params)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400);
    };

    Promise.all([
      doRequest({ from: 'a' }),
      doRequest({ to: 'b' }),
      doRequest({ from: 'a', to: 'b' }),
      doRequest({ from: 'a', dates: '2017-01-01' }),
      doRequest({ to: 'a', dates: '2017-01-01' }),
      doRequest({ dates: '2017-01-01' })
    ])
    .then(() => done())
    .catch(done);
  });
});