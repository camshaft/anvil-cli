/**
 * Module dependencies
 */

var stat = require('fs').stat;
var sync = require('./local').sync;
var isRemote = require('./util').isRemote;

/**
 * Normalize a buildpack
 *
 * @param {String} buildpack
 * @param {Function} fn
 */

module.exports = function(buildpack, opts, fn) {
  if (buildpack === '' || isRemote(buildpack)) return fn(null, buildpack);

  // use a codon buildpack
  if (buildpack.match(/^\w+\/\w+$/)) return fn(null, opts.codon + '/' + buildpack + '.tgz');

  // upload a local buildpack
  stat(buildpack, function(err, stats) {
    if (err || !stats.isDirectory()) return fn(new Error('Invalid buildpack: ' + buildpack));
    opts.ignore = [];
    sync(buildpack, 'buildpack', opts, fn);
  });
};
