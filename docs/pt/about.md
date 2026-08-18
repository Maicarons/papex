# Sobre o Papex

O Papex é uma plataforma **aberta e independente** para gerenciar e descobrir literatura acadêmica. Nosso objetivo é oferecer aos pesquisadores uma infraestrutura aberta, transparente e auto-hospedável.

## Nossa missão

O Papex reduz a barreira para a infraestrutura de literatura acadêmica: da submissão e do versionamento à busca em texto integral e às APIs abertas, tudo pode ser implantado e estendido livremente. Valorizamos padrões abertos e colaboração comunitária em vez de dependência de fornecedor.

## Principais recursos

- **Submissão e versionamento**: artigos multi-versão com resumos, autores e PDFs permanentemente arquivados; a análise em lote de PDF extrai texto e referências no upload; o cancelamento registra um motivo.
- **Busca em texto integral e avançada**: busca multilíngue (CJK/inglês) com `tsvector` + `pg_trgm`, sintaxe booleana avançada (escopo de campos `ti/abs/au/cat/id`, AND/OR/NOT, parênteses), com filtros de categoria, autor e intervalo de datas e ordenação por citações.
- **Categorias e tags**: uma árvore de categorias de assunto com listagem cruzada, além de tags criadas por usuários, auto-tagging e uma nuvem de tags em destaque na página inicial.
- **Autores e afiliações**: perfis de autores que listam artigos e afiliações institucionais.
- **Citações, análise e exportação**: um grafo de citações (relações DOI / paper-id) com visualização force-directed, análise de co-citação e co-autoria, contagem de citações e exportação GB/T 7714 · BibTeX · APA.
- **Bibliometria**: totais de citações por autor, índice H e uma rede de co-autoria em ECharts.
- **Comentários e discussão**: respostas encadeadas em cada artigo.
- **Assinaturas, alertas e RSS/e-mail**: siga categorias, autores e artigos; um feed consolidado com indicador de não lidas em tempo real; entrega opcional via Resend/SMTP ou RSS.
- **Marcadores e grupos**: salvamento com um clique mais grupos de marcadores nomeados para organizar uma coleção de leitura posterior.
- **Mensagens, tickets e feedback**: mensagens internas integradas, uma máquina de estado de tickets e feedback para suporte à comunidade.
- **Co-revisão (revisão por pares)**: um ciclo completo de atribuir, responder, enviar parecer e recibo, com notificações unificadas.
- **Permissões, papéis e endosso**: acesso refinado baseado em papéis com controle por papel ou por usuário, uma fila de moderação e um portão de endosso para a primeira submissão.
- **Análise administrativa**: agregados de submissão, categoria, autor e revisão com gráficos.
- **API aberta e chaves de API**: uma especificação OpenAPI 3.1 com documentação interativa, além de chaves de API programáticas que herdam o RBAC do proprietário.
- **Perfis, temas e i18n**: perfis pessoais e páginas `/u/[username]`, temas claro/escuro e uma interface em chinês/inglês.
- **Autoria no navegador (Writespace)**: escrita LaTeX, compilação e publicação com um clique diretamente no navegador.

## Código aberto

O Papex é licenciado sob [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) e é livre para uso comercial e não comercial. Contribuições são bem-vindas por meio de tickets e feedback.
