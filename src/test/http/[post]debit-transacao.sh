# Exemplo de requisição POST com dados JSON
seq 1 10 | xargs -n1 -P10   curl -X POST \
      -H "Content-Type: application/json" \
      -d '{ "valor": 1, "tipo": "d", "descricao": "asd"}' \
      'localhost:9999/clientes/1/transacoes'

