import { ServiceProvider } from '@osjs/common';

export class DBusServiceProvider extends ServiceProvider {}

export interface DBusInterface {
  subscribe(member: string, callback: Function): void;
  get(prop: string): Promise<any>;
  set(prop: string, value: any): Promise<undefined>;
  call(memeber: string, ...args: any): Promise<any>;
}

export interface DBusMessage {
  path: string;
  destination: string;
  interface: string;
  member: string;
  signature: string;
  body?: string[];
}

export interface DBusConnection {
  send(msg: DBusMessage): void;
  interface(serviceName: string, objectPath: string, interfaceName: string): DBusInterface;
  close(): void;
}
