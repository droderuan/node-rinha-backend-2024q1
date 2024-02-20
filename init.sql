
CREATE TABLE IF NOT EXISTS Cliente (  id SERIAL,
  limite INT NOT NULL,
  saldo INT NOT NULL
);

CREATE UNIQUE INDEX cliente_id_idx ON Cliente (id) WITH (fillfactor = 100);

CREATE TABLE IF NOT EXISTS Transacao (
  id SERIAL,
  idCliente INT REFERENCES Cliente(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  valor INT NOT NULL,
  descricao VARCHAR(10) NOT NULL,
  tipo CHAR(1) NOT NULL,
  realizada_em TIMESTAMP
);

INSERT INTO Cliente (id, limite, saldo)
VALUES
  (1, 100000, 0),
  (2, 80000, 0),
  (3, 1000000, 0),
  (4, 10000000, 0),
  (5, 500000, 0);

CREATE OR REPLACE function atualizar_saldo_e_inserir_transacao(a integer, b integer, c integer, d text, e text, f timestamp)
RETURNS SETOF Cliente AS $$
BEGIN
	RETURN QUERY UPDATE Cliente set saldo=saldo+b where id=a RETURNING *;
	INSERT INTO Transacao (idCliente, valor, tipo, descricao, realizada_em)
	VALUES (a, c, d, e, f);
end
$$ LANGUAGE plpgsql;


CREATE INDEX transacao_idcliente_1_idx ON Transacao (id DESC, idCliente) WITH (fillfactor = 30) WHERE idCliente=1;
CREATE INDEX transacao_idcliente_2_idx ON Transacao (id DESC, idCliente) WITH (fillfactor = 30) WHERE idCliente=2;
CREATE INDEX transacao_idcliente_3_idx ON Transacao (id DESC, idCliente) WITH (fillfactor = 30) WHERE idCliente=3;
CREATE INDEX transacao_idcliente_4_idx ON Transacao (id DESC, idCliente) WITH (fillfactor = 30) WHERE idCliente=4;
CREATE INDEX transacao_idcliente_5_idx ON Transacao (id DESC, idCliente) WITH (fillfactor = 30) WHERE idCliente=5;
