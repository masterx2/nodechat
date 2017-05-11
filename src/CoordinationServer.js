import Client from './classes/Client.class';
import Channel from './classes/Channel.class';
import url from 'url';

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
    this.wsServer.on('request', this.onRequest.bind(this));
    this.wsServer.on('connect', this.onConnect.bind(this));
    this.wsServer.on('close', this.onClose);
  }

  // Тут происходит авторизация, проверка подлинности, создание(загрузка) клиента
  // все линьковки связанные с клиентом и коннектом, проверка двойной авторизации
  async onRequest(request) {

    const queryParams = url.parse(request.httpRequest.url, true).query;
    const connection = request.accept(null, request.origin);

    // Идентификация по get параметру id, если его нет то закрываем соединение и заканчиваем
    // при таком завершении клиент не выкинет исключения, закрытие необходимо поймать событием
    if (!queryParams.id) {
      connection.drop(1000, 'Без ID ты не пройдёшь');
      return;
    }

    const id = queryParams.id;
    let client = null;

    if (id in this.clients) {
      client = this.clients[id];
      await this.sendToChannel(client, 'Двойная авторизация!');
    } else {
      client = new Client(id);
    }

    if (!this.channels.has(client)) {
      let channel = new Channel();
      this.channelToClients.set(channel, new Set([client]));
      this.channels.set(client, channel);
    }

    // Добавляем или обновляем клиента в
    // списке подключенных
    this.clients[id] = client;

    // Двусторонняя привязка объекта клиента к коннету
    this.connectToClient.set(connection, client);
    this.clientToConnect.set(client, connection);

    console.log((new Date()) + ' Connection accepted.');
  }

  async onConnect(connection) {
    connection.on('message', (message) => {
      this.onMessage(connection, message);
    });
  }

  onClose(connect, code, message) {
    // onClose [ connect, 1006, 'Connection dropped by remote peer.']
    const client = this.connectToClient.get(connect);
  }

  onMessage(connect, message) {
    // onMessage [ connect, { type: 'utf8', utf8Data: string } ]
    const sender = this.connectToClient.get(connect);
  }

  async sendToChannel(channelIdentifier, message) {
    const channel = this.channels.get(channelIdentifier);
    const clients = this.channelToClients.get(channel);

    let result = [];
    clients.forEach((client) => {
      result.push(this.send(this.clientToConnect.get(client), message));
    });

    return Promise.all(result);
  }

  send(connection, message) {
    return new Promise(function(resolv, reject) {
      try {
        connection.sendUTF(JSON.stringify(message));
        resolv();
      } catch (e) {
        reject(e);
      }
    })
  }
}