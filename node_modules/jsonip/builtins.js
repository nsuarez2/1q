module.exports = function (register) {
    
    register(
        'Date'
      , Date
      , {
          serialize: function (date) {
              return date.getTime();
          }
      }
    );
    
    register(
        'RegExp'
      , RegExp
      , {
          serialize: function (reg) {
              return {
                  source: reg.source
                , flags: (reg.global ? 'g' : '') + (reg.ignoreCase ? 'i' : '') + (reg.multiline ? 'm' : '')
              };
          }
        , deserialize: function (reg) {
              return new RegExp(reg.source, reg.flags);
          }
      } 
    );
    
    // register all core error types
    var errorTypes = {
        'Error': Error
      , 'SyntaxError': SyntaxError
      , 'TypeError': TypeError
      , 'ReferenceError': ReferenceError
      , 'RangeError': RangeError
      , 'EvalError': EvalError
      , 'URIError': URIError
    };
    
    Object.keys(errorTypes).forEach(function (name) {
        var construct = errorTypes[name];
        register(
            name
          , construct
          , {
              serialize: function (err) {
                  var alt = {};
                  
                  Object.getOwnPropertyNames(err).forEach(function (key) {
                      alt[key] = err[key];
                  });
                  
                  return alt;
              },
              deserialize: function (alt) {
                  var err = new construct(alt.message);
                  
                  delete alt.message;
                  
                  Object.keys(alt).forEach(function (key) {
                      err[key] = alt[key];
                  });
                  
                  return err;
              }
          }
        );
    });
    
    // if Buffer is available, register it
    if (typeof Buffer === 'function') {
    
        register(
            'Buffer'
          , Buffer
          , {
              serialize: function (buf) {
                  return buf.toString('base64');
              }
            , deserialize: function (str) {
                  return new Buffer(str, 'base64');
              }
          }
        );
        
    }
    
};