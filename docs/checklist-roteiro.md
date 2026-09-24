# Conferência do roteiro

Verificação realizada em 24/09/2026, incluindo uma cópia limpa baixada do repositório público. O relatório acadêmico foi conferido localmente e não é publicado, por escolha de privacidade do autor.

| Exigência | Evidência | Resultado |
|---|---|---|
| Introdução, objetivos e contexto da rede | Seções 1 e 2 do relatório local | Conferido |
| Requisitos funcionais, não funcionais e priorização | RF01–RF13 e RNF01–RNF08; distinção entre implementado e proposto | Conferido |
| Cadastro, login e perfis | Accounts, JWT/scrypt, cadastro público apenas CLIENTE; testes de 401/403 | Executado |
| Unidades e cardápio por unidade | Catálogo central, preço e saldo na chave unidade/produto | Executado |
| Pedido multicanal | Enum obrigatório, persistência e filtro de canal; validações 422 | Executado |
| Fluxo A completo | Pedido → pagamento mock → EM_PREPARO → PRONTO → ENTREGUE | Executado |
| Estoque | Reserva atômica, entrada/saída, bloqueio de saldo insuficiente e devolução | Executado |
| Fidelidade com consentimento | Aceite/revogação, crédito na entrega, resgate e estorno | Executado |
| Promoções | Regra conceitual na seção 2.4 do relatório; não apresentada como funcionalidade implementada | Atendido conceitualmente, como permitido no roteiro |
| Casos de uso e feature crítica | Diagrama com os cinco atores; pré/pós-condições, fluxo e exceções no relatório | Conferido |
| DER e integridade | 11 tabelas de negócio; colunas do schema comparadas às migrations aplicadas; foreign_key_check sem violações | Conferido |
| Classes, arquitetura e sequência | Diagramas em docs/diagramas; separação domain/application/infrastructure/api | Conferido |
| Contratos REST | 23 endpoints; OpenAPI exportado igual aos contratos em execução; todos presentes no relatório | Conferido |
| Erros e paginação | JSON padrão, limites de listagem, códigos HTTP e validações | Executado |
| Pagamento externo mock | Serviço HTTP separado; aprovação, recusa, falha e tentativa persistida com payload | Executado |
| Segurança, LGPD e auditoria | Hash, token, proprietário/perfil, coleta mínima, consentimento versionado e logs sem segredos | Executado e documentado |
| README e banco reproduzível | npm ci, migrations, seed, testes e build executados numa cópia limpa | Executado |
| Coleção e plano de testes | 31 casos: 23 com resposta de sucesso e 8 erros HTTP; 66 asserções aprovadas | Executado |
| Testes adicionais | 18 testes de integração: concorrência, idempotência, persistência, permissões e privacidade | Aprovados |
| Capa, sumário, seções, referências e nome do arquivo | Relatório local, identificado para a entrega acadêmica; revisão visual e verificação de limites de texto | Conferido |
| Links e histórico públicos | main publicado; README, OpenAPI, coleção e diagramas consultáveis sem autenticação | Verificado |
| Privacidade da publicação | PDF, metadados acadêmicos, banco, .env e relatórios brutos excluídos de todos os commits públicos | Verificado |

## Alcance da verificação

O Swagger roda localmente em `/docs`, como previsto nas instruções de execução aceitas pelo roteiro. A especificação e a coleção são públicas no repositório. Não existe deploy público da API.

O relatório usa A4, Times 12 no texto, espaçamento de 1,5 e margens superior/esquerda de 3 cm e inferior/direita de 2 cm. Tabelas, diagramas e exemplos usam tamanhos menores. A revisão de layout não equivale a certificação formal de todas as normas ABNT; a conferência institucional depende do modelo disponível no AVA.

Não foram alegados testes de carga ou disponibilidade de produção. Campanhas, conciliação de pagamentos após encerramento abrupto, expurgo automático e escopo de equipe por unidade permanecem como evoluções documentadas. A desidentificação de conta não é descrita como anonimização irreversível de todos os dados e backups.

Na reprodução com porta alternativa, foram ajustados o endereço exibido no log e o servidor relativo do OpenAPI. Esses ajustes permitem que o Swagger utilize a mesma origem da API.
