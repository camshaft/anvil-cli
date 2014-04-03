/**
 * Module dependencies
 */

var build = require('./util').build;

/**
 * Build a slug from a remote location
 *
 * @param {String} source
 * @param {String} buildpack
 * @param {Object} opts
 * @param {Function} fn
 */

module.exports = function(source, buildpack, opts, fn) {
  build('/build', {
    buildpack: buildpack,
    cache: opts.cache,
    env: JSON.stringify(opts.env),
    source: source,
    type: opts.type
  }, opts, fn);
};
