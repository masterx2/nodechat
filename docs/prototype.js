class Message {
    id = 123123; // Идентификатор сообщения
    sender = 324324; // Идентификатор отправителя
    channel = 2342423; // Идентификатор канала
    text = 'Текст сообщения';
    posted = new Date(); // Время и дата отправки
    delivered = false; // Флаг доставки
}

class Channel {
    constructor() {}
}

class Client {
    id = 2312321; // Идентификатор клиента
    name = 'Дима'; // Имя клиента
    channels = [
            { type: 'client', id: 2321312 },
            { type: 'custom', id: 'customChannel' }
        ] // Открытые каналы клиента
}

class Server {
    // Подключенные клиенты {clientId: client}
    clients = {};
    // Привязка коннекта к клиенту {connect: client}
    connectToClient = new WeakMap();
    // Привязка клиента к коннекту {client: connect} 
    clientToConnect = new WeakMap();
    // Привязки клиетов к каналу {channel: Set([client, client, ...])}
    channelToClients = new WeakMap();
    // Привязка канала к чему-угодно {client: channel}, {'mycustomchannel': channel}, {1: channel}
    channels = new WeakMap();

    // Новый коннект приехал
    async onConnect(connect) {

        // Проверка на существование коннекта с таким же clientId
        if (connect.clientId in this.clients) {
            // Коннект есть, значит это двойная авторизация
            // Необходимо сообщить приложению что оно должно
            // закрыть этот коннект.
            let client = this.clients[connect.clientId]
            await sendToChannel(client, 'double auth!');
        } else {
            // Такого клиента не было, создаём его
            // каким либо способом
            let client = new Client(connect.clientId);

            // Так же у клиента есть список открытых каналов
            // привязки которых необходимо обновить
            client.channels = client.channels.map((channel) => {

                // Тут примерная логика, она может быть любой
                switch channel.type {
                    case 'client':
                        return this.getClientChannel(channel.id);
                        break;
                    case 'custom':
                        return this.getCustomChannel(channel.id);
                        break;
                }

            })

            // Таким образом можно создавать различные типы каналов
            // В случае если канала к моменту подключения пользователя
            // не существует можно его создать ожидая когда к нему
            // подключатся другие клиенты

        }

        // В случае нового клиента у него не будет собственного
        // канала, нужно его ему создать
        // этот канал системный и обязан быть создан.
        // Его не будет в списке открытых каналов сохраненного
        // клиента
        if (!this.channels.has(client)) {
            let channel = new Channel();
            this.channels.set(client, channel);
        }

        // Добавляем или обновляем клиента в
        // списке подключенных
        this.clients[connect.clientId] = client;

        // Двусторонняя привязка объекта клиента к коннету
        this.connectToClient.set(connect, client);
        this.clientToConnect.set(client, connect);
    }

    // Коннект уехал =(
    onDisconnect(connect) {
        let client = this.connectToClient.get(connect);

        // Можно по каналам клиента сообщить что он ушел


        this.connectToClient.delete(connect, client);
        this.clientToConnect.delete(client, connect);
        delete this.clients[clientId];

        // Т.к. привязки каналов представляют собой WeakMap
        // они сами себя почистят когда пропадут ссылки на
        // клиента
    }

    async sendToChannel(channelIdentifier, message) {
        let channel = this.channels.get(channelIdentifier);
        // Тут можно влепить проверку на возможность отправки
        // данного сообщения в этот канал
        this.channelToClients.get(channel).forEach((client) => {
            // Тут можно влепить проверку на возможноть отправки
            // данного сообщения конкретному клиенту
            return this.send(this.clientToConnect(client), message);
        })
    }

    async onMessage(connect, message) {
        // Для начала можно проверить что можно этому отправителю
        let sender = this.connectToClient.get(connect);

        // *** Отправка сообщений ***

        // Допустим коннект хочет отправить сообщение в канал другого клиента
        // типа приватное сообщение
        let client = this.clients.get(message.channel)
        await this.sendToChannel(client, message);

        // Или это просто кастомный канал по строке
        await this.sendToChannel('mycustomchannel', message);

        // *** Работа с каналами ***

        // Захотелось клиенту добавится в канал 
        let channel = this.channels.get(['I_want_watch_this_channel']);
        channel.add(sender); // Ну или удалится из канала, аналогично

        // Или создать канал если его ещё нет
        let channel = new Channel();
        this.channels.set(channel, new Set([sender]));

        // После успешного выполнения отправить обратно результат
        this.sendToChannel(sender, { status: 'ok' });
    }

    async send(connect, message) {}

}
