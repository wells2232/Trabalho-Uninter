# Raízes do Nordeste

API para uma rede de lanchonetes, com pedidos multicanal, estoque por unidade e pagamento externo simulado. Trabalho de Projeto Multidisciplinar, trilha Back-end, do curso de Análise e Desenvolvimento de Sistemas da Uninter.

## Executar

Requisitos: Node.js 24, npm 11 e Git. SQLite é um arquivo local; não exige servidor nem Docker. Drizzle ORM faz as consultas e o Drizzle Kit gera as migrations.

```sh
npm ci
```

Copie `.env.example` para `.env`. No PowerShell:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Coloque a chave gerada em `JWT_SECRET`. O `.env` não é versionado. As demais variáveis têm exemplos locais: `DATABASE_PATH`, `PORT`, `PAYMENT_URL`, `PAYMENT_PORT`, `PAYMENT_TIMEOUT_MS` e `SEED_PASSWORD`.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

- Front-end: http://127.0.0.1:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs (rota `/docs`)
- OpenAPI: http://localhost:3000/openapi.json
- Gateway mock: http://127.0.0.1:4001/cobrancas

`npm run dev` inicia os três processos. A API não reinicia automaticamente: após editar o back-end, reinicie o comando. Separadamente: `npm start`, `npm run mock` e `npm run dev:web`. O build do front-end é gerado por `npm run build`, em `frontend/dist`. O proxy `/api` é configurado no Vite para desenvolvimento; uma hospedagem do build precisa encaminhar `/api` à API ou ajustar a URL no cliente.

O seed é repetível: inclui dados ausentes, sem restaurar saldos nem sobrescrever senhas. Contas demonstrativas usam a senha definida em `SEED_PASSWORD` (no exemplo, `Demo@123456`):

| E-mail | Perfil | Acesso |
|---|---|---|
| cliente@raizes.local | CLIENTE | Próprios pedidos, pagamento e fidelidade |
| atendente@raizes.local | ATENDENTE | Pedidos da rede, balcão e entrega |
| cozinha@raizes.local | COZINHA | Consulta e conclusão do preparo |
| gerente@raizes.local | GERENTE | Catálogo, estoque, pedidos e auditoria |
| admin@raizes.local | ADMIN | Mesmas operações administrativas do gerente |

O cadastro público sempre cria CLIENTE. Funcionários são provisionados pelo seed, sem endpoint público para elevar privilégios. Neste MVP, funcionários atuam na rede inteira. Em pedidos de balcão feitos pelo atendente, a conta responsável pelo pedido é a própria conta operacional; a associação a um cliente identificado no balcão é uma evolução documentada.

## Fluxo para demonstrar

1. Entre como cliente; opcionalmente aceite a fidelidade.
2. Escolha a unidade e adicione itens. O site envia automaticamente o canal `WEB`. Os demais canais podem ser demonstrados pelo Swagger e pela coleção Postman.
3. Crie o pedido e simule o pagamento aprovado. A API move o pedido para `EM_PREPARO`.
4. Entre como cozinha e marque `PRONTO`.
5. Entre como atendente e confirme `ENTREGUE`.
6. Entre novamente como cliente para conferir os pontos.

Recusa de pagamento cancela o pedido e devolve estoque e pontos. Cancelamento manual é permitido antes do pagamento. Uma falha de integração mantém a reserva e permite tentar novamente ou cancelar. Pagamentos são inteiramente fictícios: nenhum cartão, PIX real ou dado financeiro é coletado.

## Arquitetura

```text
backend/src/
  domain/          Regras de total e transição do pedido; erros de negócio
  application/     Casos de uso: contas, catálogo, pedidos e pagamentos
  infrastructure/  Drizzle, schema, repositório, hash/JWT e gateway HTTP
  api/             Rotas, validação Zod, permissões e contratos OpenAPI
  bootstrap.js     Composição e injeção das dependências
backend/migrations/ SQL e snapshots gerados pelo Drizzle Kit
backend/test/       Testes HTTP com banco temporário em arquivo
frontend/           JavaScript, CSS e Vite
docs/               Diagramas, contratos, Postman e evidências
output/pdf/         Relatório acadêmico
```

As camadas de domínio e aplicação não importam Express, Drizzle nem o driver SQLite. O repositório é injetado nos casos de uso e encapsula consultas e transações. `Order` concentra cálculo e transições; os demais dados de domínio são objetos simples. Não há interfaces artificiais ou uma classe por tabela.

Para alterar o banco: edite `backend/src/infrastructure/schema.js`, execute `npm run db:generate`, revise o SQL gerado e aplique `npm run db:migrate`. Não edite uma migration já aplicada. A API também aplica migrations pendentes ao iniciar.

## Regras principais

