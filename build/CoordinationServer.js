'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Client = require('./classes/Client.class');

var _Client2 = _interopRequireDefault(_Client);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
  function _class(config) {
    _classCallCheck(this, _class);

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


  _createClass(_class, [{
    key: 'onRequest',
    value: async function onRequest(request) {

      var queryParams = _url2.default.parse(request.httpRequest.url, true).query;
      var connection = request.accept(null, request.origin);

      // Идентификация по get параметру id, если его нет то закрываем соединение и заканчиваем
      // при таком завершении клиент не выкинет исключения, закрытие необходимо поймать событием
      if (!queryParams.id) {
        connection.drop(1000, 'Без ID ты не пройдёшь');
        return;
      }

      var id = queryParams.id;

      if (id in this.clients) {
        var _client = this.clients[id];
        await sendToChannel(_client, 'Двойная авторизация!');
      } else {
        var _client2 = new _Client2.default(id);
      }

      if (!this.channels.has(client)) {
        var channel = new Channel();
        this.channels.set(client, channel);
      }

      // Добавляем или обновляем клиента в
      // списке подключенных
      this.clients[id] = client;

      // Двусторонняя привязка объекта клиента к коннету
      this.connectToClient.set(connect, client);
      this.clientToConnect.set(client, connect);

      console.log(new Date() + ' Connection accepted.');
    }
  }, {
    key: 'onConnect',
    value: async function onConnect(connection) {
      var _this = this;

      connection.on('message', function (message) {
        _this.onMessage(connection, message);
      });
    }
  }, {
    key: 'onClose',
    value: function onClose(connect, code, message) {
      // onClose [ connect, 1006, 'Connection dropped by remote peer.']
    }
  }, {
    key: 'onMessage',
    value: function onMessage(connect, message) {
      // onMessage [ connect, { type: 'utf8', utf8Data: string } ]
    }
  }, {
    key: 'sendToChannel',
    value: async function sendToChannel(channelIdentifier, message) {
      var _this2 = this;

      var channel = this.channels.get(channelIdentifier);
      this.channelToClients.get(channel).forEach(function (client) {
        return _this2.send(_this2.clientToConnect(client), message);
      });
    }
  }, {
    key: 'send',
    value: function send(connection, message) {
      return new Promise(function (resolv, reject) {
        try {
          connection.sendUTF(JSON.serialize(message));
          resolv();
        } catch (e) {
          reject(e);
        }
      });
    }
  }]);

  return _class;
}();

exports.default = _class;