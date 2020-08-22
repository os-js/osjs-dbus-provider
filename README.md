<p align="center">
  <img alt="OS.js Logo" src="https://raw.githubusercontent.com/os-js/gfx/master/logo-big.png" />
</p>

[OS.js](https://www.os-js.org/) is an [open-source](https://raw.githubusercontent.com/os-js/OS.js/master/LICENSE) web desktop platform with a window manager, application APIs, GUI toolkit, filesystem abstractions and much more.

[![Support](https://img.shields.io/badge/patreon-support-orange.svg)](https://www.patreon.com/user?u=2978551&ty=h&u=2978551)
[![Support](https://img.shields.io/badge/opencollective-donate-red.svg)](https://opencollective.com/osjs)
[![Donate](https://img.shields.io/badge/liberapay-donate-yellowgreen.svg)](https://liberapay.com/os-js/)
[![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://paypal.me/andersevenrud)
[![Community](https://img.shields.io/badge/join-community-green.svg)](https://community.os-js.org/)

# OS.js DBus Service Provider

Provides DBus for client and server.

## Installation

In your initialization scripts:

```
npm install @osjs/dbus-provider
```

## Usage

```javascript
// Client
import {DBusServiceProvider} from '@osjs/dbus-provider';
osjs.register(DBusServiceProvider);

// Server
const {DBusServiceProvider} = require('@osjs/dbus-provider/src/server.js');
osjs.register(DBusServiceProvider);
```

## Client Example

```javascript
const created = dbus => {
  // Send a raw dbus message
  dbus.send({
    path: '/org/freedesctop/DBus',
    destination: 'org.freedesktop.DBus',
    interface: 'org.freedesktop.DBus',
    member: 'AddMatch',
    signature: 's',
    body: [
      'type='signal''
    ]
  });

  // Listen for raw messages
  dbus.on('response', (...args) => console.log(args));

  // Subscribe to some event
  const iface = dbus.interface('org.freedesktop.Notifications', '/org/freedesktop/Notifications', 'org.freedesktop.Notifications');
  iface.subscribe('ActionInvoked', (...args) => {
    console.log(...args);
  });

  // Call some member
  const iface = dbus.interface('org.freedesktop.Notifications', '/org/freedesktop/Notifications', 'org.freedesktop.Notifications');
  iface.call('Notify', 'exampl', 0, '', 'summary 3', 'new message text', ['foo', 'bar'], [], 5)
    .then(response => console.log(response));

  // Get all properties
  const iface = dbus.interface('org.freedesktop.NetworkManager', '/org/freedesktop/NetworkManager/Devices/4', 'org.freedesktop.NetworkManager.Device');
  iface.props()
    .then(response => console.log(response));

  // Get a property
  const iface = dbus.interface('org.freedesktop.NetworkManager', '/org/freedesktop/NetworkManager/Devices/4', 'org.freedesktop.NetworkManager.Device');
  iface.get('Managed')
    .then(response => console.log(response));

  // Set a property
  const iface = dbus.interface('org.freedesktop.NetworkManager', '/org/freedesktop/NetworkManager/Devices/4', 'org.freedesktop.NetworkManager.Device');
  iface.set('Managed', false)
    .then(response => console.log(response));

  // Close the bus
  dbus.close();
};

core.make('osjs/dbus')
  .systemBus()
  .then(created);
```

## TODOs

- [ ] Use internal websocket

## Contribution

* **Sponsor on [Github](https://github.com/sponsors/andersevenrud)**
* **Become a [Patreon](https://www.patreon.com/user?u=2978551&ty=h&u=2978551)**
* **Support on [Open Collective](https://opencollective.com/osjs)**
* [Contribution Guide](https://github.com/os-js/OS.js/blob/master/CONTRIBUTING.md)

## Documentation

See the [Official Manuals](https://manual.os-js.org/) for articles, tutorials and guides.

## Links

* [Official Chat](https://gitter.im/os-js/OS.js)
* [Community Forums and Announcements](https://community.os-js.org/)
* [Homepage](https://os-js.org/)
* [Twitter](https://twitter.com/osjsorg) ([author](https://twitter.com/andersevenrud))
* [Facebook](https://www.facebook.com/os.js.org)
* [Docker Hub](https://hub.docker.com/u/osjs/)
