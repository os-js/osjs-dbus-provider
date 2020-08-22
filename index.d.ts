import { ServiceProvider } from '@osjs/common';

export class DBusServiceProvider extends ServiceProvider {}

export interface DBusServiceContract {
  systemBus(): Promise<DBusConnection>;
  sessionBus(): Promise<DBusConnection>;
}

export interface DBusInterface {
  subscribe(member: string, callback: Function): void;
  get<T>(prop: string): Promise<T>;
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
