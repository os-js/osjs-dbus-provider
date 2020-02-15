/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2020, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

const {EventEmitter} = require('@osjs/event-emitter');
const dbus = require('dbus-native');
const uuidv1 = require('uuid/v1');
const {promisify} = require('util');

const get = value => value instanceof Buffer
  ? value.toString('utf8')
  : value;

class DBusSession extends EventEmitter {

  constructor(type, sessionId) {
    super('DBusSession');

    this.sessionId = sessionId;
    this.uuid = uuidv1();
    this.bus = dbus[type]();
    this.socket = null;
    this.destroyed = false;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    if (this.socket) {
      this.socket.close();
    }

    if (this.bus) {
      this.bus.end();
    }
  }

  send(signal, ...args) {
    this.socket.send(JSON.stringify({
      signal,
      args
    }));
  }

  subscribe({serviceName, objectPath, interfaceName}) {
    return (member) => {
      return Promise.resolve(this.bus.getService(serviceName))
        .then(service => promisify(service.getInterface.bind(service))(objectPath, interfaceName))
        .then(iface => iface.on(member, (...args) => this.send(member, ...args)))
        .then(() => ({}));
    };
  }

  set({serviceName, objectPath, interfaceName}) {
    return (prop, value) => {
      return Promise.resolve(this.bus.getService(serviceName))
        .then(service => promisify(service.getInterface.bind(service))(objectPath, interfaceName))
        .then(iface => promisify(iface[prop])(value));
    };
  }

  get({serviceName, objectPath, interfaceName}) {
    return (prop) => {
      return Promise.resolve(this.bus.getService(serviceName))
        .then(service => promisify(service.getInterface.bind(service))(objectPath, interfaceName))
        .then(iface => promisify(iface[prop])())
        .then(get);
    };
  }

  props({serviceName, objectPath, interfaceName}) {
    const isGetter = (obj, prop) => !!Object.getOwnPropertyDescriptor(obj, prop)['get'];

    const getGetters = iface => {
      const keys =  Object.keys(iface)
        .filter(k => isGetter(iface, k));

      const promises = keys.map(key => promisify(iface[key])().then(prop => ({
        prop,
        key
      })));

      return Promise.all(promises)
        .then(results => {
          return results.reduce((result, {prop, key}) => Object.assign({
            [key]: get(prop)
          }, result), {});
        });
    };

    return () => {
      return Promise.resolve(this.bus.getService(serviceName))
        .then(service => promisify(service.getInterface.bind(service))(objectPath, interfaceName))
        .then(getGetters);
    };
  }

  call({serviceName, objectPath, interfaceName}) {
    return (member, ...args) => {
      return Promise.resolve(this.bus.getService(serviceName))
        .then(service => promisify(service.getInterface.bind(service))(objectPath, interfaceName))
        .then(iface => {
          try {
            return promisify(iface[member])(...args);
          } catch (e) {
            return Promise.reject(new Error(e));
          }
        });
    };
  }

  attach(socket) {
    if (this.socket) {
      throw new Error('Socket already attached');
    }

    socket.on('data', msg => {
      try {
        const o = JSON.parse(msg);
        this.bus.connection.message(o);
      } catch (e) {
        console.warn(e);
      }
    });

    socket.on('close', () => this.emit('close'));

    this.bus.connection.on('message', msg => this.send(null, msg));

    this.socket = socket;
  }

}

class DBusServiceProvider {

  constructor(core, options = {}) {
    this.core = core;
    this.options = options;
    this.sessions = [];
  }

  destroy() {
    this.sessions = this.sessions.filter(sess => {
      try {
        sess.destroy();
      } catch (e) { /* noop */ }

      return false;
    });
  }

  provides() {
    return [];
  }

  start() {

  }

  init() {
    // Removes sessions
    const removeSession = sess => {
      const foundIndex = this.sessions.findIndex(s => s === sess);
      if (foundIndex !== -1) {
        this.core.logger.info('Removing DBus Session', sess.uuid);
        this.sessions.splice(foundIndex, 1);
      }
    };

    // Finds a session by uuid and http-session
    const findSession = (uuid, sessionId) => this.sessions.find(sess => {
      return sess.uuid === uuid && sess.sessionId === sessionId;
    });

    // Creates a new session of given type
    const createSession = type => (req, res) => {
      let sess = new DBusSession(type, req.session.id);

      this.core.logger.info('Creating DBus Session', sess.uuid);

      sess.on('close', () => {
        removeSession(sess);
        sess = sess.destroy();
      });

      this.sessions.push(sess);

      return res.send({uuid: sess.uuid});
    };

    // Websocket route for biding dbus signals
    this.core.app.ws('/dbus/:uuid', (req, res, next) => {
      const sess = findSession(req.params.uuid, req.session.id);
      return sess ? next() : res.status(403).send('Invalid DBus session');
    }, (ws, req) => {
      const sess = findSession(req.params.uuid, req.session.id);
      sess.attach(ws);
    });

    // Http routes for creating dbus sessions
    this.core.app.get('/dbus/systemBus', createSession('systemBus'));
    this.core.app.get('/dbus/sessionBus', createSession('sessionBus'));

    // Http route for closing a dbus session
    this.core.app.delete('/dbus/:uuid', (req, res) => {
      const sess = findSession(req.params.uuid, req.session.id);
      if (sess) {
        removeSession(sess);

        return res.send({});
      }

      return res.status(403).send({error: 'Invalid DBus session'});
    });

    // Http route for performing some sort of operation on an interface
    const allowed = ['subscribe', 'call', 'props', 'get', 'set'];

    this.core.app.post('/dbus/:uuid', (req, res) => {
      const sess = findSession(req.params.uuid, req.session.id);

      if (sess) {
        const {action, data} = req.body;
        const {query, args} = data;

        const perform = promise => Promise.resolve(promise)
          .then(result => res.send(result))
          .catch(error => {
            console.warn(error);

            res.status(500).send({error});
          });

        if (allowed.indexOf(action) !== -1) {
          return perform(sess[action](query)(...args));
        }

        return res.status(404);
      }

      return res.status(403).send({error: 'Invalid DBus session'});
    });
  }
}

module.exports = {DBusServiceProvider};
