import express from 'express';
import http from 'http';
import cors from 'cors';
import pkg from 'body-parser';
const { json } = pkg;

const app = express();
const server = http.createServer(app);

app.use(json());
app.use(cors());

app.get('/', (req, res) => {
  res.send({ msg: 'hello world' });
});

server.listen(8080, () => {
  console.log('listening on *:8080');
});