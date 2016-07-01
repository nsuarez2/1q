// jsoniP JSON serializer/parser
// Originally by Jayce Pulsipher <jaycemp@gmail.com>, https://github.com/jaycetde/jsoni
// modified by Javier Peletier <jm@epiclabs.io>, https://github.com/epiclabs-io/jsonip


var registered = {};

require('./builtins')(register);

exports.stringify = stringify;
exports.parse = parse;
exports.serialize = serialize;
exports.deserialize = deserialize;

exports.register = register;
exports.unregister = unregister;

var arrayRegexp = /(?:(.*))\[\]/g;


function serialize(value) {

    var meta = value.constructor.serializeMetadata;
    if (meta) {
        var json = {};
        for (var key in meta) {
            var t = meta[key];
            var item = value[key];
            if (registered[t]) {
                json[key] = serialize(item);
            }
            else {
                var match = arrayRegexp.exec(t);
                if (match && match[1]) {
                    t = match[1];
                    if (item && !Array.isArray(item))
                        throw "Serialization error: Item with key " + key + " is not an array";

                    if (item) {

                        var arr = [];
                        for (var i = 0; i < item.length; i++) {
                            var arrayItem = item[i];
                            if (arrayItem && (registered[t] && registered[t].construct != arrayItem.constructor))
                                throw "Item " + i + " in array is of the wrong type. Expected '" + t + "'";
                            arr.push(serialize(arrayItem));
                        }
                        json[key] = arr;
                    }
                    else
                        json[key] = null;

                }
                else
                    json[key] = item;
            }

        }
        return json;
    }
    else
        return value;

}

function deserialize(json, classObj) {
    
    if(!classObj)
        return json;
    
    var className;
    if (typeof classObj == "string") {
        className = classObj;
        classObj = registered[classObj];
        if (!classObj)
            throw "Error deserializing. Class " + className + " not registered";
        classObj = classObj.construct;
    }

    var meta = classObj.serializeMetadata;

    if (meta) {
        var obj = new classObj();
        for (var key in meta) {
            var t = meta[key];
            var item = json[key];
            if (registered[t]) {
                obj[key] = deserialize(item, registered[t].construct);
            }
            else {
                var match = arrayRegexp.exec(t);
                if (match && match[1]) {
                    t = match[1];
                    if (item && !Array.isArray(item))
                        throw "Deserialization error: Item with key " + key + " is not an array";
                     
                    if (item) {

                        var arr = [];
                        var arrayType=registered[t] ? registered[t].construct : null;
                        for (var i = 0; i < item.length; i++) {
                            arr.push(deserialize(item[i],arrayType));
                        }
                        obj[key] = arr;
                    }
                    else
                        obj[key] = null;

                }
                else
                    obj[key] = item;
            }

        }
        return obj;
    }
    else
        return json;

}




function stringify(value, replacer, space) {

    var val;


    val = JSON.stringify(value, function (key, value) {

        // replacer takes precedence
        if (replacer) value = replacer(key, value);

        if (value !== value) return 'NaN';
        if (value === Infinity) return 'Infinity';

        // is an object, but not an object literal
        if (typeof value === 'object' && value !== null && value.constructor !== Object && key != "__data") {
            for (var name in registered) {
                if (value.constructor === registered[name].construct) {

                    var data;

                    if (registered[name].serialize) {
                        data = registered[name].serialize(value);
                    } else {
                        if (value.serialize && typeof value.serialize === "function")
                            data = value.serialize();
                        else
                            data = value;
                    }

                    return {
                        __class: name,
                        __data: data
                    };

                }
            }
        }

        return value;

    }, space);

    return val;
}

function parse(text, reviver) {
    return JSON.parse(text, function (key, value) {

        // reviver takes precedence
        if (reviver) value = reviver(key, value);

        if (typeof value === 'string') {

            switch (value) {
                case 'NaN':
                    return NaN;
                case 'Infinity':
                    return Infinity;
            }

        }

        if (typeof value === 'object' && value !== null && value.__class) {

            var reg = registered[value.__class];
            if (reg) {
                if (reg.deserialize) {
                    return reg.deserialize(value.__data);
                } else {
                    var obj = new reg.construct();
                    var data = value.__data;
                    if (obj.deserialize && typeof obj.deserialize === "function") {
                        obj.deserialize(data);
                    }
                    else {
                        for (var key in data) {
                            if (data.hasOwnProperty(key)) {
                                obj[key] = data[key];
                            }
                        }
                    }
                    return obj;
                }
            } else {
                // Not in registered constructors, return data only
                value = value.__data;
            }

        }

        return value;

    });
}

function register(name, construct, options) {
    options = options || {};

    options.name = name;
    options.construct = construct;

    registered[name] = options;
}

function unregister(name) {

    delete registered[name];

}