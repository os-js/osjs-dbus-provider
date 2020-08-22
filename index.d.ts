import { ServiceProvider } from '@osjs/common';

/**
 * DBus Service Provider
 *
 * @desc The service provider
 */
export class DBusServiceProvider extends ServiceProvider {}

/**
 * DBus Interface
 *
 * @desc An abstraction for inerfacing with a DBus session
 */
export interface DBusInterface {
  /**
   * Subscribe to an event
   *
   * @param member The event name
   * @param callback The function to handle the event
   */
  subscribe(member: string, callback: Function): void;
}

/**
 * DBus Message
 *
 * @desc An object which describes some data to send to DBus
 */
export interface DBusMessage {
  /**
   * The path in DBus
   */
  path?: string;

  /**
   * The destination
   */
  destination?: string;

  /**
   * The interface to message
   */
  interface?: string;

  /**
   * The member in the interface to message
   */
  member?: string;

  /**
   * A signature
   */
  signature?: string;

  /**
   * The data to send over
   */
  body?: Array<string>;
}

/**
 * DBus Connection
 *
 * @desc Provides function to control a DBUs connection to either the session or system bus.
 */
export interface DBusConnection {
  /**
   * Sends a message
   *
   * @param msg The message to send
   */
  send(msg: DBusMessage): void;

  /**
   * Gets an interface
   *
   * @desc Will return a {DBusInterface} which represents the interface that was requested.
   * @param serviceName The name of the service
   * @param objectPath The path of the object in the service
   * @param interfaceName The interface in the object to retreive
   * @return The interface that was requested
   */
  interface(serviceName: string, objectPath: string, interfaceName: string): DBusInterface;

  /**
   * Gets a property
   *
   * @param prop The property to set
   * @return A promised value of the property
   */
  get(prop: string): Promise<any>;

  /**
   * Sets a property
   *
   * @param prop The property to set
   * @param value The value to set the property to
   */
  set(prop: string, value: any): Promise<undefined>;

  /**
   * Calls a function
   *
   * @param member The member to call
   * @param args The arguments to give to the function
   * @return The results of the call
   */
  call(memeber: string, ...args: any): Promise<any>;

  /**
   * Closes the connection
   *
   * @desc Will close the connection; once closed, none of the functions will work.
   */
  close(): void;
}
