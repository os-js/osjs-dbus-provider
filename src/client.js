/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
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

const createInterface = core => ({uuid}) => {
  const {port, hostname} = window.location;
  const protocol = window.location.protocol.replace('http', 'ws');
  const url = core.url(`/dbus/${uuid}`);
  const socket = new WebSocket(`${protocol}/${hostname}:${port}${url}`);
  const bus = core.make('osjs/event-handler');

  socket.onopen = ev => bus.emit('open', ev);
  socket.onclose = ev => bus.emit('close', ev);
  socket.onmessage = ev => bus.emit('message', ev, JSON.parse(ev.data));

  bus.on('message', msg => {
    const name = msg.signal ? `signal:${msg.signal}` : 'response';
    bus.emit(name, ...msg.args);
  });


  const request = (action, data) => core.request(url, {
    body: {action, data},
    method: 'POST'
  }, 'json');

  return {
    close: () => {
      socket.close();
    },

    send: msg => socket.send(JSON.stringify(msg)),

    interface: (serviceName, objectPath, interfaceName) => ({
      subscribe: (member, callback) => {
        return request('subscribe', {
          query: {serviceName, objectPath, interfaceName},
          args: [member]
        }).then(result => {
          bus.on(`signal:${member}`, callback);

          return result;
        });
      },

      get: (prop) => request('get', {
        query: {serviceName, objectPath, interfaceName},
        args: [prop]
      }),

      set: (prop, value) => request('set', {
        query: {serviceName, objectPath, interfaceName},
        args: [prop, value]
      }),

      props: () => request('props', {
        query: {serviceName, objectPath, interfaceName},
        args: []
      }),

      call: (member, ...args) => request('call', {
        query: {serviceName, objectPath, interfaceName},
        args: [member, ...args]
      })
    })
  };
};

export class DBusServiceProvider {

  constructor(core, options = {}) {
    this.core = core;
    this.options = options;
  }

  destroy() {
  }

  async init() {
    const createBus = type => {
      const url = this.core.url(`/dbus/${type}`);

      return this.core.request(url, {}, 'json')
        .then(createInterface(this.core));
    };

    this.core.singleton('osjs/dbus', () => ({
      systemBus: () => createBus('systemBus'),
      sessionBus: () => createBus('sessionBus')
    }));
  }

  provides() {
    return ['osjs/dbus'];
  }

  start() {
  }

}
