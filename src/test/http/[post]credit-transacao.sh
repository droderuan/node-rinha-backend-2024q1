# Exemplo de requisição POST com dados JSON
curl -X POST \
      -H "Content-Type: application/json" \
      -d '{ "valor": 1000, "tipo": "c", "descricao": "asd"}' \
      'localhost:9999/clientes/1/transacoes'

