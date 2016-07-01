    export interface IJSONipOptions{
        serializer?: ()=>any;
        deserializer?:(input:any)=>any;
    }
    export interface ISerializable {
           serialize: ()=>any;
        deserialize:(input:any)=>void;
    
    }
    export function stringify(value:any, replacer?:(key:string,value:any)=>any, space?:string):string;
    export function parse<R>(text:string,reviver?:(key:string,value:any)=>any):R;
    export function register(name:string, construct:any,options?:IJSONipOptions):void;
    export function unregister(name:string):void;