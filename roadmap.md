# Roadmap

- [ ] Abrir conversa ao vivo e perguntas para assuntos gerais, sem forçar cardápio ou pedido; preservar voz e preços reais e verificar os caminhos disponíveis.
- [ ] Substituir rádios por serviço de música/dança com fala simultânea — definir fonte disponível e eventuais custos antes da troca.
- [ ] Painel de gêneros: escolher estilo e mudar música, movimento e fala juntos.
- [ ] Painel de gestos: executar movimento na apresentação sem abrir microfone.
- [ ] Testar cada perfil de dança, alinhamento corporal e boca dirigida somente pela voz.

- [x] Adicionar nomes, rádios e comandos para forró, pagode, sertanejo e hip-hop; cinco perfis de dança distintos com testes de silêncio e postura.
- [ ] Confirmar estabilidade contínua de Forró e Hip-hop — depende das transmissões externas; Forró conectou sem amplitude medida e Hip-hop reproduziu, mas falhou nas últimas tentativas.
- [x] Rádio gratuita: cinco estações reproduzidas no navegador, ritmo pelo áudio e pausa zerando movimento; comandos e tchau com testes.
- [ ] Validar pedidos musicais e tchau por microfone real — requer aparelho com voz/escuta disponíveis.

- [x] Remover linha azul da boca e encaixar a abertura nos lábios originais.

- [x] Corrigir encaixe da boca e pausas da voz gratuita; conferido com reprodução medida
- [x] Corrigir rotação das pernas ao apresentar Hot Roll; pernas sem rotação/translação durante teste com áudio

- [x] Voz grátis: free-speech, free-listen, menu-script, Groq server; LiveZoord reescrito; AskZoord fallback
- [x] Apresentação grátis do cardápio validada (roteiro local com preços reais)
- [x] GROQ_API_KEY salva pelo usuário (formato gsk_); valor ainda não propagou ao servidor local — validar quando propagar/publicar
- [x] Grok (xAI) integrado: cérebro grok-4.7 (/v1/responses) e voz /api/zoord-voice com boca dirigida por áudio real
- [x] Cadeia de reserva automática: gateway → Grok → Groq → grátis; conexão presa >12s cai para o modo grátis
- [x] Browser: chip "Voz grátis do navegador ativa" aparece, palco sem erros
- [x] Build OK
- [ ] Conta xAI sem créditos (403): quando o usuário recarregar créditos na xAI, voz e cérebro Grok ativam sozinhos
- [ ] Validar voz/escuta grátis em aparelho real (microfone e vozes do navegador)
