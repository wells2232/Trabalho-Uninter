# Plano de testes

Pré-condição geral: migrations e seed aplicados; API na porta 3000; mock na 4001; senha do seed igual à variável senha. Execute a coleção completa na ordem. T01 cria uma conta única, T02 salva seu token e T03 salva o token administrativo. Os IDs são capturados nas respostas.

| ID | Cenário / evidência na coleção | Método e rota | Entrada | Esperado |
|---|---|---|---|---|
| T01 | Auth / T01 Cadastrar cliente | POST /auth/cadastro | `{"nome":"Cliente de teste","email":"{{emailTeste}}","senha":"{{senha}}"}` | 201; perfil = "CLIENTE" |
| T02 | Auth / T02 Login cliente | POST /auth/login | `{"email":"{{emailTeste}}","senha":"{{senha}}"}` | 200; tokenType = "Bearer" |
| T03 | Auth / T03 Login administrador | POST /auth/login | `{"email":"admin@raizes.local","senha":"{{senha}}"}` | 200 |
| T04 | Produtos / T04 Consultar cardápio | GET /unidades/1/cardapio | Sem body | 200; data.0.precoCentavos = 2490 |
| T05 | Fidelidade / T05 Aceitar consentimento | PUT /fidelidade/consentimento | `{"aceito":true}` | 200; consentimento = true |
| T06 | Pedidos / T06 Criar pedido TOTEM | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":1,"quantidade":1}],"pontosResgatados":0}` | 201; totalCentavos = 2490 |
| T07 | Pedidos / T07 Repetir pedido com mesma chave | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":1,"quantidade":1}],"pontosResgatados":0}` | 200; canalPedido = "TOTEM" |
| T08 | Pedidos / T08 Filtrar pedidos por canal | GET /pedidos?canalPedido=TOTEM&limit=10 | Sem body | 200; data.0.canalPedido = "TOTEM" |
| T09 | Pagamento / T09 Aprovar pagamento mock | POST /pagamentos | `{"pedidoId":"{{pedidoId}}","cenario":"APROVADO"}` | 200; pedido.status = "EM_PREPARO" |
| T10 | Pagamento / T10 Repetir pagamento com mesma chave | POST /pagamentos | `{"pedidoId":"{{pedidoId}}","cenario":"APROVADO"}` | 200; pagamento.status = "APROVADO" |
| T11 | Operação / T11 Marcar como pronto | PATCH /pedidos/{{pedidoId}}/status | `{"status":"PRONTO"}` | 200; status = "PRONTO" |
| T12 | Operação / T12 Confirmar entrega | PATCH /pedidos/{{pedidoId}}/status | `{"status":"ENTREGUE"}` | 200; status = "ENTREGUE" |
| T13 | Fidelidade / T13 Consultar pontos creditados | GET /fidelidade | Sem body | 200; pontos = 24 |
| T14 | Auditoria / T14 Verificar registro sensível | GET /auditorias?limit=100 | Sem body | 200 |
| T15 | Erros / T15 Acesso sem token | GET /pedidos | Sem body | 401; error = "NAO_AUTENTICADO" |
| T16 | Erros / T16 Cliente sem permissão | POST /produtos | `{"nome":"Produto bloqueado"}` | 403; error = "SEM_PERMISSAO" |
| T17 | Erros / T17 Canal ausente | POST /pedidos | `{"unidadeId":1,"itens":[{"produtoId":1,"quantidade":1}]}` | 422; error = "DADOS_INVALIDOS" |
| T18 | Erros / T18 Quantidade negativa | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":1,"quantidade":-1}],"pontosResgatados":0}` | 422; error = "DADOS_INVALIDOS" |
| T19 | Erros / T19 Produto inexistente | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":2147483647,"quantidade":1}],"pontosResgatados":0}` | 404; error = "PRODUTO_NAO_ENCONTRADO" |
| T20 | Estoque / T20 Cadastrar produto para teste de saldo | POST /produtos | `{"nome":"Produto teste de estoque"}` | 201 |
| T21 | Estoque / T21 Entrar uma unidade no estoque | POST /estoques/movimentacoes | `{"unidadeId":1,"produtoId":"{{produtoTeste}}","quantidade":1,"precoCentavos":1000,"motivo":"Teste de saldo"}` | 201; quantidade = 1 |
| T22 | Erros / T22 Estoque insuficiente | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":"{{produtoTeste}}","quantidade":2}],"pontosResgatados":0}` | 409; error = "ESTOQUE_INSUFICIENTE" |
| T23 | Recusa / T23 Criar pedido com resgate | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":1,"quantidade":1}],"pontosResgatados":20}` | 201; totalCentavos = 2290 |
| T24 | Recusa / T24 Recusar pagamento e cancelar pedido | POST /pagamentos | `{"pedidoId":"{{pedidoRecusa}}","cenario":"RECUSADO"}` | 200; pedido.status = "CANCELADO" |
| T25 | Recusa / T25 Verificar devolução dos pontos | GET /fidelidade | Sem body | 200; pontos = 24 |
| T26 | Falha do gateway / T26 Criar pedido para falha | POST /pedidos | `{"unidadeId":1,"canalPedido":"TOTEM","itens":[{"produtoId":1,"quantidade":1}],"pontosResgatados":0}` | 201 |
| T27 | Falha do gateway / T27 Simular indisponibilidade | POST /pagamentos | `{"pedidoId":"{{pedidoFalha}}","cenario":"TIMEOUT"}` | 503; error = "GATEWAY_INDISPONIVEL" |
| T28 | Falha do gateway / T28 Cancelar pedido pendente | POST /pedidos/{{pedidoFalha}}/cancelamento | Sem body | 200; status = "CANCELADO" |
| T29 | Privacidade / T29 Revogar consentimento | PUT /fidelidade/consentimento | `{"aceito":false}` | 200; consentimento = false |
| T30 | Privacidade / T30 Anonimizar conta de teste | DELETE /usuarios/me | Sem body | 204 |
| T31 | Privacidade / T31 Token da conta excluída é recusado | GET /usuarios/me | Sem body | 401; error = "NAO_AUTENTICADO" |

Complemento automatizado: backend/test/api.test.js usa bancos temporários em arquivo, integração HTTP com o mock, disputa de estoque, exclusão de conta, persistência, papéis operacionais e atomicidade.
