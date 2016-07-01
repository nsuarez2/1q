
declare var jsonip: jsonip.IJsoniPStatic;

declare module "jsonip" {
    export = jsonip;
}

declare namespace jsonip {

    interface IJSONipOptions {
        serializer?: () => any;
        deserializer?: (input: any) => any;
    }
    interface ISerializable {
        serialize: () => any;
        deserialize: (input: any) => void;

    }

    interface IJsoniPStatic {
        stringify(value: any, replacer?: (key: string, value: any) => any, space?:string): string;
        parse<R>(text: string, reviver?: (key: string, value: any) => any): R;
        register(name: string, construct: any, options?: IJSONipOptions): void;
        unregister(name: string): void;
    }

}