'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Client = require('./classes/Client.class');

var _Client2 = _interopRequireDefault(_Client);

var _Channel = require('./classes/Channel.class');

var _Channel2 = _interopRequireDefault(_Channel);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(request) {
        var queryParams, connection, id, client, channel;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                queryParams = _url2.default.parse(request.httpRequest.url, true).query;
                connection = request.accept(null, request.origin);

                // Идентификация по get параметру id, если его нет то закрываем соединение и заканчиваем
                // при таком завершении клиент не выкинет исключения, закрытие необходимо поймать событием

                if (queryParams.id) {
                  _context.next = 5;
                  break;
                }

                connection.drop(1000, 'Без ID ты не пройдёшь');
                return _context.abrupt('return');

              case 5:
                id = queryParams.id;
                client = null;

                if (!(id in this.clients)) {
                  _context.next = 13;
                  break;
                }

                client = this.clients[id];
                _context.next = 11;
                return this.sendToChannel(client, 'Двойная авторизация!');

              case 11:
                _context.next = 14;
                break;

              case 13:
                client = new _Client2.default(id);

              case 14:

                if (!this.channels.has(client)) {
                  channel = new _Channel2.default();

                  this.channelToClients.set(channel, new Set([client]));
                  this.channels.set(client, channel);
                }

                // Добавляем или обновляем клиента в
                // списке подключенных
                this.clients[id] = client;

                // Двусторонняя привязка объекта клиента к коннету
                this.connectToClient.set(connection, client);
                this.clientToConnect.set(client, connection);

                console.log(new Date() + ' Connection accepted.');

              case 19:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function onRequest(_x) {
        return _ref.apply(this, arguments);
      }

      return onRequest;
    }()
  }, {
    key: 'onConnect',
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(connection) {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                connection.on('message', function (message) {
                  _this.onMessage(connection, message);
                });

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function onConnect(_x2) {
        return _ref2.apply(this, arguments);
      }

      return onConnect;
    }()
  }, {
    key: 'onClose',
    value: function onClose(connect, code, message) {
      // onClose [ connect, 1006, 'Connection dropped by remote peer.']
      var client = this.connectToClient.get(connect);
    }
  }, {
    key: 'onMessage',
    value: function onMessage(connect, message) {
      // onMessage [ connect, { type: 'utf8', utf8Data: string } ]
      var sender = this.connectToClient.get(connect);
    }
  }, {
    key: 'sendToChannel',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(channelIdentifier, message) {
        var _this2 = this;

        var channel, clients, result;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                channel = this.channels.get(channelIdentifier);
                clients = this.channelToClients.get(channel);
                result = [];

                clients.forEach(function (client) {
                  result.push(_this2.send(_this2.clientToConnect.get(client), message));
                });

                return _context3.abrupt('return', Promise.all(result));

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function sendToChannel(_x3, _x4) {
        return _ref3.apply(this, arguments);
      }

      return sendToChannel;
    }()
  }, {
    key: 'send',
    value: function send(connection, message) {
      return new Promise(function (resolv, reject) {
        try {
          connection.sendUTF(JSON.stringify(message));
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