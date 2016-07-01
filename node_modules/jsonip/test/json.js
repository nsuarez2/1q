var jsoni = require('..')
  , deepEqual = require('deepequal')
  , should = require('should')
;

describe('jsoni', function () {
    
    it('should recreate all properties in an object', function () {
        
        var a = {
            a: null,
            b: 'abc',
            c: 123,
            d: true,
            e: false,
            f: [1, 2, 3],
            g: { hello: 'world' },
            h: new Date(1390244609345),
            i: /^hello$/gi,
            j: NaN,
            k: Infinity,
            l: new Buffer('hello world'),
            m: new Error('error message'),
            n: new SyntaxError('syntaxerror message'),
            o: new TypeError('typeerror message'),
            p: new ReferenceError('referenceerror message'),
            q: new RangeError('rangeerror message'),
            r: new EvalError('evalerror message'),
            s: new URIError('urierror message')
        };
        
        var b = jsoni.stringify(a);
        
        var c = jsoni.parse(b);
        
        deepEqual(c, a).should.be.true;
        
    });
    
    it('should restore prototype.toJSON after each run', function () {
        
        var date = new Date(1390417618218)
          , orig = Date.prototype.toJSON
        ;
        
        var str = jsoni.stringify(date);
        
        Date.prototype.toJSON.should.equal(orig);
        
        date.toJSON().should.equal('2014-01-22T19:06:58.218Z');
        
    });
    
    it('should register a new construct, serialize, and deserialize', function () {
        
        jsoni.register('Person', Person, {
            serialize: function (person) {
                return {
                    name: person.name,
                    age: person.age
                };
            },
            deserialize: function (data) {
                return new Person(data.name, data.age);
            }
        });
        
        var me = new Person('Jayce', 22)
          , serializedMe = jsoni.stringify(me)
          , parsedMe = jsoni.parse(serializedMe)
        ;
        
        parsedMe.should.not.equal(me);
        parsedMe.should.be.an.instanceof(Person);
        parsedMe.greet().should.equal('hello, my name is Jayce and I am 22 years old');
        
    });
    
    it('should remove a registered construct', function () {
        
        jsoni.unregister('Person');
        
        var me = new Person('Jayce', 22)
          , serializedMe = jsoni.stringify(me)
          , parsedMe = jsoni.parse(serializedMe)
        ;
        
        parsedMe.should.not.be.an.instanceof(Person);
        should(parsedMe.greet).not.exist;
        parsedMe.name.should.equal('Jayce');
        parsedMe.age.should.equal(22);
        
    });
    
    it('should work on deeply nested values', function () {
        
        var deep = {
            a: {
                b: {
                    c: {
                        d: new Date()
                    }
                }
            }
        };
        
        var deepStr = jsoni.stringify(deep);
        
        var deepParse = jsoni.parse(deepStr);
        
        deepEqual(deepParse, deep).should.be.true;
        
    });
    
});

function Person(name, age) {
    this.name = name;
    this.age = age;
}

Person.prototype.greet = function () {
    return 'hello, my name is ' + this.name + ' and I am ' + this.age + ' years old';
};