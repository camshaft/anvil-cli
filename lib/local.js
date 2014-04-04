/**
 * Module dependencies
 */

var glob = require('glob');
var chain = require('slide').chain;
var first = chain.first;
var last = chain.last;
var build = require('./util').build;
var Batch = require('batch');
var join = require('path').join;
var fs = require('graceful-fs');
var stat = fs.lstat;
var read = fs.readFile;
var hash = require('crypto').createHash;

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
 * Save manifest to anvil
 *
 * @param {String} source
 * @param {String} step
 * @param {Object} opts
 * @param {Function} fn
 */

exports.save = function(source, step, opts, fn) {
  sync(source, step, opts, function(err, manifest) {
    if (err) return fn(err);
    saveManifest(manifest, opts.request, opts.host, fn);
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

exports.sync = sync;
function sync(source, step, opts, fn) {
  var log = opts.log;
  find(source, function(err, files) {
    if (err) return fn(err);
    loadSlugignore(source, opts.ignore, function(err, ignore) {
      if (err) return fn(err);
      filterIgnored(files, ignore, function(err, files) {
        if (err) return fn(err);
        statFiles(files, source, function(err, manifest) {
          if (err) return fn(err);
          normalizeManifest(manifest, function(err, nmanifest) {
            if (err) return fn(err);
            findMissing(nmanifest, opts.request, opts.host, function(err, missing) {
              if (err) return fn(err);
              if (missing.length) log('Uploading ' + missing.length + ' file(s)');
              else log('Using cached files...');
              selectMissing(missing, manifest, function(err, missingFiles) {
                if (err) return fn(err);
                uploadMissing(missingFiles, opts.request, opts.host, log, function(err) {
                  if (err) return fn(err);
                  fn(null, nmanifest);
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Glob source dir
 *
 * @param {String} source
 * @param {Function} fn
 */

function find(source, fn) {
  glob('**', {cwd: source, dot: true}, function(err, files) {
    fn(err, files);
  });
}

/**
 * Merge the .slugignore file with the ignored files
 *
 * @param {String} source
 * @param {Array} ignore
 * @param {Function} fn
 */

function loadSlugignore(source, ignore, fn) {
  // TODO
  fn(null, ignore);
}

/**
 * Filter ignored files
 *
 * @param {Array} files
 * @param {Array} ignore
 */

function filterIgnored(files, ignore, fn) {
  fn(null, files.filter(function(file) {
    // TODO make more robust
    return !~ignore.indexOf(file) && !~ignore.indexOf(file + '/');
  }));
}

/**
 * Get files info
 *
 * @param {Array} files
 * @param {String} source
 * @param {Function} fn
 */

function statFiles(files, source, fn) {
  var batch = new Batch();

  files.forEach(function(file) {
    batch.push(statFile(file, source));
  });

  batch.end(fn);
}

/**
 * Get a file manifest
 *
 * @param {String} file
 * @param {String} source
 * @return {Function}
 */

function statFile(file, source) {
  return function(cb) {
    var abs = join(source, file);
    stat(abs, function(err, stats) {
      if (err) return cb(err);

      var manifest = {
        name: file,
        abs: abs,
        mtime: Math.floor(stats.mtime.getTime() / 1000),
        mode: '' + parseInt(stats.mode.toString(8), 10),
        size: '' + stats.size // do we need this?
      };

      if (stats.isDirectory()) return cb();
      if (stats.isSymbolicLink()) return fs.readlink(abs, finish('link'));
      calculateHash(abs, finish('hash'));

      function finish(key) {
        return function(err, val) {
          if (err) return cb(err);
          manifest[key] = val;
          cb(null, manifest);
        };
      }
    });
  };
}

/**
 * Calculate hash for a file
 *
 * @param {String} file
 * @param {Function} fn
 */

function calculateHash(file, fn) {
  read(file, function(err, bin) {
    if (err) return fn(err);
    fn(null, hash('sha256').update(bin).digest('hex'));
  });
}

/**
 * Normalize the manifest into the expected format
 *
 * @param {Object} manifest
 * @param {Function} fn
 */

function normalizeManifest(manifest, fn) {
  var obj = {};
  manifest.forEach(function(file) {
    if (!file) return;
    obj[file.name] = {
      mtime: file.mtime,
      mode: file.mode,
      size: file.size,
      hash: file.hash,
      link: file.link
    };
  });
  fn(null, obj);
}

/**
 * Find the missing files in the manifest
 *
 * @param {Object} manifest
 * @param {Request} request
 * @param {String} host
 * @param {Function} fn
 */

function findMissing(manifest, request, host, fn) {
  request
    .post(host + '/manifest/diff')
    .send({manifest: JSON.stringify(manifest)})
    .end(function(err, res) {
      if (err) return fn(err);
      if (res.error) return fn(res.error);
      fn(null, res.body);
    });
}

/**
 * Find the missing files from the manifest
 *
 * @param {Array} missing
 * @param {Array} manifest
 * @param {Function} fn
 */

function selectMissing(missing, manifest, fn) {
  fn(null, manifest.filter(function(file) {
    return file && ~missing.indexOf(file.hash);
  }));
}

/**
 * Upload the missing files to the build server
 *
 * @param {Array} missing
 * @param {Request} request
 * @param {String} host
 * @param {Function} fn
 */

function uploadMissing(missing, request, host, log, fn) {
  var batch = new Batch();

  missing.forEach(function(file) {
    batch.push(uploadFile(file, request, host));
  });

  batch.on('progress', function() {
    log('.');
  });

  batch.end(function(err, res) {
    log(' done\n');
    fn(err, res);
  });
}

/**
 * Upload a single file to the build server
 *
 * @param {String} file
 * @param {Request} request
 * @param {String} host
 * @return {Function}
 */

function uploadFile(file, request, host) {
  return function(cb) {
    request
      .post(host + '/file/' + file.hash)
      .attach('data', file.abs)
      .end(function(err, res) {
        if (err) return cb(err);
        if (res.error) return cb(res.error);
        return cb();
      });
  };
}

/**
 * Save the manifest file to the build server
 *
 * @param {Object} manifest
 * @param {Request} request
 * @param {String} host
 * @param {Function} fn
 */

function saveManifest(manifest, request, host, fn) {
  request
    .post(host + '/manifest')
    .send({manifest: JSON.stringify(manifest)})
    .end(function(err, res) {
      if (err) return fn(err);
      if (res.error) return fn(res.error);
      fn(null, res.headers.location);
    });
}
