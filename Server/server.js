const express = require('express');
const http = require('http');
const axios = require('axios').default;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const {
  v4
} = require('uuid');
const cors = require('cors');

// Порт
const PORT = 3333;

// Лист пользователей
const listUser = new Map();
// Хранилище токенов
const listToken = new Map();

// Создание express приложения
const app = express();
// Создание сервера
const server = http.createServer(app);

// Сокеты
const io = require("socket.io")(
  server, {
    cors: {
      origin: "*"
    }
  }
);

app.use(express.static(`${__dirname}/`));
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).send(Array.from(listUser));
});

app.post('/', (req, res) => {
  try {
    const code = req.body.code;
    console.log(req.body);
    listUser.add(code);
  } catch (er) {
    console.log(`Произошла ошибка ${er}`);
  }
});

app.get('/map', (req, res) => {
  // Токен
  const token = req.headers.authorization.split(" ")[1];
  console.log(token);
  const decode = jwt.decode(token);
  console.log(decode);
  const idUser = decode.id;
  // Если токен есть в массиве
  if (listUser.has(idUser) && listToken.has(idUser)) {
    res.status(200).send({
      token,
      id: idUser,
      status: jwt.verify(token, process.env.NODE_ENV),
      coordinate: listUser.get(idUser),
    })
  } else {
    res.status(404).send({
      error: true
    });
  }
});

app.post('/auth/login', (req, res) => {
  // Id пользователя
  const idUser = req.body.id;
  // Генерируем случайный токен
  const newRefreshToken = v4();
  if (listToken.has(idUser)) {
    res.status(201).send({
      information: 'Данный пользователь уже авторизирован'
    })
  } else {
    listToken.set(idUser, {
      token: newRefreshToken,
      id: idUser
    });
    listUser.set(idUser, []);
    res.status(200).send({
      token: jwt.sign({
        id: idUser
      }, process.env.NODE_ENV),
      refreshToken: newRefreshToken,
    })
  }
})

io.on('connection', (socket) => {
  const userToken = socket.handshake.auth.token;
  const decode = jwt.decode(userToken);
  const userId = decode.id;
  listUser.set(userId, [51.505, -0.09]);
  socket.on('disconnect', () => {
    listUser.delete(userId);
    listToken.delete(userId);
  });
  // Изменение данных в 
  socket.on('toggleMapCenter', (newCoordinate) => {
    listUser.set(userId, newCoordinate);
  })
});


server.listen(PORT, () => {
  console.log(`Сервер запущен на ${PORT} порту`);
});