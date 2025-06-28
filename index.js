const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

require("dotenv").config({ silent: true });
const MONGODB_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Conectado ao MongoDB"))
  .catch((err) => console.error("Erro de conexão:", err));

const usuarioSchema = new mongoose.Schema({
  nome: String,
  email: String,
  senha: String,
});

const Usuario = mongoose.model("usuario", usuarioSchema, "usuario");

function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).send({ message: "Token não fornecido." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).send({ message: "Token inválido." });
    }

    req.usuario = usuario; // salva os dados do token no request
    next();
  });
}

function authenticate(requser, usuario) {
  if (requser.senha === usuario.senha) {
    return true;
  }
  return false;
}

app.get("/", (req, res) => {
  res.send("A API está funcionando.");
});

app.options("/", (req, res) => {
  res.send({
    GET: {
      "/": "retorna a página principal da API.",
      "/getall": "retorna todos os usuários.",
    },
    POST: {
      "/insert": "registra um usuário.",
      "/login": "autentica um usuário.",
    },
    PUT: {
      "/update": "altera um usuário especifico.",
    },
    DELETE: {
      "/delete": "exclui um usuário especifico.",
    },
    OPTIONS: {
      "/": "lista os métodos e rotas disponíveis.",
    },
  });
});

app.get("/getall", verificarToken, async (req, res) => {
  const usuarios = await Usuario.find({});
  res.send(usuarios);
});

app.post("/insert", async (req, res) => {
  var userdata = req.body;
  var usuario = new Usuario(userdata);

  await usuario.save().then(
    function (usuario) {
      if (usuario) {
        res.send({
          status: 200,
          message: "Usuário " + usuario.nome + " adicionado.",
        });
      }
    },
    function (err) {
      console.log(err);
      res.send({ status: 500, message: "Erro internal do servidor." });
    }
  );
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).send({ message: "Usuário não encontrado." });
    }
    if (usuario.senha !== senha) {
      return res.status(401).send({ message: "Senha incorreta." });
    }
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.send({ status: 200, message: "Autenticado.", token });
  } catch (err) {
    res.status(500).send({ message: "Erro interno do servidor." });
  }
});

app.put("/update", async (req, res) => {
  var userdata = req.body;

  Usuario.where({ email: userdata.email })
    .findOne()
    .then((usuario) => {
      if (usuario) {
        Usuario.where({ email: userdata.email })
          .updateOne({
            nome: userdata.nome,
            email: userdata.email,
            senha: userdata.senha,
          })
          .then(
            function (usuario) {
              if (usuario) {
                Usuario.where({ email: userdata.email })
                  .findOne()
                  .then((usuario) => {
                    res.send({
                      status: 200,
                      newuser: usuario,
                      message: "Usuário " + usuario.nome + " alterado.",
                    });
                  });
              }
            },
            function (err) {
              console.log(err);
              res.send({ status: 500, message: "Erro interno do servidor." });
            }
          );
      } else {
        res.send({ status: 500, message: "Usuário Não encontrado." });
      }
    })
    .catch(function (err) {
      res.send({ status: 500, message: "Erro interno do servidor." });
    });
});

app.delete("/delete", verificarToken, async (req, res) => {
  var email = req.body.email;

  Usuario.where({ email: email })
    .findOne()
    .then((usuario) => {
      if (usuario) {
        Usuario.where({ email: email })
          .deleteOne()
          .then(
            function (del) {
              if (del.deletedCount === 1) {
                res.send({
                  status: 200,
                  message: "Usuário " + usuario.nome + " excluído.",
                });
              }
            },
            function (err) {
              console.log(err);
              res.send({ status: 500, message: "Erro interno do servidor." });
            }
          );
      } else {
        res.send({ status: 500, message: "Usuário Não encontrado." });
      }
    })
    .catch(function (err) {
      res.send({ status: 500, message: "Erro interno do servidor." });
    });
});

app.listen(PORT, () => {
  console.log("Aplicativo executando na porta " + PORT);
});
