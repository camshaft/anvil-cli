/**
 * Module dependencies
 */

var should = require('should');
var anvil = require('..');
var superagent = require('superagent');

describe('anvil', function() {
  it('should build a local slug', function(done) {
    var source = '/Users/cameron.bytheway/Projects/octanner/peer-comments-ui';
    var opts = {
      buildpack: 'https://github.com/ddollar/heroku-buildpack-multi.git'
    };
    anvil(source, opts, function(err, slug) {
      if (err) return done(err);
      console.log(slug);
      done();
    });
  });

  describe('local', function() {
    it('should sync a local directory', function(done) {
      var opts = {
        ignore: ['.git'],
        request: superagent,
        host: 'https://api.anvilworks.org',
        log: console.log.bind(console)
      };
      anvil.local.save(process.cwd(), 'app', opts, function(err, files) {
        if (err) return done(err.stack);
        console.log(files);
        done();
      });
    });
  });
});
