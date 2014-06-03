/**
 * Module dependencies
 */

var envs = require('envs');
var chain = require('slide').chain;
var first = chain.first;
var request = require('superagent');
var buildpack = require('./buildpack');
var local = require('./local');
var remote = require('./remote');
var isRemote = require('./util').isRemote;

/**
 * Build a slug given a source
 *
 * @param {String} source
 * @param {Object} opts
 * @param {Function} fn
 */

exports = module.exports = function(source, opts, fn) {
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }
  source = source || process.cwd();

  opts = opts || {};
  opts.ignore = opts.ignore || ['.git'];
  opts.type = opts.type || 'tgz';
  opts.env = opts.env || {};
  opts.log = opts.log || opts.logger || logger;
  opts.host = opts.host || envs('ANVIL_HOST', 'https://api.anvilworks.org');
  opts.codon = opts.codon || envs('CODON_URL', 'https://s3-external-1.amazonaws.com/codon-buildpacks/buildpacks');
  opts.request = request; // TODO init a superagent-defaults context

  chain([
    [buildpack, opts.buildpack || '', Object.create(opts)], // initialize the buildpack
    [choose(source), source, first, Object.create(opts)] // compile the app using the buildpack
  ], function(err, res) {
    if (err) return fn(err);
    fn(null, res[1], res[2]);
  });
};

/**
 * Default logger
 *
 * @param {String} str
 */

function logger(str) {
  process.stdout.write(str);
}

/**
 * Choose a build method
 *
 * @param {String} source
 * @return {Function}
 */

function choose(source) {
  return isRemote(source) ? remote : local;
}

exports.local = local;
exports.remote = remote;
