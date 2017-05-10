import Client from './classes/Client.class';

export default class {
  constructor(config) {
    // Подключенные клиенты {clientId: client}
    this.clients = {};
    // Привязка коннекта к клиенту {connect: client}
    this.connectToClient = new WeakMap();
    // Привязка клиента к коннекту {client: connect}
    this.clientToConnect = new WeakMap();
    // Привязки клиетов к каналу {channel: Set([client, client, ...])}
    this.channelToClients = new WeakMap();
    // Привязка канала к чему-угодно {client: channel}, {'mycustomchannel': channel}, {1: channel}
    this.channels = new WeakMap();

    if (!('wsServer' in config)) {
      throw new Error('А где сервер вебсокетов?');
    }

    this.wsServer = config.wsServer;
    this.wsServer.on('request', this.onRequest);
    this.wsServer.on('connect', this.onConnect.bind(this));
    this.wsServer.on('close', this.onClose);
  }

  onRequest(request) {
    var connection = request.accept(null, request.origin);
    console.log(new Date() + ' Connection accepted.');
  }

  async onConnect(connection, id) {
    connection.on('message', message => {
      this.onMessage(connection, message);
    });

    if (id in this.clients) {
      let client = this.clients[id];
      await sendToChannel(client, 'double auth!');
    } else {
      let client = new Client(id);
    }

    if (!this.channels.has(client)) {
      let channel = new Channel();
      this.channels.set(client, channel);
    }

    // Добавляем или обновляем клиента в
    // списке подключенных
    this.clients[id] = client;

    // Двусторонняя привязка объекта клиента к коннету
    this.connectToClient.set(connect, client);
    this.clientToConnect.set(client, connect);
  }

  onClose(connect, code, message) {
    // onClose [ connect, 1006, 'Connection dropped by remote peer.']
  }

  onMessage(connect, message) {
    // onMessage [ connect, { type: 'utf8', utf8Data: string } ]
  }

  async sendToChannel(channelIdentifier, message) {
    let channel = this.channels.get(channelIdentifier);
    this.channelToClients.get(channel).forEach(client => {
      return this.send(this.clientToConnect(client), message);
    });
  }

  send(connection, message) {
    return new Promise(function (resolv, reject) {
      try {
        connection.sendUTF(JSON.serialize(message));
        resolv();
      } catch (e) {
        reject(e);
      }
    });
  }
}