- Valores monetários usam centavos inteiros; o servidor calcula os preços a partir do cardápio da unidade.
- `canalPedido` é obrigatório: `APP`, `TOTEM`, `BALCAO`, `PICKUP` ou `WEB`. `GET /pedidos?canalPedido=TOTEM` filtra a origem.
- Estoque é reservado na criação, em uma transação `IMMEDIATE`. Saldo não pode ficar negativo. Produto duplicado no mesmo pedido é rejeitado.
- `Idempotency-Key` é obrigatório na criação de pedido e pagamento. Repetir a mesma operação devolve o resultado existente; reutilizar a chave com outro conteúdo retorna 409.
- Pagamento em andamento bloqueia segunda cobrança e cancelamento. A chamada HTTP acontece fora da transação de banco.
- Somente `EM_PREPARO → PRONTO → ENTREGUE` é permitido por atualização manual. Aprovação do gateway libera o preparo.
- Fidelidade opcional: 1 ponto por real inteiro do total pago, creditado na entrega; cada ponto resgatado vale 10 centavos, até 50% do subtotal. O débito é reservado junto com o pedido.
- Consentimento tem versão, finalidade e data. A revogação suspende créditos e resgates, sem impedir compras. Não apaga automaticamente o histórico.
- Promoções estão especificadas no relatório como evolução; não existe endpoint de campanha implementado.

## Testes e evidências

```sh
npm test
npm run build
npm run docs
```

Os testes automatizados criam um SQLite temporário em arquivo por cenário, fazem requisições HTTP e limpam somente seus próprios arquivos. Não usam nem apagam o banco de demonstração.

Importe [a coleção Postman](docs/raizes.postman_collection.json), execute a coleção inteira na ordem e mantenha API e mock ligados. `baseUrl` aponta para a API; `senha` deve ser igual ao `SEED_PASSWORD`. T01 cria um cliente único; T02/T03 salvam tokens automaticamente; pedidos e produtos são capturados nas respostas. A última etapa anonimiza apenas a conta criada para aquele teste. O seed deve conter o produto 1, na unidade 1, com preço 2490 e saldo disponível. A execução consome uma unidade e deixa um produto de teste; repetições são possíveis enquanto houver estoque.

Alternativa pela linha de comando:

```sh
npm exec --yes --package=newman -- newman run docs/raizes.postman_collection.json
```

- [Checklist de conferência do roteiro](docs/checklist-roteiro.md)
- [Plano com entradas, pré-condições e resultados](docs/plano-de-testes.md)
- [Resultados verificados, sem tokens ou senhas](docs/evidencias.json)
- [Contratos e exemplos de todos os endpoints](docs/endpoints.md)
- [Especificação OpenAPI versionada](docs/openapi.json)
- [DER - núcleo](docs/diagramas/der-nucleo.png) e [DER - rastreabilidade](docs/diagramas/der-rastreabilidade.png)

Verificação local: 18 testes automatizados aprovados; 31 requisições e 66 asserções na coleção, sem falhas; build Vite aprovado. Também foi validado no navegador o login, carrinho, criação do pedido e pagamento mock, em viewport estreita.

## Privacidade e segurança

Nome e e-mail atendem ao cadastro; senha é armazenada apenas como hash scrypt com salt individual. JWT expira em uma hora, com emissor, audiência e algoritmo validados. O token fica somente em memória no front-end. O servidor consulta a situação da conta a cada chamada autenticada. Não são coletados CPF, endereço, data de nascimento nem cartões.

Clientes só consultam seus pedidos. Logs de auditoria registram identificadores, ação, recurso, data e requestId; não registram senha, token ou corpo da requisição. Ações de login, consentimento, consulta do perfil, pedido, pagamento, estoque e consulta da auditoria são rastreadas. `DELETE /usuarios/me` remove identificadores diretos e revoga o acesso; relações operacionais por ID permanecem. Isso é desidentificação técnica, sem alegação de anonimização irreversível em todos os contextos.

O relatório documenta finalidade, bases legais consideradas para o cenário, retenção proposta e limites. Não há rotina automática de expurgo: prazos dependem da finalidade e das obrigações do controlador. O ambiente acadêmico usa dados fictícios e o banco local não deve ser publicado.

## Limites e evolução

SQLite com transações síncronas simplifica a reprodução local; não foi validado para a carga real de uma franquia. Paginação, índices, WAL, limite de corpo e rate limiting reduzem riscos básicos, mas não são garantia de disponibilidade. Evoluções: PostgreSQL, testes de carga, backup com restauração testada, TLS/proxy, métricas, credenciais operacionais por unidade, recuperação de senha, campanhas e conciliação de pagamentos.

O mock não realiza cobrança real. `TIMEOUT` representa indisponibilidade do gateway; o adaptador também aborta chamadas que excedem `PAYMENT_TIMEOUT_MS`. Se o processo da API for encerrado durante uma cobrança, o registro pode ficar em `PROCESSANDO`; não há conciliação automática após reinício. Essa limitação é documentada e não se deve trocar o mock por um provedor real sem implementar reconciliação de resultados incertos.

## Repositório

Código e documentação: [wells2232/Trabalho-Uninter](https://github.com/wells2232/Trabalho-Uninter).

A coleção Postman, o OpenAPI e os diagramas técnicos estão na pasta `docs`. O Swagger executa localmente conforme as instruções acima. Não há API hospedada em produção.

O relatório acadêmico e seus dados de identificação são mantidos apenas localmente e não integram este repositório público.

O cadastro e o login exibem erros abaixo dos campos, incluindo senha curta no cadastro e e-mail já utilizado. O resgate no carrinho aparece apenas para participantes da fidelidade com saldo e respeita o limite de 50% do subtotal.
