/**
 * Module dependencies
 */

var chain = require('slide').chain;
var build = require('./util').build;

/**
 * Sync a local directory and build a slug
 *
 * @param {String} source
 * @param {String} buildpack
 * @param {Object} opts
 * @param {Function} fn
 */

exports = module.exports = function(source, buildpack, opts, fn) {
  var request = opts.request;
  var log = opts.log;

  sync(source, 'app', opts, function(err, manifest) {
    build('/manifest/build', {
      buildpack: opts.buildpack,
      cache: opts.cache,
      env: JSON.stringify(opts.env),
      keepalive: '1',
      manifest: JSON.stringify(manifest),
      type: opts.type
    }, opts, fn);
  });
};

/**
 * Sync a local folder with a manifest
 *
 * @param {String} source
 * @param {String} step
 * @param {Object} opts
 * @param {Function} fn
 */

exports.sync = function sync(source, step, opts, fn) {
  // TODO
  // https://github.com/ddollar/anvil-cli/blob/master/lib/anvil/manifest.rb
  // https://github.com/ddollar/anvil-cli/blob/master/lib/anvil/engine.rb#L75

  // glob the directory building a manifest
  // do a diff
  // upload the missing files
  // save the manifest if needed
  chain([], fn);
};
